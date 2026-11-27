# HawaSathi — Urban Air Quality Assistant

**HawaSathi** (Hindi: हवा = air, साथी = companion) helps families and communities in Indian cities turn air-quality data into a practical, explainable daily plan during winter smog and urban pollution events.

Built for **PromptWars Challenge 6 — Urban Air Quality Assistant**.

## Live links

- **Repository:** https://github.com/RohitDeore96/challenge6
- **Live deployment:** add your Vercel production URL here after deploying (see the deployment section below)

## The problem

Winter smog in Indian cities exposes families to hazardous PM2.5 levels for weeks. Existing tools show an AQI number — and stop there. A household then has to guess: Is it safe to walk to school? Should we open the windows? Is the incense a problem? Can we afford any of it?

HawaSathi answers: **"Know what the air is like, what your household can do today, why each action matters, and what impact you can reasonably expect."**

## What it does (mapped to the challenge brief)

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
- **Two index systems, never mixed:** Open-Meteo's **US AQI** is labelled "US AQI"; the India-side index is labelled **"model-derived indicative India AQI estimate"** (CPCB breakpoints applied to model data — **not** an official CPCB AQI). See `src/lib/aqi/cpcb.ts` and [docs/DATA_METHODOLOGY.md](docs/DATA_METHODOLOGY.md).
- **Failures stay honest:** provider timeout, malformed data and stale timestamps produce explicit unavailable/stale states. No fake "live" readings, ever.
- **No invented numbers:** travel emission estimates appear only when a trip distance and a sourced factor exist; otherwise the card says so. Indoor benefits are described qualitatively — no fabricated percentage claims.

## How the AI is used (and not used)

- Model: **`gemini-3.5-flash-lite`**, called **server-side only** from an API route with the key in `GEMINI_API_KEY` (never `NEXT_PUBLIC_`, never in the browser bundle).
- **Gemini explains; it never calculates.** AQI derivation, safety gates, action selection and impact numbers are deterministic and unit-tested. The AI receives the approved action list + timestamped data and returns prose that is schema-validated (action IDs verified, URLs/HTML rejected, length-bounded) before rendering.
- **Fully functional without the AI:** no key, a 429, a timeout or malformed output → the plan stays and the UI shows an honest "AI explanation unavailable" state. Prompt design: [docs/PROMPT_DESIGN.md](docs/PROMPT_DESIGN.md).

## Screenshots

See `docs/screenshots/` for captures of the real running application (air data with provenance labels, the three action pillars, impact breakdowns, the AI-off fallback state, and the 360 px mobile layout). All screenshots are taken from the real deployed/local app; nothing is mocked up.

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # client entry (dynamic import, ssr:false)
│   ├── layout.tsx
│   └── api/
│       ├── air-quality/route.ts  # GET provider proxy (cache + rate limit)
│       └── assistant/route.ts    # POST plan + optional AI explanation
├── components/                   # UI sections (LocationPicker, plan/*, ...)
├── lib/
│   ├── providers/openMeteo.ts    # provider adapter, staleness, caveats
│   ├── aqi/cpcb.ts               # CPCB breakpoints + indicative estimate
│   ├── actions/catalog.ts        # original action catalogue (22 actions)
│   ├── planner/rules.ts          # deterministic rule engine + safety gates
│   ├── planner/window.ts         # "potentially better window" analysis
│   ├── impact/emissions.ts       # sourced emission factors + formula
│   ├── ai/{prompt,gemini,validate}.ts
│   ├── schemas.ts                # zod contracts for every boundary
│   ├── cache.ts, rate-limit.ts
│   └── data/cities.ts            # original curated Indian city list
└── tests/                        # vitest unit + integration suites
```

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Recharts · Zod · Vitest. No database; preferences persist in the browser's localStorage only.

## Setup

```bash
npm install        # or: bun install
cp .env.example .env.local   # optional: add a Google AI Studio key
npm run dev        # http://localhost:3000
```

`.env.local` (server-only; never committed):

```
GEMINI_API_KEY=replace_with_google_ai_studio_key
```

Without a key the app runs fully: deterministic plans, honest "AI unavailable" labels.

## Quality gates

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest (93 tests: AQI, planner, window, impact, AI validation, provider, API)
npm run build      # production build (type errors fail the build)
```

