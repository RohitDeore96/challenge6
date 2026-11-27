# LIVE_VERIFICATION — recorded runs, 2026-11-27

All commands below were executed on **2026-11-27** (timestamps in UTC) by the
maintainer's automated assistant. Three surfaces were verified:

1. the **raw provider** (air-quality-api.open-meteo.com, verbatim capture);
2. the **deployed production site** at `https://challenge6-phi.vercel.app/`
   (commit `e60ac77` era build for run 1; commit `abf7be5` era build — the
   v2 AI pipeline — for run 2 below);
3. a **local production build** (`next start`) of the same commit, used only
   for the no-key AI fallback contract, because the deployed site has a key
   configured and the AI panel there answers with the real model.

Every JSON file in [docs/evidence/](evidence/) is a captured response —
nothing is hand-edited; the only formatting is pretty-printing. Screenshots
in [docs/screenshots/](screenshots/) are unmodified browser captures of the
real interface (desktop 1440×900 and mobile 390×844, Chromium).

## What was verified

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Raw provider payloads reachable and parseable | Delhi US AQI 220 (PM2.5 186.3 µg/m³); Mumbai US AQI 189 (PM2.5 55.5) | [01](evidence/01-provider-capture-delhi.json), [02](evidence/02-provider-capture-mumbai.json) |
| 2 | Deployed GET `/api/air-quality` (Delhi) | `ok: true`; US AQI 220; indicative India AQI estimate **355 "Very Poor"**; freshness `fresh`; pollutants included/excluded listed | [03](evidence/03-deployed-air-delhi.json) |
| 3 | Deployed GET `/api/air-quality` (Mumbai) | `ok: true`; US AQI 189; indicative estimate **184 "Moderately polluted"** | [04](evidence/04-deployed-air-mumbai.json) |
| 4 | Deployed POST `/api/assistant` (scripted Delhi commuter household, no question) | deterministic plan: 9 actions across breathe/indoor/emission pillars, 9 honest exclusions, "potentially better window" found (14:00–15:00, ~89.4 µg/m³ vs ~224.7, ~60% lower, same series) | [05](evidence/05-deployed-plan-delhi.json) |
| 5 | Deployed POST `/api/assistant` **with a question** (real AI, v2 pipeline) | `ai.status: "ok"`, `model: "gemini-3.5-flash-lite"`; natural (non-template) prose + notes, grounded in the same air payload | [06](evidence/06-deployed-ai-answer-exclusion.json) |
| 6 | Deployed POST `/api/assistant` with a second question (real AI, v2 pipeline) | `ai.status: "ok"`; direct answer first, plan pointer second | [07](evidence/07-deployed-ai-answer-child.json) |
| 7 | Local production build, **no Gemini key configured**, same question shape | plan intact (9 actions) + honest AI state: `status: "unavailable"`, `reason: "key_not_configured"`, `model: "gemini-3.5-flash-lite"` | [08](evidence/08-honest-fallback-no-key.json) |
| 8 | Real browser journey (Chromium 1440×900 and 390×844) against the deployed site | landing → Delhi air (gauge) → household profile → plan (3 pillars) → real AI answer → community bulletin, all rendered; screenshots committed | [screenshots/](screenshots/) |
| 9 | Browser console on the deployed site | **no console messages and no page errors** in a clean profile (see the note below about the extension-related message some users see) | this document |
| 10 | **Run 2 (v2 AI pipeline): other-city question** — home Pune, "What is the AQI in Mumbai right now?" | `ai.status: "ok"`; `queriedLocations: [{"Mumbai, Maharashtra", "ok"}]` — live Mumbai data fetched and quoted (US AQI 178, estimate 184); no coordinates sent to the model | [09](evidence/09-deployed-ai-other-city-mumbai.json) |
| 11 | **Run 2: neighbourhood question** — home Pune, "what is warje aqi in pune" | `ai.status: "ok"`; `queriedLocations: [Pune home, Warje ok]` — Warje resolved via OpenStreetMap Nominatim (GeoNames lacks it), own live fetch | [10](evidence/10-deployed-ai-neighbourhood-warje.json) |
| 12 | **Run 2: no question** — plan generation (Pune) | `ai.status: "ok"`; freshly worded briefing + 2 notes — no canned template | [11](evidence/11-deployed-ai-plan-briefing.json) |
| 13 | **Run 2: general-knowledge question** — "What does an AQI of 200 mean for young children?" | `ai.status: "ok"`; general answer tied to the real Delhi context, no invented readings | [12](evidence/12-deployed-ai-general-question.json) |

