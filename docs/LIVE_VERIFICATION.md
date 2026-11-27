# LIVE_VERIFICATION — recorded runs, 2026-11-27

All commands below were executed on **2026-11-27** (timestamps in UTC) by the
maintainer's automated assistant against a production build (`next start`) of
`main`, plus verbatim provider captures via `curl`. Every JSON file in
[docs/evidence/](evidence/) is a captured response — nothing is hand-edited;
the only formatting is pretty-printing.

## What was verified

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Raw provider payloads reachable and parseable | Delhi US AQI 220 (PM2.5 186.3 µg/m³); Mumbai US AQI 189 (PM2.5 55.5) | [01](evidence/01-provider-capture-delhi.json), [02](evidence/02-provider-capture-mumbai.json) |
| 2 | Live GET `/api/air-quality` (Delhi) | `ok: true`; US AQI 220; indicative India AQI estimate **355 "Very Poor"**; freshness `fresh`; pollutants included/excluded listed | [03](evidence/03-air-api-live-delhi.json) |
| 3 | Live GET `/api/air-quality` (Mumbai) | `ok: true`; US AQI 189; indicative estimate **184 "Moderately polluted"** | [04](evidence/04-air-api-live-mumbai.json) |
| 4 | Live POST `/api/assistant` (Delhi commuter profile, no question) | deterministic plan: 9 actions across breathe/indoor/emission pillars | [05](evidence/05-assistant-plan-live-delhi.json) |
| 5 | Live POST `/api/assistant` with a question, **no Gemini key configured** | plan intact + honest AI state: `status: "unavailable"`, `reason: "key_not_configured"`, `model: "gemini-3.5-flash-lite"` | [06](evidence/06-assistant-ai-fallback-no-key.json) |
| 6 | Provider outage window (sandbox network, 13:42–13:58 UTC) | structured honest unavailable state; no fabricated reading | [07](evidence/07-honest-unavailable-state.json) |
| 7 | Real browser journey (Playwright/Chromium on the production build) | landing → air summary → plan → AI fallback → second city → 390 px mobile, all rendered | [screenshots/](screenshots/) |

## Exact commands (representative)

```bash
# verbatim provider capture (Delhi)
curl -s "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.6139&longitude=77.209&current=pm2_5,pm10,us_aqi&hourly=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone,ammonia&past_days=1&forecast_days=2&timezone=auto" > docs/evidence/01-provider-capture-delhi.json

# the app's own live API (production server, GEMINI_API_KEY unset)
curl -s "http://localhost:3000/api/air-quality?lat=28.61&lon=77.21&label=Delhi" > docs/evidence/03-air-api-live-delhi.json

curl -s -X POST http://localhost:3000/api/assistant -H "Content-Type: application/json" \
  -d '{"location":{"lat":28.61,"lon":77.21,"label":"Delhi"},"profile":{"routine":"commute","commuteMode":"two_wheeler","oneWayDistanceKm":8,"budget":"500_2000","cookingFuel":"lpg","indoorSources":["incense","frequent_frying"],"hasPurifier":"no","sensitiveMember":"yes","scheduleFlexibility":"somewhat"}}' \
  > docs/evidence/05-assistant-plan-live-delhi.json
```

## Live-model status (stated plainly)

- The **AI explanation path was not exercised against the live Gemini
  provider** during this run: no `GEMINI_API_KEY` was available in the
  verification environment. The no-key behaviour (5, 6 above) is the designed
  fallback and is verified end-to-end. A live provider smoke run needs a key
  and is listed in [AI_EVALUATION.md](AI_EVALUATION.md) as pending.
- The **deterministic data path was exercised against the live Open-Meteo
  provider** end-to-end (2, 3, 4 above): real request, real response,
  real normalisation, real plan.

## Note on the outage window

Between 13:42 and 13:58 UTC the verification sandbox intermittently blocked
the Next.js server process's outbound TLS to the provider (`ETIMEDOUT`/
`ENETUNREACH`) while `curl` from the same machine succeeded. The captured
response from that window is committed as evidence 07 because it shows the
designed behaviour under provider failure. The same server completed the live
runs (2–4) after the window cleared; deployment environments (Vercel) are not
affected by this sandbox-specific policy.