CI runs all four on every push/PR (`.github/workflows/ci.yml`).

## Tests in one line each

- **aqi.test.ts** — CPCB category boundaries, breakpoint interpolation, invalid/negative/non-finite values, averaging-window coverage, CO unit conversion.
- **planner.test.ts** — safety gates: severe smog blocks outdoor-exercise promotion, fixed schedules never get rescheduling, ₹0 budgets see only free actions, purifier advice matches ownership/budget, feedback changes plans deterministically.
- **window.test.ts** — better-window detection thresholds, small-difference honesty, invalid time handling, forecast horizon.
- **impact.test.ts** — mode-shift formula, per-person occupancy maths, missing factor/distance → no numeric claim, clamping.
- **ai-validation.test.ts** — schema rejection of unknown/duplicate action IDs, URLs, HTML, markdown, oversize output; prompt contains no coordinates and marks user text untrusted.
- **provider.test.ts** — provider parsing, staleness labelling, timeout/network/HTTP/malformed honesty, null pollutants stay null.
- **api.test.ts** — input validation, caching, rate limits, plan-without-key, 429 fallback, model-ID verification, invented-action rejection.

## Privacy, safety, non-medical note

- No accounts, names, addresses, phone numbers or diagnoses are collected. Profile choices and action feedback stay in browser localStorage. Coordinates are rounded to 2 decimals (~1.1 km) server-side; nothing finer is stored or logged.
- The app provides general public-health information. It does not diagnose, prescribe or replace doctors/local authorities, and it never claims one household's commute changes the city's AQI.
- Free-tier Gemini calls carry only non-sensitive context (city label, category, values, profile flags). Details: [docs/DATA_METHODOLOGY.md](docs/DATA_METHODOLOGY.md).

## Deployment (Vercel)

1. Push the repository to GitHub (done — see link above).
2. In Vercel: **Add New → Project → Import** `RohitDeore96/challenge6`. Framework preset: **Next.js** (auto-detected). No build overrides needed.
3. Project Settings → Environment Variables → add `GEMINI_API_KEY` (Production + Preview), value from [Google AI Studio](https://aistudio.google.com/apikey).
4. Deploy. Every push to `main` redeploys production; PRs get preview deployments.
5. Verify: production URL loads in incognito, `/api/air-quality?lat=28.61&lon=77.21&label=Delhi` returns live data, the AI panel answers with the model label, and disabling the env var shows the honest fallback.

## Limitations (honest list)

- Model data is area-level (CAMS ~11–45 km grid); street-level reality differs, and the UI says so everywhere.
- The indicative India AQI is an estimate from model data with ≥75% averaging-window coverage, not an official index. Pollutants with insufficient data are listed as excluded rather than silently dropped.
- Emission factors are published UK DEFRA/BEIS 2024 defaults — indicative, not India-certified (documented in [docs/IMPACT_METHODOLOGY.md](docs/IMPACT_METHODOLOGY.md)).
- No route/fare/transit data is integrated; the app asks users to confirm local availability rather than inventing it.
- In-memory cache and rate limits are per-serverless-instance and best-effort.
- Playwright E2E journeys are specified in the brief but not yet automated; the current suites cover the same logic at unit/integration level (tracked in the development log).

## Third-party licences and attribution

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Data: Open-Meteo (CC BY 4.0 for non-commercial use, CAMS/ECMWF). Guidance sources: CPCB, US EPA, WHO. This is an original implementation — no other participant's code, text or assets were copied.
