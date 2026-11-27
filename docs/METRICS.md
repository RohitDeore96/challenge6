# METRICS — recorded quality-gate results

**Recorded verification, 2026-11-27 (UTC)** — one recorded run against
`main` (fresh clone at `e1bf89b`, fixes applied during the run, re-verified
after each fix; see [../worklog.md](../worklog.md)), re-run at `e60ac77`
(the UI overhaul) before the deployed-site evidence capture, and re-run again
at `abf7be5` (the v2 AI pipeline: always-on briefing, question-time live data
for other places, `AI_MODEL` env var) before the second evidence capture.
These are the results of those recorded runs, not a live status.

| Gate | Command | Recorded result |
| --- | --- | --- |
| Install | `bun install --frozen-lockfile` | 470 packages, clean |
| Lint | `bun run lint` | exit 0 |
| Typecheck | `bun run typecheck` (`tsc --noEmit`) | exit 0 |
| Tests | `bun run test` (vitest) | **102 passed / 0 failed** across 8 files |
| Build | `bun run build` | exit 0; no warnings |

## Tests per file (recorded)

| File | Tests | Covers |
| --- | --- | --- |
| `tests/aqi.test.ts` | 20 | CPCB category boundaries, breakpoint interpolation, invalid/negative/non-finite values, averaging-window coverage, CO unit conversion |
| `tests/planner.test.ts` | 17 | safety gates: severe-smog blocks, fixed schedules never rescheduled, ₹0 budgets see only free actions, purifier advice matches ownership/budget, feedback determinism |
| `tests/ai-validation.test.ts` | 15 | schema rejection of unknown/duplicate action IDs, URLs, HTML, markdown, oversize output; prompt contains no coordinates; user text marked untrusted |
| `tests/api.test.ts` | 17 | input validation, caching, rate limits, honest no-key state, 429 fallback, model-ID verification, invented-action rejection, live data block for a queried city (no coordinates), home-city mention reuse |
| `tests/question-locations.test.ts` | 7 | curated-list hits, home detection (~2 km), GeoNames fallback, Nominatim neighbourhood fallback, non-India rejection, two-place cap, no-token early return |
| `tests/impact.test.ts` | 10 | mode-shift formula, per-person occupancy maths, missing factor/distance → no numeric claim, clamping |
| `tests/provider.test.ts` | 9 | provider parsing, staleness labelling, timeout/network/HTTP/malformed honesty, null pollutants stay null |
| `tests/window.test.ts` | 7 | better-window thresholds, small-difference honesty, invalid time handling, forecast horizon |

## Recorded live-API observations (2026-11-27, deployed site)

- Delhi grid cell: US AQI 220, indicative India AQI estimate 355 ("Very
  Poor"), freshness fresh —
  [evidence/03](evidence/03-deployed-air-delhi.json)
- Mumbai grid cell: US AQI 189, indicative estimate 184 ("Moderately
  polluted") — [evidence/04](evidence/04-deployed-air-mumbai.json)
- Delhi plan for the scripted commuter household: 9 actions across the three
  pillars, 9 honest exclusions —
  [evidence/05](evidence/05-deployed-plan-delhi.json)
- Six real model answers from the deployed site (v2 pipeline, 2026-11-27), all
  schema-validated — plan-grounded ([evidence/06](evidence/06-deployed-ai-answer-exclusion.json),
  [evidence/07](evidence/07-deployed-ai-answer-child.json)), other-city Mumbai
  with live fetched data ([evidence/09](evidence/09-deployed-ai-other-city-mumbai.json)),
  neighbourhood Warje via Nominatim ([evidence/10](evidence/10-deployed-ai-neighbourhood-warje.json)),
  automatic briefing ([evidence/11](evidence/11-deployed-ai-plan-briefing.json)),
  general-knowledge ([evidence/12](evidence/12-deployed-ai-general-question.json))
- No-key fallback on a local build of the same commit: plan intact, honest
  unavailable state — [evidence/08](evidence/08-honest-fallback-no-key.json)
- Browser console on the deployed site, clean profile: zero messages, zero
  page errors ([LIVE_VERIFICATION.md](LIVE_VERIFICATION.md), check #9)

## Not yet measured (honest gaps)

- No coverage percentage is enforced or claimed yet (no coverage tooling in
  CI; the named safety-rule suites are the current bar).
- No Playwright E2E suite runs in CI; the browser journey was executed by
  scripted browser during verification (see
  [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md)) but is not automated yet.
- No axe accessibility scan has been recorded; see
  [ACCESSIBILITY_REPORT.md](ACCESSIBILITY_REPORT.md) for what is implemented
  vs. verified.
