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
   — two real `gemini-3.5-flash-lite` answers captured from the **deployed
   site** on 2026-11-27: `status: "ok"`, model label present, explanation +
   per-action notes only, schema-validated. The question is embedded in the
   file; the air payload and plan it was grounded in are items 3 and 4.
6. **[evidence/08-honest-fallback-no-key.json](evidence/08-honest-fallback-no-key.json)**
   — the same route with a question and no Gemini key (local production build
   of the same commit): plan intact, honest AI unavailable state
   (`key_not_configured`, model label `gemini-3.5-flash-lite`).
7. **[screenshots/desktop-landing.png](screenshots/desktop-landing.png)** —
   the deployed starting screen: gradient hero, logo, capability chips and
   the privacy-minimal household profile.
8. **[screenshots/desktop-air.png](screenshots/desktop-air.png)** — live Delhi
   data on the deployed site: provenance line, hero indicative India AQI
   estimate with the category-coloured 0-500 gauge, PM2.5/PM10/US AQI cards.
9. **[screenshots/desktop-plan.png](screenshots/desktop-plan.png)** — the
   household profile and the first plan pillar on the deployed site.
10. **[screenshots/desktop-ai-answer.png](screenshots/desktop-ai-answer.png)**
    — a real model answer rendered in the deployed UI: model label, grounded
    prose, per-action notes, disclaimer.
11. **[screenshots/desktop-ai-fallback.png](screenshots/desktop-ai-fallback.png)**
    — the honest no-key fallback state in the real UI (local build), with the
    deterministic plan still fully usable above it.
12. **[screenshots/mobile-390-plan.png](screenshots/mobile-390-plan.png)** —
    the deployed site at 390 px width: hero, step chips and the AQI card.

## Reproduce it yourself

Every capture command is in [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md); all
quality gates and the test suite are in [../README.md](../README.md#quality-gates).
Re-running the commands gives fresh (similar-magnitude) numbers — the committed
files are the record of what the deployed service returned on 2026-11-27.
