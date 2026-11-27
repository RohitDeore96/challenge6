# METRICS — recorded quality-gate results

**Recorded verification, 2026-11-27 (UTC)** — one recorded run against
`main` (fresh clone at `e1bf89b`, fixes applied during the run, re-verified
after each fix; see [../worklog.md](../worklog.md)). These are the results of
that recorded run, not a live status.

| Gate | Command | Recorded result |
| --- | --- | --- |
| Install | `bun install --frozen-lockfile` | 470 packages, clean |
| Lint | `bun run lint` | exit 0 |
| Typecheck | `bun run typecheck` (`tsc --noEmit`) | exit 0 |
| Tests | `bun test` | **93 passed / 0 failed** across 7 files |
| Build | `GEMINI_API_KEY="" bun run build` | exit 0; no warnings; the key-less build is intentional (the app must degrade honestly) |

## Tests per file (recorded)

| File | Tests | Covers |
| --- | --- | --- |
| `tests/aqi.test.ts` | 20 | CPCB category boundaries, breakpoint interpolation, invalid/negative/non-finite values, averaging-window coverage, CO unit conversion |
| `tests/planner.test.ts` | 17 | safety gates: severe-smog blocks, fixed schedules never rescheduled, ₹0 budgets see only free actions, purifier advice matches ownership/budget, feedback determinism |
| `tests/ai-validation.test.ts` | 15 | schema rejection of unknown/duplicate action IDs, URLs, HTML, markdown, oversize output; prompt contains no coordinates; user text marked untrusted |
| `tests/api.test.ts` | 15 | input validation, caching, rate limits, plan-without-key, 429 fallback, model-ID verification, invented-action rejection |
| `tests/impact.test.ts` | 10 | mode-shift formula, per-person occupancy maths, missing factor/distance → no numeric claim, clamping |
| `tests/provider.test.ts` | 9 | provider parsing, staleness labelling, timeout/network/HTTP/malformed honesty, null pollutants stay null |
| `tests/window.test.ts` | 7 | better-window thresholds, small-difference honesty, invalid time handling, forecast horizon |

## Recorded live-API observations (same run)

- Delhi grid cell: US AQI 220, indicative India AQI estimate 355 ("Very
  Poor"), freshness fresh — [evidence/03](evidence/03-air-api-live-delhi.json)
- Mumbai grid cell: US AQI 189, indicative estimate 184 ("Moderately
  polluted") — [evidence/04](evidence/04-air-api-live-mumbai.json)
- Delhi plan for the scripted commuter household: 9 actions across the three
  pillars — [evidence/05](evidence/05-assistant-plan-live-delhi.json)

## Not yet measured (honest gaps)

- No coverage percentage is enforced or claimed yet (no coverage tooling in
  CI; the named safety-rule suites are the current bar).
- No Playwright E2E suite runs in CI; the browser journey was executed
  manually/scripted during verification (see
  [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md)) but is not automated yet.
- No axe accessibility scan has been recorded; see
  [ACCESSIBILITY_REPORT.md](ACCESSIBILITY_REPORT.md) for what is implemented
  vs. verified.
