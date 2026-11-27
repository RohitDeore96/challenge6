# Development Log — HawaSathi (PromptWars Challenge 6)

Originality note: this project was built from a clean Next.js 16 + TypeScript
+ Tailwind scaffold (documented below). All application logic, the action
catalogue, recommendation rules, impact formulas, prompts, UI copy and tests
were written specifically for this challenge. No other participant's
repository, code, design or text was copied or consulted. Tooling used:
Claude/GLM agent-assisted development in a sandboxed environment, with the
work brief (PROMPTWARS_CHALLENGE_6_WORK.md) as the product contract.

## 2026-11-27 — Phase 0: repository and scaffold

- Cleaned the provided Next.js 16 scaffold: removed Prisma/database, auth,
  demo routes and 24 unused shadcn/ui components; removed 28 unused
  dependencies to keep installs small.
- Established quality-gate scripts: `lint`, `typecheck` (`tsc --noEmit`),
  `test` (Vitest), `build`. Removed the scaffold's
  `typescript.ignoreBuildErrors` escape hatch so type errors fail builds.
- Added `.gitignore` (secrets, logs, sandbox files), `.env.example`
  (server-only `GEMINI_API_KEY` placeholder, no NEXT_PUBLIC prefix).
- Decision: keep the app on a single page with client-side state and
  localStorage persistence — no database (brief section 9).

## 2026-11-27 — Phase 1: deterministic core (non-AI)

- `lib/schemas.ts`: zod contracts for location, profile, air payloads,
  plans, impacts, AI responses — shared by API routes and tests.
- `lib/aqi/cpcb.ts` + `categories.ts`: CPCB breakpoint tables, linear
  interpolation, trailing-window means with a ≥75% coverage rule, worst-
  pollutant aggregation, honest "unavailable" fallbacks. Labelled everywhere
  as a model-derived indicative estimate (brief section 7.2).
- `lib/providers/openMeteo.ts`: server-side adapter with timeout,
  malformed-response rejection, freshness/staleness labelling (75 min
  threshold), null-preserving parsing, caveat generation.
- `lib/impact/emissions.ts`: sourced DEFRA/BEIS 2024 factor table,
  per-person occupancy adjustment, explicit no-number-when-unsourced rule.
- `lib/actions/catalog.ts`: 22 original actions across the three pillars,
  each with verb-led instruction, why-template hook, cost band, effort,
  confidence, assumptions, methodology and public source.
- `lib/planner/rules.ts`: deterministic engine with the brief's safety
  gates (severe-smog outdoor-exercise block, fixed-schedule respect, budget
  filtering, purifier ownership matching, ventilation only with a better
  window, feedback-aware re-ranking).
- `lib/planner/window.ts`: conservative better-window analysis (≥30% and
  ≥20 µg/m³ improvement, 24 h horizon, "no clearly better window" honesty).
- API routes `/api/air-quality` (GET, cached, rate-limited) and
  `/api/assistant` (POST, plan + optional AI).

## 2026-11-27 — Phase 2: Gemini integration

- `lib/ai/gemini.ts`: server-only REST client for exactly
  `gemini-3.5-flash-lite`; 10 s timeout; one retry on 429/5xx with
  backoff+jitter; failure → explicit unavailable reasons.
- `lib/ai/prompt.ts`: six-rule system instruction; privacy-minimal context
  (city label, values, profile flags, approved action IDs — no coordinates);
  user question wrapped as untrusted data.
- `lib/ai/validate.ts`: zod schema + content rules (no URLs/HTML/markdown,
  unknown/duplicate action IDs rejected, length caps).
- App remains fully functional without a key: plan-first responses, honest
  "AI unavailable" states.

## 2026-11-27 — Phase 3: UI and accessibility

- Single-page flow with numbered sections matching the brief's visual
  hierarchy; shadcn/ui components; Recharts hourly forecast chart.
- Accessibility: single h1, semantic sections/fieldsets, aria-live for plan
  updates, role=alert errors, 44 px touch targets, text+icon (never
  colour-only) category labels, reduced-motion support, 360 px-first layout.
- Client-only rendering (`ssr:false` dynamic import) so persisted
  preferences load without hydration mismatches; deferred auto-fetch to
  satisfy React's effect rules.
- Community bulletin generator: provenance line + 3 fixed community
  actions, copy-to-clipboard, no automatic sharing, no profile leakage.

## 2026-11-27 — Testing and quality gates

- Vitest suites: `aqi` (20), `window` (7), `planner` (13), `impact` (10),
  `ai-validation` (14), `provider` (9), `api` (20) — **93 tests, all
  passing**; `tsc --noEmit` and `eslint` clean.
- Notable fixes driven by tests: time-based forecast horizon in window
  analysis; per-person carpool maths (vehicle factor ÷ occupants); purifier
  filter-check cost band corrected to zero-cost (the check is free);
  universal kerb-exposure action for commuting households so the breathe
  pillar is never empty on moderate days.
- E2E status: the brief lists Playwright journeys; the current suites cover
  the same logic at unit/integration level (route handlers tested directly
  with mocked provider/AI). Browser smoke verification is performed on the
  running app; automating Playwright journeys is tracked as future work.

## Pending / known gaps (honest list)

- Playwright E2E automation (11 journeys from the brief) not yet added.
- Screenshots/evidence pack: captured from the real app during release.
- Official CPCB station feed integration (future, would get its own clearly
  separated data card).
- Production Vercel deployment + verification checklist to be completed at
  release (see README deployment section).

## 2026-11-27 — verification run, defect fixes, evidence pack and repo alignment

- Full verification run against a fresh clone of `main` (see `worklog.md` at
  the repository root for the complete record; the run is the source of the
  dated evidence pack in `docs/evidence/` and `docs/screenshots/`).
- Defects caught by running the real gates and the real app:
  - D1 `@types/node` missing from devDependencies — broke the Vercel
    production build at the TypeScript step; declared explicitly.
  - D2/D3/D4 missing shadcn helpers (`lib/utils`, `hooks/use-toast`), 13 dead
    scaffold UI components (one importing an uninstalled package) and a stale
    Tailwind v3 config — typecheck/build cleanliness restored; committed as
    `c7cb3bb`.
  - D5 distance input `step=0.5` + `min=0.2` silently blocked valid values
    (including the placeholder example "8") via native validation; changed to
    `step="any"` so the documented zod range (0.2–150) is the single
    validator. Found by driving the real form in Chromium.
- Evidence pack captured from the real production build with live provider
  data (see `docs/EVIDENCE_INDEX.md`); AI panel verified in its designed
  no-key fallback state.
- Brand: uploaded HawaSathi logo integrated (header mark, favicon/apple icon,
  og image, README). Derived assets documented in the third-party notices
  only as needed (logo is an original owner-provided asset).
- Repository documentation aligned with the maintainer's Challenge 5
  structure: CONTRIBUTING, SECURITY, LICENSE (MIT), worklog, vercel.json
  security headers, SPEC/ARCHITECTURE/DECISIONS/DEMO/LIVE_VERIFICATION/
  METRICS/AI_EVALUATION/ACCESSIBILITY_REPORT/EVIDENCE_INDEX.
