<p align="center"><img src="docs/screenshots/hawasathi-logo.png" alt="HawaSathi — know your air, act on it" width="300" /></p>

# HawaSathi · हवासाथी

### Know your air. Act on it. See the impact.

HawaSathi (Hindi: हवा = air, साथी = companion) helps families and communities in Indian cities turn air-quality data into a practical, explainable daily plan during winter smog and urban pollution events.

**The rules calculate. Gemini explains. The user decides.**

**[Open the live app](https://challenge6-phi.vercel.app/)** · [Evaluator quick start](#evaluator-quick-start) · [Full demo script](docs/DEMO.md) · [Evidence index](docs/EVIDENCE_INDEX.md)

Built for **PromptWars Challenge 6 — Urban Air Quality Assistant** · Next.js 16 · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui · Zod · Vitest · AI: `gemini-3.5-flash-lite` via `AI_MODEL` (server-side only) · MIT licence

[![CI](https://github.com/RohitDeore96/challenge6/actions/workflows/ci.yml/badge.svg)](https://github.com/RohitDeore96/challenge6/actions)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

> **Recorded verification, 2026-11-27 (UTC)** (see [docs/LIVE_VERIFICATION.md](docs/LIVE_VERIFICATION.md), [docs/METRICS.md](docs/METRICS.md) and [worklog.md](worklog.md)). These are the results of one recorded run on that date, not a live status: lint, typecheck and the production build clean · **102 unit/integration tests passed across 8 files** · live provider data served end-to-end **on the deployed Vercel site** (Delhi US AQI 223 → indicative India AQI estimate 355 "Very Poor"; Mumbai US AQI 178 → 184 "Moderately polluted") · **six real `gemini-3.5-flash-lite` captures from the deployed site**: plan-grounded answers, an **other-city answer with live fetched data for Mumbai**, a **neighbourhood answer for Warje resolved via OpenStreetMap**, the automatic plan briefing and a general-knowledge answer · the no-key AI fallback verified end-to-end and in the real UI · zero fabricated readings at any point.
>
> **Recommendation-driven pass, 2026-11-28 (UTC)** at commit `521a808` (worklog Session 6): CPCB-style **pollutant-eligibility gate** on the overall India AQI estimate (≥3 pollutants incl. PM2.5/PM10) · **truly-contiguous** cleaner-window timestamps (missing/duplicate/out-of-order hours break the window) · Nominatim **throttled to its public rate limit with success caching** · visible **Open-Meteo/CAMS/OpenStreetMap attribution** links · keyless requests **skip AI-only lookups** · one shared **AI-output contract** for prompt + validator + schema · **gitleaks secret scan + advisory dependency audit** added to CI · Production Gemini key re-verified live (`ai.status: "ok"`, `gemini-3.5-flash-lite`) · **119 unit/integration tests passing across 8 files** · CI green (quality gates + secrets scan + dependency audit).

<p align="center">
  <img src="docs/screenshots/desktop-air.png" alt="Live Delhi air summary on the deployed site: provenance line, hero model-derived India AQI estimate 355 Very Poor with a category-coloured 0-500 gauge, PM2.5, PM10 and the separate US AQI card" width="49%" />
  <img src="docs/screenshots/desktop-ai-answer.png" alt="The Ask-about-your-plan panel on the deployed site: a real gemini-3.5-flash-lite answer, labelled with the model, with per-action notes and the AI-explains-only disclaimer" width="49%" />
</p>

**Jump to:** [The problem](#the-problem) · [What it does](#what-it-does-mapped-to-the-challenge-brief) · [Data honesty](#data-honesty--the-design-centre) · [How the AI is used](#how-the-ai-is-used-and-not-used) · [Evaluator quick start](#evaluator-quick-start) · [How to verify it](#how-to-verify-hawasathi) · [Screenshots](#screenshots) · [Architecture](#architecture) · [Quality gates](#quality-gates) · [Privacy and safety](#privacy-safety-non-medical-note) · [Run locally](#setup) · [Deploy on Vercel](#deploy-on-vercel) · [Limitations](#limitations-honest-list) · [Licences](#third-party-licences-and-attribution)

## The problem

Winter smog in Indian cities exposes families to hazardous PM2.5 levels for weeks. Existing tools show an AQI number — and stop there. A household then has to guess: Is it safe to walk to school? Should we open the windows? Is the incense a problem? Can we afford any of it?

HawaSathi answers: **"Know what the air is like, what your household can do today, why each action matters, and what impact you can reasonably expect."**

## What it does (mapped to the challenge brief)

Every brief requirement is mapped to its implementation **and its evidence** in [docs/SPEC.md](docs/SPEC.md). In short:

| Challenge requirement | Where it lives |
|---|---|
| Low-emission daily routines | "Lower-emission routine" pillar (`src/lib/planner/rules.ts`) — mode shifts, trip chaining, anti-idling, remote days, each with honest emission maths |
| Indoor air-quality actions | "Cleaner indoor air" pillar (`IndoorAirPanel`) — source control first, budget-matched purifier guidance, ventilation only when outdoor air allows |
| Sustainable alternatives | Commute-matched suggestions (`CommuteAlternatives`) — carpool, metro/bus, walk/cycle **only when exposure allows it** |
| Direct impact of each choice | Every card shows impact type, units, formula, assumptions and source (`ImpactBreakdown`, `src/lib/impact/emissions.ts`) |
| Location + lifestyle tailoring | City search / optional geolocation + 9-field privacy-minimal household profile (`HouseholdProfile`) |

Core flow: **choose location → load air data → describe household → generate plan → inspect three pillars → mark what works → see impact update → ask the AI why → share a community bulletin.**

## Data honesty — the design centre

- **Provider:** [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) (CAMS model). Presented as **modelled area-level forecast**, never as a CPCB station reading.
- **Two index systems, never mixed:** Open-Meteo's **US AQI** is labelled "US AQI"; the India-side index is labelled **"model-derived indicative India AQI estimate"** (CPCB breakpoints applied to model data — **not** an official CPCB AQI) and shown with a 0-500 category-coloured gauge. See `src/lib/aqi/cpcb.ts` and [docs/DATA_METHODOLOGY.md](docs/DATA_METHODOLOGY.md).
- **Eligibility-gated overall estimate:** the overall India AQI estimate is shown only when **at least three pollutants** have valid sub-indexes **and at least one of PM2.5/PM10** is among them (CPCB-style overall-AQI eligibility). Below that bar each valid pollutant sub-index and the raw concentrations are shown, with the unmet condition named. The ≥75% averaging-window coverage rule is this project's own completeness bar, labelled as such — not an official CPCB requirement.
- **Windows must be truly contiguous:** a "potentially better window" requires every successive forecast hour to be **exactly one hour apart**; a missing, duplicated or out-of-order hour breaks the window instead of being silently bridged.
- **Provider policy compliance:** question-time geocoding keeps an identifying User-Agent, place-type filtering and India filtering; Nominatim requests are serialised at ≥1.1 s spacing and successful geocodes are cached (24 h) — per serverless instance, best-effort, honestly documented. **Open-Meteo/CAMS/OpenStreetMap attribution is linked next to the displayed data** (air card, AI panel, footer).
- **Failures stay honest:** provider timeout, malformed data and stale timestamps produce explicit unavailable/stale states. No fake "live" readings, ever. The no-key AI fallback is committed as evidence: [docs/evidence/08-honest-fallback-no-key.json](docs/evidence/08-honest-fallback-no-key.json).
- **No invented numbers:** travel emission estimates appear only when a trip distance and a sourced factor exist; otherwise the card says so. Indoor benefits are described qualitatively — no fabricated percentage claims.

## How the AI is used (and not used)

- Model: configured by the **`AI_MODEL`** environment variable (default **`gemini-3.5-flash-lite`**), called **server-side only** from an API route with the key in `GEMINI_API_KEY` (never `NEXT_PUBLIC_`, never in the browser bundle). Every response echoes the exact model ID in `ai.model`.
- **An AI briefing ships with every plan** — freshly worded each time, never a canned template — and **every question gets a direct answer**.
- **Ask about any place.** If a question names another city, town or neighbourhood, the server resolves it (curated 80-city list → Open-Meteo/GeoNames geocoder → OpenStreetMap Nominatim for localities, **throttled to Nominatim's public rate limit with success caching**), **fetches live Open-Meteo data for that exact place** and hands the real numbers to the model. The UI shows chips stating exactly which places got live data, with place-search attribution beside them.
- **Keyless requests skip AI-only work.** When no server-side key is configured, question-time geocoding and extra provider fetches are skipped entirely (they could never contribute to a useful answer); the deterministic plan and the honest `key_not_configured` state remain, and the whole route runs under one deadline.
- **Gemini explains; it never calculates or invents.** AQI derivation, safety gates, action selection and impact numbers are deterministic and unit-tested. The AI's prose is schema-validated (action IDs verified, URLs/HTML rejected, length-bounded) before rendering, and places without a live reading are answered honestly — never with guessed numbers.
- **Verified against the real model on the deployed site (2026-11-27):** six live captures — plan-grounded answers ([06](docs/evidence/06-deployed-ai-answer-exclusion.json), [07](docs/evidence/07-deployed-ai-answer-child.json)), the Mumbai other-city answer ([09](docs/evidence/09-deployed-ai-other-city-mumbai.json)), the Warje neighbourhood answer ([10](docs/evidence/10-deployed-ai-neighbourhood-warje.json)), the automatic briefing ([11](docs/evidence/11-deployed-ai-plan-briefing.json)) and a general-knowledge answer ([12](docs/evidence/12-deployed-ai-general-question.json)). Evaluation and design: [docs/AI_EVALUATION.md](docs/AI_EVALUATION.md), [docs/PROMPT_DESIGN.md](docs/PROMPT_DESIGN.md).
- **Fully functional without the AI:** no key, a 429, a timeout or malformed output → the plan stays and the UI shows an honest "AI explanation unavailable" state ([docs/evidence/08-honest-fallback-no-key.json](docs/evidence/08-honest-fallback-no-key.json)).

## Evaluator quick start

No API key is needed to explore the product. Open the **[live app](https://challenge6-phi.vercel.app/)** and follow these steps; [docs/DEMO.md](docs/DEMO.md) has the full scripted walkthrough.

1. **Pick an area.** Search "Delhi" and select it — provenance-labelled modelled data loads for that grid cell (US AQI and the separate model-derived indicative India AQI estimate with a colour gauge).
2. **Describe your household.** Car commute, 8 km one-way, "Incense / dhoop" indoor source, a more-sensitive member at home, budget under ₹500 — then press **Generate today's plan**.
3. **Read the three pillars.** Breathe safer today · Cleaner indoor air · Lower-emission routine. Each card says why it fits today, what impact to expect, and how the number was derived.
4. **Mark what works.** Press **Using this action** or **Not practical for us** on any card — the plan re-runs deterministically and the impact updates.
5. **Ask anything — other places included.** The AI briefing is already on the page. In *AI briefing & answers*, try "What is the AQI in Mumbai right now?" or "what is warje aqi in pune" — the server fetches live data for the exact place you named, a chip confirms it ("Live data fetched for Mumbai, Maharashtra"), and the reply is labelled with the configured model. It only explains; every number comes from the data engine or the live fetch.
6. **Share a bulletin.** Copy the community bulletin — locality-level, provenance included, no household details.

**What needs a key and what does not.** The AI layer calls the hosted model only when the deployment has a server-side `GEMINI_API_KEY`. Without one, the plan stays fully functional and the AI panel shows an honest "AI explanation unavailable" state ([evidence](docs/evidence/08-honest-fallback-no-key.json)). Air data, the plan, impact maths and the bulletin never depend on AI.

## How to verify HawaSathi

| Question | Where the answer is |
|---|---|
| Does it match the challenge brief? | [docs/SPEC.md](docs/SPEC.md) — R1–R12 with implementation and evidence |
| Was the data path verified against the live provider **on the deployed site**? | [docs/LIVE_VERIFICATION.md](docs/LIVE_VERIFICATION.md) — verbatim captured responses, exact commands, timestamps |
| Was the AI verified against the real model? | [docs/AI_EVALUATION.md](docs/AI_EVALUATION.md) + deployed-site captures ([06](docs/evidence/06-deployed-ai-answer-exclusion.json), [07](docs/evidence/07-deployed-ai-answer-child.json)) |
| Do the quality gates pass? | [docs/METRICS.md](docs/METRICS.md) and [worklog.md](worklog.md) — recorded run results, including the defects the runs caught and fixed |
| Is it accessible? | [docs/ACCESSIBILITY_REPORT.md](docs/ACCESSIBILITY_REPORT.md) — implemented measures, what was exercised, honest gaps |
| Where is everything? | [docs/EVIDENCE_INDEX.md](docs/EVIDENCE_INDEX.md) — recommended reading order |
| What are the remaining risks? | [SECURITY.md](SECURITY.md) residual risks + [Limitations](#limitations-honest-list) |

## Screenshots

All captures are from the **real deployed application** at [challenge6-phi.vercel.app](https://challenge6-phi.vercel.app/) (production build, live provider data, scripted household profile; the AI answer is a real model response, the fallback state was captured from the same code without a key). See `docs/screenshots/` and the [evidence index](docs/EVIDENCE_INDEX.md).

| | |
|---|---|
| ![Landing](docs/screenshots/desktop-landing.png) | ![AI fallback](docs/screenshots/desktop-ai-fallback.png) |
| ![Plan](docs/screenshots/desktop-plan.png) | ![Mobile 390px](docs/screenshots/mobile-390-plan.png) |

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # client entry (dynamic import, ssr:false)
│   ├── layout.tsx                # metadata, metadataBase, logo-derived icons, og image
│   └── api/
│       ├── air-quality/route.ts  # GET provider proxy (cache + rate limit)
│       └── assistant/route.ts    # POST plan + optional AI explanation
├── components/                   # UI sections (StepHeading, LocationPicker, plan/*, ...)
├── hooks/use-toast.ts            # shadcn toast hook
├── lib/
│   ├── providers/openMeteo.ts    # provider adapter, staleness, caveats
│   ├── aqi/cpcb.ts               # CPCB breakpoints + indicative estimate
│   ├── actions/catalog.ts        # original action catalogue (22 actions)
│   ├── planner/rules.ts          # deterministic rule engine + safety gates
│   ├── planner/window.ts         # "potentially better window" analysis
│   ├── impact/emissions.ts       # sourced emission factors + formula
│   ├── ai/{prompt,gemini,validate,question-locations}.ts
│   ├── schemas.ts                # zod contracts for every boundary
│   ├── cache.ts, rate-limit.ts, utils.ts
│   └── data/cities.ts            # original curated Indian city list
└── tests/                        # vitest unit + integration suites
```

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Recharts · Zod · Vitest. No database; preferences persist in the browser's localStorage only. Deeper design reasoning: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DECISIONS.md](docs/DECISIONS.md).

## Setup

```bash
bun install        # or: npm install
cp .env.example .env.local   # optional: add a Google AI Studio key
bun run dev        # http://localhost:3000
```

`.env.local` (server-only; never committed):

```
GEMINI_API_KEY=replace_with_google_ai_studio_key
AI_MODEL=gemini-3.5-flash-lite   # optional; this is the default
```

Without a key the app runs fully: deterministic plans, honest "AI unavailable" labels.

## Quality gates

```bash
bun run lint       # eslint
bun run typecheck  # tsc --noEmit
bun run test       # vitest (119 tests: AQI + eligibility, planner, window continuity, impact, AI validation + contract alignment, question locations, provider, API)
bun run build      # production build (type errors fail the build)
```

CI runs all four on every push/PR, plus a **gitleaks secret scan over the full Git history** and an **advisory dependency audit** (`.github/workflows/ci.yml`). The gates' recorded results, and the defects full verification runs caught (missing `@types/node` that broke the Vercel build, a distance-input step bug, dead scaffold code), are documented in [worklog.md](worklog.md).

## Deploy on Vercel

1. Push the repository to GitHub (this repo). Every push to `main` redeploys production automatically.
2. In Vercel: **Add New → Project → Import** `RohitDeore96/challenge6`. Framework preset: **Next.js** (auto-detected). No build overrides needed.
3. Project Settings → Environment Variables → add `GEMINI_API_KEY` (Production + Preview), value from [Google AI Studio](https://aistudio.google.com/apikey). Optionally add `AI_MODEL` = `gemini-3.5-flash-lite` (it is the default, but setting it makes the deployment self-documenting).
4. Deploy. PRs get preview deployments. Security headers come from `vercel.json`.
5. Verify: production URL loads in incognito, `/api/air-quality?lat=28.61&lon=77.21&label=Delhi` returns live data, a plan generation shows the AI briefing, asking "What is the AQI in Mumbai right now?" shows the "Live data fetched for Mumbai" chip, and removing the env vars shows the honest fallback.

**A note on the console message "A listener indicated an asynchronous response…":** that error comes from a **browser extension** (password managers, ad blockers and similar extensions use `chrome.runtime` messaging); it is not produced by HawaSathi, which uses no extension APIs. Open the site in incognito with extensions disabled and the console stays clean — this is documented in [docs/LIVE_VERIFICATION.md](docs/LIVE_VERIFICATION.md).

## Privacy, safety, non-medical note

- No accounts, names, addresses, phone numbers or diagnoses are collected. Profile choices and action feedback stay in browser localStorage. Coordinates are rounded to 2 decimals (~1.1 km) server-side; nothing finer is stored or logged.
- The app provides general public-health information. It does not diagnose, prescribe or replace doctors/local authorities, and it never claims one household's commute changes the city's AQI.
- Free-tier Gemini calls carry only non-sensitive context (city labels, category, values, profile flags) — never coordinates, including for places resolved from a question. Details: [docs/DATA_METHODOLOGY.md](docs/DATA_METHODOLOGY.md).

## Limitations (honest list)

- Model data is area-level (CAMS ~11–45 km grid); street-level reality differs, and the UI says so everywhere.
- The indicative India AQI is an estimate from model data with ≥75% averaging-window coverage (a project-level completeness rule) and CPCB-style pollutant eligibility (≥3 pollutants incl. PM2.5/PM10) — it is not an official index. Pollutants with insufficient data are listed as excluded rather than silently dropped.
- Emission factors are published UK DEFRA/BEIS 2024 defaults — indicative, not India-certified (documented in [docs/IMPACT_METHODOLOGY.md](docs/IMPACT_METHODOLOGY.md)).
- No route/fare/transit data is integrated; the app asks users to confirm local availability rather than inventing it.
- In-memory caches, rate limits and the geocoder throttle are per-serverless-instance and best-effort; they are not distributed or durable.
- The advisory dependency-audit CI job surfaces findings for review but does not block merges on its own.
- Playwright E2E journeys are not yet automated in CI; the verification journey was executed by scripted browser against the deployed production site (see [docs/LIVE_VERIFICATION.md](docs/LIVE_VERIFICATION.md)) and the same logic is covered by unit/integration suites (tracked in the development log and worklog).

## Third-party licences and attribution

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Data: Open-Meteo (CC BY 4.0 for non-commercial use, CAMS/ECMWF); place search: Open-Meteo Geocoding (GeoNames) and OpenStreetMap Nominatim (ODbL, © OpenStreetMap contributors). Guidance sources: CPCB, US EPA, WHO. This is an original implementation — no other participant's code, text or assets were copied. Licence: [MIT](LICENSE).
