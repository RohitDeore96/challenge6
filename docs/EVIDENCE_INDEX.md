# EVIDENCE_INDEX — where everything is, and a reading order

All evidence in this repository was generated from the real application:
verbatim captured API responses (from the **deployed production site** at
[challenge6-phi.vercel.app](https://challenge6-phi.vercel.app/), from the raw
provider, and from a local no-key build for the fallback contract) and
unmodified screenshots of the real interface. Nothing is mocked up.
Recommended reading order for an evaluator:

1. **[LIVE_VERIFICATION.md](LIVE_VERIFICATION.md)** — what was executed, when,
   and the exact commands; the table maps every claim to its evidence file,
   including the browser-console check for the extension-related
   "message channel closed" message.
2. **[evidence/01-provider-capture-delhi.json](evidence/01-provider-capture-delhi.json)**
   and **[02-provider-capture-mumbai.json](evidence/02-provider-capture-mumbai.json)**
   — verbatim Open-Meteo provider payloads (the raw upstream data).
3. **[evidence/03-deployed-air-delhi.json](evidence/03-deployed-air-delhi.json)**
   and **[04-deployed-air-mumbai.json](evidence/04-deployed-air-mumbai.json)**
   — the deployed site's own live API responses for the same grid cells:
   normalised payload, provenance labels, both index systems, freshness,
   caveats. Delhi: US AQI 220 → indicative India AQI estimate 355 "Very Poor".
   Mumbai: US AQI 189 → 184 "Moderately polluted".
4. **[evidence/05-deployed-plan-delhi.json](evidence/05-deployed-plan-delhi.json)**
   — a real deterministic plan for a scripted Delhi commuter household: 9
   actions across the three pillars, 9 honest exclusions with reasons, and
   the "potentially better window" analysis.
5. **[evidence/06-deployed-ai-answer-exclusion.json](evidence/06-deployed-ai-answer-exclusion.json)**
   and **[07-deployed-ai-answer-child.json](evidence/07-deployed-ai-answer-child.json)**
   — two real model answers captured from the **deployed site** on 2026-11-27
   with the v2 pipeline: `status: "ok"`, model label present, natural
   (non-template) explanation + per-action notes, schema-validated. The
   question is embedded in the file; the air payload and plan it was grounded
   in are items 3 and 4.
6. **[evidence/09-deployed-ai-other-city-mumbai.json](evidence/09-deployed-ai-other-city-mumbai.json)**
   — **other-city answering**: home is Pune, the question asks about Mumbai;
   `queriedLocations` records the live Mumbai fetch and the answer quotes
   Mumbai's own real numbers (US AQI 178, indicative estimate 184) — not
   Pune's, and not invented.
7. **[evidence/10-deployed-ai-neighbourhood-warje.json](evidence/10-deployed-ai-neighbourhood-warje.json)**
   — **neighbourhood answering**: "what is warje aqi in pune"; Warje is not in
   GeoNames, so it was resolved via OpenStreetMap Nominatim
   (`queriedLocations: [Pune home, Warje ok]`) and its own live grid fetch was
   made before the model answered.
8. **[evidence/11-deployed-ai-plan-briefing.json](evidence/11-deployed-ai-plan-briefing.json)**
   — the **automatic AI briefing** generated with every plan (no question
   asked): freshly worded prose plus action notes, no canned template.
9. **[evidence/12-deployed-ai-general-question.json](evidence/12-deployed-ai-general-question.json)**
   — a **general-knowledge question** ("What does an AQI of 200 mean for young
   children?") answered from general knowledge and tied to the real Delhi
   context, with no invented readings.
10. **[evidence/08-honest-fallback-no-key.json](evidence/08-honest-fallback-no-key.json)**
    — the same route with a question and no Gemini key (local production build
    of the same commit): plan intact, honest AI unavailable state
    (`key_not_configured`, model label `gemini-3.5-flash-lite`).
11. **[screenshots/desktop-landing.png](screenshots/desktop-landing.png)** —
    the deployed starting screen: gradient hero, logo, capability chips and
    the privacy-minimal household profile.
12. **[screenshots/desktop-air.png](screenshots/desktop-air.png)** — live Delhi
    data on the deployed site: provenance line, hero indicative India AQI
    estimate with the category-coloured 0-500 gauge, PM2.5/PM10/US AQI cards.
13. **[screenshots/desktop-plan.png](screenshots/desktop-plan.png)** — the
    household profile and the first plan pillar on the deployed site.
14. **[screenshots/desktop-ai-answer.png](screenshots/desktop-ai-answer.png)**
    — a real model answer rendered in the deployed UI: model label, grounded
    prose, per-action notes, disclaimer.
15. **[screenshots/desktop-ai-fallback.png](screenshots/desktop-ai-fallback.png)**
    — the honest no-key fallback state in the real UI (local build), with the
    deterministic plan still fully usable above it.
16. **[screenshots/mobile-390-plan.png](screenshots/mobile-390-plan.png)** —
    the deployed site at 390 px width: hero, step chips and the AQI card.

## Reproduce it yourself

Every capture command is in [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md); all
quality gates and the test suite are in [../README.md](../README.md#quality-gates).
Re-running the commands gives fresh (similar-magnitude) numbers — the committed
files are the record of what the deployed service returned on 2026-11-27.
