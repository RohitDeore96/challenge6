# DEMO — evaluator walk-through (about 3 minutes)

No API key is needed for any of this. The deterministic engine produces the
plan; the AI panel either answers (if the deployment has a server-side key)
or shows an honest "unavailable" state that says why.

1. **Open the app.** The header carries the HawaSathi logo and the promise:
   know what the air is like, what your household can do today, why it
   matters, and what impact to expect.
2. **Choose an area.** Type "Delhi" in the search box and pick Delhi. The app
   fetches modelled air data for that grid cell.
3. **Read the data honestly.** The summary shows the provider (Open-Meteo
   Air Quality API, CAMS model), the freshness, the US AQI, and the separate
   "model-derived indicative India AQI estimate" with its category and which
   pollutants were included/excluded. Expand "Pollutant details and hourly
   trend" for the PM2.5/PM10 chart.
4. **Describe the household.** Pick a routine (e.g. "School / work
   commute"), a commute mode ("Two-wheeler"), an optional one-way distance
   (e.g. 8 km), a budget ("₹500-₹2,000"), tick indoor sources ("Incense /
   dhoop", "Frequent frying"), and answer purifier / sensitive-member /
   flexibility. Nothing is sent to an account — the note under the heading
   says where it stays.
5. **Generate today's plan.** Press "Generate today's plan". Three pillars
   appear — Breathe safer today, Cleaner indoor air, Lower-emission routine —
   each action with cost, effort, why it is suggested today, and a "How we
   estimated this" impact section (type, units, formula, assumptions,
   source). With no distance and no sourced factor, travel impacts stay
   qualitative instead of guessed.
6. **Disagree with an action.** Mark any action "Won't do" / "Already doing".
   The plan rebuilds deterministically from the same air data — the AI is not
   involved.
7. **Ask why.** Type "Is it safe for my children to play outside today?" in
   the ask panel. With a key configured, the answer is grounded in today's
   values and the approved action list (the model label is shown). Without a
   key, the panel says the AI explanation is unavailable and the plan stays
   fully usable — this is the designed fallback, not an error.
8. **Share.** Copy the community bulletin: a locality-level summary with the
   same provenance labels and three community actions. The app never posts
   anything automatically.
9. **Mobile.** Repeat steps 2–5 on a 390 px viewport; the same flow works
   without horizontal scrolling (screenshot: `mobile-390-plan.png`).

## Scripts used for the committed evidence

The screenshots in `docs/screenshots/` were captured from the real
production build (`next start`) against live provider data, with a scripted
household profile identical to step 4. The JSON files in `docs/evidence/`
are verbatim captured responses of the running app's own API routes (see
[LIVE_VERIFICATION.md](LIVE_VERIFICATION.md) for the exact commands and
timestamps).
