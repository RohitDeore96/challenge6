# AI_EVALUATION — how the Gemini layer is evaluated

Model: configured by the **`AI_MODEL`** environment variable (default
**`gemini-3.5-flash-lite`**; no hidden fallbacks; the resolved ID is echoed in
every response as `ai.model`). Design: [PROMPT_DESIGN.md](PROMPT_DESIGN.md).
Transport: `src/lib/ai/gemini.ts` (server-only REST). Acceptance:
`src/lib/ai/validate.ts`.

## The contract being evaluated

1. **Gemini explains; it never calculates or invents.** The prompt carries the
   approved action list, timestamped values, profile flags and — for places
   named in the user's question — live fetched data blocks. It carries no
   coordinates and no free user profile text.
2. **The AI is part of every response**: a briefing is generated with each
   plan, and every question gets a direct, natural-language answer.
3. **The reply must parse as JSON** with `{ "explanation": string,
   "actionNotes": Array<{ actionId, note }> }`, length-capped per field.
4. **Every `actionId` must exist in the approved plan** — unknown, duplicate
   or invented IDs are rejected.
5. **No URLs, HTML, markdown or emoji** survive validation.
6. **Any failure (429, timeout, malformed JSON, invalid schema, no key) yields
   an honest unavailable state** — the deterministic plan is never affected.
7. **Places without live data are stated honestly** — the model may not
   invent readings for cities or neighbourhoods it was given no data for.

## How each part is evaluated today

| Layer | Method | Recorded result (2026-11-27) |
| --- | --- | --- |
| Response validation | `tests/ai-validation.test.ts` — unknown/duplicate action IDs, URLs, HTML, markdown, oversize output, empty payload | all pass |
| Transport failure modes | `tests/api.test.ts` + `tests/provider.test.ts` — 429 → honest fallback; malformed HTTP; timeout; model-ID verification (the route asserts the configured model string) | all pass |
| Place resolution | `tests/question-locations.test.ts` — curated-list hits, home detection (~2 km threshold), GeoNames fallback, Nominatim neighbourhood fallback (Warje), non-India rejection, two-place cap | all pass |
| **Live model, deployed site** | six real captures POSTed to the **deployed** `/api/assistant` (2026-11-27, after the v2 prompt) — see the table below | all `status: "ok"`, `model: "gemini-3.5-flash-lite"`, schema-validated |
| No-key behaviour, end-to-end | live POST `/api/assistant` with a question and no key (local production build) | plan intact; AI state `unavailable / key_not_configured` — [evidence/08](evidence/08-honest-fallback-no-key.json) |
| Prompt hygiene | `tests/ai-validation.test.ts` asserts the prompt contains no coordinates and marks the user question untrusted; `tests/api.test.ts` asserts queried-place coordinates never reach the model | all pass |

## Live-model result (recorded 2026-11-27, deployed site, v2 prompt)

With a free-tier key configured server-side on the deployment, six captures
were taken verbatim from the deployed production site:

| # | Scenario | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Plan question: "Why were walking and cycling excluded …" (Delhi) | `ok`; natural answer grounded in the day's payload (US AQI 223, PM2.5 213.3) + notes with real action IDs | [06-deployed-ai-answer-exclusion.json](evidence/06-deployed-ai-answer-exclusion.json) |
| 2 | Plan question: "Which action matters most for a young child …" (Delhi) | `ok`; direct answer first, plan pointer second | [07-deployed-ai-answer-child.json](evidence/07-deployed-ai-answer-child.json) |
| 3 | **Other-city question**: "What is the AQI in Mumbai right now?" (home: Pune) | `ok`; `queriedLocations: [Mumbai …, status ok]` — the route fetched live Mumbai data; the answer quotes Mumbai's own numbers (US AQI 178, estimate 184) | [09-deployed-ai-other-city-mumbai.json](evidence/09-deployed-ai-other-city-mumbai.json) |
| 4 | **Neighbourhood question**: "what is warje aqi in pune" (home: Pune) | `ok`; `queriedLocations: [Pune home, Warje ok]` — Warje resolved via Nominatim, its own live fetch made | [10-deployed-ai-neighbourhood-warje.json](evidence/10-deployed-ai-neighbourhood-warje.json) |
| 5 | **No question** (plan generation, Pune) | `ok`; freshly worded briefing + 2 action notes — no fixed template | [11-deployed-ai-plan-briefing.json](evidence/11-deployed-ai-plan-briefing.json) |
| 6 | **General-knowledge question**: "What does an AQI of 200 mean for young children?" | `ok`; general answer connected to the real Delhi context (estimate 355), no invented readings | [12-deployed-ai-general-question.json](evidence/12-deployed-ai-general-question.json) |

All replies passed the full validation contract before reaching the UI:
JSON shape, action IDs against the approved plan, no URLs/HTML/markdown/emoji,
length caps. Style was additionally checked across the six captures: no
repeated opening pattern, no "the provided context"-style machine language.

## Known limitations of the AI layer

- The model can only annotate the approved plan; it cannot add, reorder or
  re-weight actions (by design — see [DECISIONS.md](DECISIONS.md) D4).
- Question-time place resolution is capped at two places and is
  token/stopword based: unusual spellings or non-India places are honestly
  reported as having no live reading rather than guessed.
- Free-tier rate limits can make explanations unavailable at busy times; the
  fallback is the designed answer, not an error state.
- The question is length-capped and sanitised; long pasted text is truncated
  rather than interpreted.
- The live captures are point-in-time: a model can answer differently on a
  different day (the grounding payload is in each evidence file, so the
  quality of that day's grounding can be judged against it).
