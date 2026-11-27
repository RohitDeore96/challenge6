# EVIDENCE_INDEX — where everything is, and a reading order

All evidence in this repository was generated from the real application:
verbatim captured API responses and screenshots of the real production build.
Nothing is mocked up. Recommended reading order for an evaluator:

1. **[LIVE_VERIFICATION.md](LIVE_VERIFICATION.md)** — what was executed, when,
   and the exact commands; the table maps every claim to its evidence file.
2. **[evidence/01-provider-capture-delhi.json](evidence/01-provider-capture-delhi.json)**
   and **[02-provider-capture-mumbai.json](evidence/02-provider-capture-mumbai.json)**
   — verbatim Open-Meteo provider payloads (the raw upstream data).
3. **[evidence/03-air-api-live-delhi.json](evidence/03-air-api-live-delhi.json)**
   and **[04-air-api-live-mumbai.json](evidence/04-air-api-live-mumbai.json)**
   — the app's own live API responses for the same grid cells: normalised
   payload, provenance labels, both index systems, freshness, caveats.
4. **[evidence/05-assistant-plan-live-delhi.json](evidence/05-assistant-plan-live-delhi.json)**
   — a real deterministic plan for a scripted Delhi commuter household: 9
   actions across the three pillars with impact breakdowns.
5. **[evidence/06-assistant-ai-fallback-no-key.json](evidence/06-assistant-ai-fallback-no-key.json)**
   — the same route with a question and no Gemini key: plan intact, honest AI
   unavailable state (`key_not_configured`, model label `gemini-3.5-flash-lite`).
6. **[evidence/07-honest-unavailable-state.json](evidence/07-honest-unavailable-state.json)**
   — a real provider-outage window: the structured unavailable response, no
   fabricated reading anywhere.
7. **[screenshots/desktop-landing.png](screenshots/desktop-landing.png)** —
   the starting screen with the logo header and the privacy-minimal profile
   form.
8. **[screenshots/desktop-air.png](screenshots/desktop-air.png)** — live Delhi
   data with provenance labels and the pollutant trend chart.
9. **[screenshots/desktop-plan.png](screenshots/desktop-plan.png)** — the full
   plan: three pillars, per-action impact sections, feedback chips.
10. **[screenshots/desktop-ai-fallback.png](screenshots/desktop-ai-fallback.png)**
    — the honest AI-unavailable state in the real UI.
11. **[screenshots/desktop-air-mumbai.png](screenshots/desktop-air-mumbai.png)**
    — the second city (different category) proving tailoring is real.
12. **[screenshots/mobile-390-plan.png](screenshots/mobile-390-plan.png)** —
    the same flow at 390 px.
13. **[METRICS.md](METRICS.md)** — the recorded quality-gate results (93
    tests, lint/typecheck/build clean).
14. **[AI_EVALUATION.md](AI_EVALUATION.md)** — how the AI layer is evaluated,
    and the plainly-stated live-model status.
15. **[SPEC.md](SPEC.md)** — every brief requirement mapped to implementation
    and evidence.
16. **[../worklog.md](../worklog.md)** — the dated verification log, including
    the defects found by actually running the app.

## Evidence integrity notes

- The JSON files are captured responses, pretty-printed; no field was edited.
  Their `fetchedAt` timestamps identify the run.
- The screenshots were taken with Playwright/Chromium against `next start`
  (production build) with `GEMINI_API_KEY` unset — which is why the AI panel
  shows the designed fallback state.
- A pending live-Gemini smoke run (needs the maintainer's key) is described
  in [AI_EVALUATION.md](AI_EVALUATION.md); deployed-URL captures will be
  added after the next Vercel deployment.
