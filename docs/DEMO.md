# DEMO — evaluator walk-through (about 3 minutes)

No API key is needed for any of this. The deterministic engine produces the
plan and an AI briefing ships with it (if the deployment has a server-side
key — the live app currently has one); without a key the AI panel shows an
honest "unavailable" state that says why. Everything below runs against the
**[live app](https://challenge6-phi.vercel.app/)**; the same steps work on a
local build ([setup](../README.md#setup)).

1. **Open the app.** The gradient hero carries the HawaSathi logo, the
   Hindi name (हवासाथी), the promise — know what the air is like, what your
   household can do today, why it matters, and what impact to expect — and
   four capability chips ("Modelled air data", "Deterministic plan", "AI
   explains, never invents", "No sign-up, no tracking").
2. **Choose an area (step 1).** Type "Delhi" in the search box and pick
   Delhi. The selected area appears as a green chip next to the heading.
3. **Read the data honestly (step 2).** The summary shows the provider
   (Open-Meteo Air Quality API, modelled area-level forecast), the freshness
   ("Fresh · just now"), the **US AQI**, and the separate **"India AQI
   estimate"** as a hero card: the big model-derived number, its category,
   and a category-coloured 0-500 gauge with a marker. Sub-index coverage and
   excluded pollutants are listed; expand "Data limitations" for caveats and
   the model-grid note. "Pollutant details and hourly trend" below has the
   current values table and the next-24-hours PM2.5/PM10 forecast chart.
4. **Describe the household (step 3).** Pick a routine ("Mixed routine"), a
   commute mode ("Car"), an optional one-way distance (8 km), a budget
   ("Under ₹500"), tick "Incense / dhoop" under indoor sources, and answer
   purifier / sensitive-member / cooking fuel / flexibility. Nothing is sent
   to an account — the note under the heading says where it stays.
5. **Generate today's plan.** Press "Generate today's plan". The plan card
   shows the day's category ("Built for a very poor day from modelled
   area-level forecast") and the timing analysis: "Potentially better window
   for outdoor time" with the honest same-series comparison. Three pillars
   follow — Breathe safer today, Cleaner indoor air, Lower-emission routine —
   each action with a confidence pill, cost, effort, a "Why this today?"
   explainer, an "IMPACT" box, and a "How is this number calculated?" formula
   breakdown where a sourced factor exists. With no distance and no sourced
   factor, travel impacts stay qualitative instead of guessed.
6. **Disagree with an action.** Mark any card "Using this action" or "Not
   practical for us". The plan rebuilds deterministically from the same air
   data and a fresh AI briefing arrives with it; the pill on the heading ("N
   actions marked as used") updates.
7. **Ask anything (step 5).** An AI briefing is already waiting under the
   plan. Try "What is the AQI in Mumbai right now?" or "what is warje aqi in
   pune" — the server resolves the place, fetches live data for that exact
   spot, and a chip confirms it ("Live data fetched for Mumbai, Maharashtra").
   The answer card is labelled with the configured model and grounded in
   today's values, the approved action list and the freshly fetched data,
   with per-action notes and a disclaimer ([real captured
   answers](evidence/09-deployed-ai-other-city-mumbai.json)). Without a key,
   the panel says the AI explanation is unavailable (with the reason) and the
   plan stays fully usable — this is the designed fallback
   ([screenshot](screenshots/desktop-ai-fallback.png)), not an error.
8. **Share (step 6).** Copy the community bulletin: a locality-level summary
   with the same provenance labels and three community actions. The app never
   posts anything automatically and never includes household details.
9. **Mobile.** Repeat steps 2–5 on a 390 px viewport; the same flow works
   without horizontal scrolling (screenshot:
   [mobile-390-plan.png](screenshots/mobile-390-plan.png)).

## Scripts used for the committed evidence

The screenshots in `docs/screenshots/` were captured from the **real deployed
site** ([challenge6-phi.vercel.app](https://challenge6-phi.vercel.app/)) with
a scripted household profile identical to step 4, except
[screenshots/desktop-ai-fallback.png](screenshots/desktop-ai-fallback.png),
which comes from a local production build of the same commit without a key
(the deployed site has one, so its fallback state cannot be photographed).
The JSON files in `docs/evidence/` are verbatim captured responses of the
deployed site's own API routes and of the raw provider (see
[LIVE_VERIFICATION.md](LIVE_VERIFICATION.md) for the exact commands and
timestamps).