## Exact commands

```bash
# 1. verbatim provider capture (Delhi)
curl -s "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.6139&longitude=77.209&current=pm2_5,pm10,us_aqi&hourly=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone,ammonia&past_days=1&forecast_days=2&timezone=auto" \
  > docs/evidence/01-provider-capture-delhi.json

# 2. deployed air API (Delhi)
curl -s "https://challenge6-phi.vercel.app/api/air-quality?lat=28.61&lon=77.21&label=Delhi%20(Delhi)" \
  > docs/evidence/03-deployed-air-delhi.json

# 3. deployed assistant (plan, no question -> no AI call)
curl -s -X POST "https://challenge6-phi.vercel.app/api/assistant" \
  -H "Content-Type: application/json" \
  -d '{"location":{"lat":28.61,"lon":77.21,"label":"Delhi (Delhi)"},"profile":{"routine":"mixed","commuteMode":"car","oneWayDistanceKm":8,"budget":"under_500","cookingFuel":"lpg","indoorSources":["incense"],"hasPurifier":"no","sensitiveMember":"yes","scheduleFlexibility":"somewhat"}}' \
  > docs/evidence/05-deployed-plan-delhi.json

# 4. deployed assistant with a question (real gemini-3.5-flash-lite answer)
#    same body + "question":"Why were walking and cycling excluded from my commute alternatives today?"
curl -s -X POST "https://challenge6-phi.vercel.app/api/assistant" \
  -H "Content-Type: application/json" \
  -d '{"location":{"lat":28.61,"lon":77.21,"label":"Delhi (Delhi)"},"profile":{...},"question":"Why were walking and cycling excluded from my commute alternatives today?"}' \
  > docs/evidence/06-deployed-ai-answer-exclusion.json

# 5. no-key fallback on a local production build of the same commit
#    (GEMINI_API_KEY intentionally unset)
curl -s -X POST "http://localhost:3000/api/assistant" \
  -H "Content-Type: application/json" \
  -d '{"location":{"lat":28.61,"lon":77.21,"label":"Delhi (Delhi)"},"profile":{...},"question":"Why were walking and cycling excluded today?"}' \
  > docs/evidence/08-honest-fallback-no-key.json
```

### Run 2 — v2 AI pipeline (other-city / neighbourhood / briefing / general)

```bash
# other-city question: live data for Mumbai fetched server-side
PUNE='{"lat":18.52,"lon":73.85,"label":"Pune"}'
COMMUTER='{"routine":"commute","commuteMode":"car","oneWayDistanceKm":10,"budget":"under_500","cookingFuel":"lpg","indoorSources":["incense"],"hasPurifier":"no","sensitiveMember":"no","scheduleFlexibility":"flexible"}'
curl -s -X POST "https://challenge6-phi.vercel.app/api/assistant" \
  -H "Content-Type: application/json" \
  -d "{\"location\":$PUNE,\"profile\":$COMMUTER,\"question\":\"What is the AQI in Mumbai right now?\"}" \
  > docs/evidence/09-deployed-ai-other-city-mumbai.json

# neighbourhood question: Warje resolved via Nominatim, own live fetch
#   (same body with "question":"what is warje aqi in pune")
curl -s -X POST "https://challenge6-phi.vercel.app/api/assistant" \
  -H "Content-Type: application/json" \
  -d "{\"location\":$PUNE,\"profile\":$COMMUTER,\"question\":\"what is warje aqi in pune\"}" \
  > docs/evidence/10-deployed-ai-neighbourhood-warje.json

# no question: automatic AI briefing ships with the plan
curl -s -X POST "https://challenge6-phi.vercel.app/api/assistant" \
  -H "Content-Type: application/json" \
  -d "{\"location\":$PUNE,\"profile\":$COMMUTER}" \
  > docs/evidence/11-deployed-ai-plan-briefing.json

# general-knowledge question (Delhi household)
curl -s -X POST "https://challenge6-phi.vercel.app/api/assistant" \
  -H "Content-Type: application/json" \
  -d '{"location":{"lat":28.61,"lon":77.21,"label":"Delhi"},"profile":{"routine":"commute","commuteMode":"car","oneWayDistanceKm":10,"budget":"under_500","cookingFuel":"lpg","indoorSources":["incense"],"hasPurifier":"no","sensitiveMember":"no","scheduleFlexibility":"flexible"},"question":"What does an AQI of 200 mean for young children?"}' \
  > docs/evidence/12-deployed-ai-general-question.json
```

