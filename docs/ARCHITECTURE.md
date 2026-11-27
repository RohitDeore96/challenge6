# Architecture — HawaSathi

Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind CSS 4 ·
shadcn/ui · Recharts · Zod · Vitest. No database; preferences persist in the
browser's localStorage only.

## The one-sentence shape

A **deterministic plan engine** owns every number; two thin **server routes**
own every network call; **Gemini** owns nothing except prose that survives
schema validation.

```
Browser (single page, client-side state)
│  fetch /api/air-quality          fetch /api/assistant (POST)
▼
┌──────────────────────────────────────────────────────────┐
│ src/app/api/air-quality/route.ts   GET proxy             │
│   rate limit → fetchAirQuality (shared 10-min cache)     │
│ src/app/api/assistant/route.ts     POST                  │
│   validate body (zod) → round coords → fetchAirQuality   │
│   → category → better window → generatePlan → optional   │
│     callGemini → validate AI JSON → respond              │
└──────────────────────────────────────────────────────────┘
│                                    │
▼                                    ▼
Open-Meteo Air Quality API        Gemini API
(CAMS model forecast)             gemini-3.5-flash-lite
```

## Layers and rules

| Layer | Location | Rules |
| --- | --- | --- |
| Schemas (boundary contracts) | `src/lib/schemas.ts` | zod objects for location, profile, air payloads, plans, impacts, AI responses; shared by routes, UI and tests — there is no second place where a shape is re-declared |
| Provider adapter | `src/lib/providers/openMeteo.ts` | server-only; validates/normalises the provider response; null pollutants stay null; stale data flagged, never called current; failures return honest unavailable states; failures are never cached |
| AQI derivation | `src/lib/aqi/cpcb.ts`, `categories.ts` | CPCB breakpoints + linear interpolation, trailing-window means with ≥75% coverage, worst-pollutant aggregation; output labelled "model-derived indicative India AQI estimate"; US AQI kept separate |
| Action catalogue | `src/lib/actions/catalog.ts` | 22 original actions with cost bands, effort, impact types, assumptions and sources |
| Rule engine | `src/lib/planner/rules.ts` | deterministic selection with safety gates (severe smog, fixed schedules, budget ₹0, purifier ownership); same input → same plan, always |
| Better-window analysis | `src/lib/planner/window.ts` | compares forecast windows against current conditions; small differences are reported as "not meaningfully better" |
| Impact estimates | `src/lib/impact/emissions.ts` | published UK DEFRA/BEIS 2024 default factors; per-person maths; no distance + no factor → no numeric claim |
| AI transport | `src/lib/ai/gemini.ts` | REST, server-only, 10 s timeout, one bounded retry for 429/5xx, no key → honest unavailable |
| AI acceptance | `src/lib/ai/validate.ts` | JSON-mode output validated against zod: known action IDs only, no URLs/HTML/markdown, length caps |
| Prompt | `src/lib/ai/prompt.ts` | role boundary, non-sensitive context, untrusted-question wrapping (see [PROMPT_DESIGN.md](PROMPT_DESIGN.md)) |
| Cache / rate limit | `src/lib/cache.ts`, `rate-limit.ts` | in-memory, per-instance, best-effort (stated in [SECURITY.md](../SECURITY.md)) |
| UI | `src/components/*` | single-page flow; shadcn/ui primitives (button, input, label, select, skeleton, textarea, toast) |
| Tests | `tests/*.test.ts` | 93 unit/integration tests incl. a mocked-provider API suite |

## Data flow guarantees

1. **The browser never talks to Open-Meteo or Gemini.** Both providers are
   reachable only from the two server routes, so the key and the quota stay
   server-side.
2. **The plan is pure.** `generatePlan` takes timestamped normalised data plus
   the profile and returns the same plan for the same inputs; the AI is called
   only when the user asks a question, and its answer cannot change the plan.
3. **Failures degrade honestly at every level.** Provider failure → `{ ok:
   false, error }`; AI failure → plan intact + explicit unavailable state;
   localStorage unavailable → in-session mode. Nothing fabricates a reading.
4. **Index systems never mix.** The provider's US AQI and the indicative India
   estimate are computed, labelled and displayed separately, forever.

## Static output

`next build` produces a static page plus two dynamic routes. Vercel detects
Next.js and applies the security headers from `vercel.json`.
