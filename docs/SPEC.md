# SPEC — HawaSathi against the Challenge 6 brief

Source of truth: `PROMPTWARS_CHALLENGE_6_WORK.md` (PromptWars Challenge 6 —
Urban Air Quality Assistant). This document maps every product requirement to
its implementation and to the evidence that it works. Requirement wording
below is paraphrased from the brief; the brief itself is the contract.

## R1 — Low-emission daily routines (location + lifestyle tailored)

- **Implementation:** "Lower-emission routine" pillar.
  `src/lib/actions/catalog.ts` (22 original actions) and the deterministic
  rule engine `src/lib/planner/rules.ts` with safety gates; commute-matched
  suggestions (carpool, metro/bus, walk/cycle only when exposure allows) in
  `src/components/plan/CommuteAlternatives.tsx`.
- **Evidence:** [05-deployed-plan-delhi.json](evidence/05-deployed-plan-delhi.json)
  (live run for a Delhi commuter household: carpool share, remote day,
  no-idling actions selected); screenshot
  [desktop-plan.png](screenshots/desktop-plan.png).

## R2 — Indoor air-quality actions (practical + budget-matched)

- **Implementation:** "Cleaner indoor air" pillar (`IndoorAirPanel`):
  source control first, purifier guidance matched to ownership/budget,
  ventilation only when outdoor air allows it.
- **Evidence:** the same live plan — `indoor_no_smoke_sources`,
  `indoor_kitchen_exhaust`, `indoor_zero_cost_source_control` for a
  ₹500–₹2,000 budget without a purifier; safety rules covered by
  `tests/planner.test.ts` (purifier advice matches ownership/budget; ₹0
  budgets see only free actions).

## R3 — Sustainable alternatives for commuting, errands, daily activities

- **Implementation:** exposure-gated alternatives in the rule engine; the
  UI only offers walk/cycle when the data supports it, and says why
  otherwise.
- **Evidence:** `tests/planner.test.ts` (severe smog blocks outdoor-exercise
  promotion; fixed schedules never get rescheduling suggestions).

## R4 — Direct impact of each choice (what changes, formula, assumptions, limits)

- **Implementation:** every action card carries impact type, units, formula,
  assumptions and source (`src/components/plan/ImpactBreakdown.tsx`,
  `src/lib/impact/emissions.ts`, methodology in
  [IMPACT_METHODOLOGY.md](IMPACT_METHODOLOGY.md)). Travel numbers appear only
  when a trip distance and a sourced factor exist; otherwise the card says so.
- **Evidence:** `tests/impact.test.ts` (mode-shift formula, per-person
  occupancy maths, missing factor/distance → no numeric claim, clamping);
  visible per-action "How we estimated this" sections in
  [desktop-plan.png](screenshots/desktop-plan.png).

## R5 — Tailoring to location, routine, transport, household needs, affordability

- **Implementation:** city search / optional geolocation
  (`src/components/LocationPicker.tsx`, curated list in
  `src/lib/data/cities.ts`) + a 9-field privacy-minimal household profile
  (`src/components/HouseholdProfile.tsx`).
- **Evidence:** live Delhi vs Mumbai runs differ in category and therefore in
  plan composition ([03](evidence/03-deployed-air-delhi.json),
  [04](evidence/04-deployed-air-mumbai.json)).

## R6 — AI layer: explain, never calculate

- **Implementation:** `gemini-3.5-flash-lite`, server-side only
  (`src/lib/ai/gemini.ts`), strict JSON contract, schema-validated output
  (`src/lib/ai/validate.ts`), honest fallback states.
- **Evidence:** [AI_EVALUATION.md](AI_EVALUATION.md);
  [08-honest-fallback-no-key.json](evidence/08-honest-fallback-no-key.json)
  (plan intact, AI state honest without a key);
  [desktop-ai-fallback.png](screenshots/desktop-ai-fallback.png);
  real-model answers from the deployed site:
  [06](evidence/06-deployed-ai-answer-exclusion.json),
  [07](evidence/07-deployed-ai-answer-child.json).

## R7 — Real data or an honest unavailable state; explain the data type

- **Implementation:** Open-Meteo (CAMS) presented as a modelled area-level
  forecast with provenance labels everywhere; CPCB breakpoints applied to
  model data are labelled "model-derived indicative India AQI estimate" and
  never mixed with the provider's US AQI; staleness flagged after 75 minutes.
- **Evidence:** the no-key AI fallback capture
  [08-honest-fallback-no-key.json](evidence/08-honest-fallback-no-key.json)
  (plan intact when the AI layer is unavailable); provenance labels visible
  in [desktop-air.png](screenshots/desktop-air.png); `tests/provider.test.ts`
  (timeout/network/HTTP/malformed honesty; null pollutants stay null).

## R8 — Human-first, non-judgemental, no medical diagnosis

- **Implementation:** budget bands include ₹0 with only free actions; no
  shaming copy; footer carries the non-medical note; the AI system prompt
  forbids diagnosis and contradicting local authorities.
- **Evidence:** [desktop-landing.png](screenshots/desktop-landing.png)
  ("Only fields that change your recommendations… No names, addresses or
  medical details"); prompt design rules in
  [PROMPT_DESIGN.md](PROMPT_DESIGN.md).

## R9 — Privacy by default

- **Implementation:** no accounts; localStorage-only persistence; server-side
  coordinate rounding to 2 decimals; non-sensitive AI context only.
- **Evidence:** [DATA_METHODOLOGY.md](DATA_METHODOLOGY.md) §privacy;
  [SECURITY.md](../SECURITY.md) threat model.

## R10 — Every visible control works; mobile-first 360–390 px

- **Implementation:** no placeholder buttons anywhere; single-page flow works
  end-to-end on small viewports.
- **Evidence:** [mobile-390-plan.png](screenshots/mobile-390-plan.png)
  (full plan generated and rendered at 390 px, no horizontal scrolling);
  the distance-input defect D5 in [../worklog.md](../worklog.md) was found
  and fixed by driving the real form in a browser.

## R11 — Deployment on Vercel (₹0 tier)

- **Implementation:** Next.js 16 + `vercel.json` security headers; no
  database; build needs no key.
- **Evidence:** CI workflow `.github/workflows/ci.yml` runs all four gates on
  every push; deployment steps in the README "Deploy on Vercel" section.

## R12 — Original implementation, provenance recorded

- **Implementation:** clean Next.js scaffold documented in the development
  log; original catalogue, rules, prompts, copy and tests;
  [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) records data and asset
  licences.
- **Evidence:** commit history (`feat:`/`test:`/`docs:` messages), the
  development log, and this repository's evidence set.