The browser journey was executed with an automation browser (Chromium) against
the deployed URL: search city → select Delhi → fill profile → generate plan →
ask the AI question → copy-view the bulletin, with screenshots at 1440×900 and
390×844.

## Key captured values (2026-11-27)

| Surface | Delhi | Mumbai |
| --- | --- | --- |
| Provider current (verbatim) | PM2.5 186.3 · PM10 188.1 · US AQI 220 | PM2.5 55.5 · PM10 58.9 · US AQI 189 |
| App indicative India AQI estimate | **355 — Very Poor** (model-derived) | **184 — Moderately polluted** (model-derived) |
| Sub-index coverage | PM2.5, PM10, NO2, SO2, CO, O3 (NH3 excluded — insufficient data) | same treatment |

Plan (Delhi commuter household): 3 exposure actions, 3 indoor actions,
3 lower-emission actions, 9 honest exclusions with reasons, better window
14:00–15:00 at ~89.4 µg/m³ vs ~224.7 µg/m³ in adjacent hours (~60% lower,
same pollutant and provider series).

AI answers (deployed site): all `status: "ok"` with `model:
"gemini-3.5-flash-lite"`, explanation + per-action notes arrays only, no
invented action IDs, no URLs/HTML, disclaimer rendered in the UI. Run 2 adds
`queriedLocations` transparency (which places got live data) and shows varied
openings across captures — no repeated template. The
[validation contract](../src/lib/ai/validate.ts) and its tests are unchanged.

## About the "message channel closed" console message

Some visitors report seeing this in DevTools:

> `Uncaught (in promise) Error: A listener indicated an asynchronous response
> by returning true, but the message channel closed before a response was
> received`

This message comes from a **browser extension**, not from HawaSathi. It is the
standard symptom of an extension's `chrome.runtime` content-script messaging
(password managers, ad blockers, translators and similar) when its background
worker goes away mid-request. HawaSathi is a static Next.js frontend plus two
first-party API routes; it loads no third-party scripts and uses no
`chrome.*` / `browser.*` APIs, so it cannot emit this message. Recorded check
#9 above: a clean browser profile on the deployed site produced zero console
messages and zero page errors. To confirm on your machine: open the site in an
incognito window with extensions disabled, or in a fresh profile — the console
stays clean.

## Honesty notes

- The deployed site had `GEMINI_API_KEY` configured at the time of capture,
  so the real-model answers come from it; the no-key state was therefore
  captured from a local production build of the same commit, which is the
  identical code path (`reason: "key_not_configured"`).
- All captures are point-in-time: the provider returns new values every run,
  so re-running the commands today will give different (similar-magnitude)
  numbers. The committed files are the proof of what the deployed service
  returned on 2026-11-27.
- The maintainer's test API key used to enable the AI on the deployed site
  during this verification window was a free-tier key and is deleted after
  the session; anyone can reproduce the AI evidence with their own free
  Google AI Studio key ([setup](../README.md#setup)).
