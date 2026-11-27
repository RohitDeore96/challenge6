# AI_EVALUATION — how the Gemini layer is evaluated

Model: **`gemini-3.5-flash-lite`** (exactly this ID; no hidden fallbacks).
Design: [PROMPT_DESIGN.md](PROMPT_DESIGN.md). Transport: `src/lib/ai/gemini.ts`
(server-only REST). Acceptance: `src/lib/ai/validate.ts`.

## The contract being evaluated

1. **Gemini explains; it never calculates.** The prompt carries the approved
   action list, timestamped values and profile flags only. It carries no
   coordinates and no free user profile text.
2. **The reply must parse as JSON** with `{ "explanation": string,
   "actionNotes": Array<{ actionId, note }> }`, length-capped per field.
3. **Every `actionId` must exist in the approved plan** — unknown, duplicate
   or invented IDs are rejected.
4. **No URLs, HTML, markdown or emoji** survive validation.
5. **Any failure (429, timeout, malformed JSON, invalid schema, no key) yields
   an honest unavailable state** — the deterministic plan is never affected.

## How each part is evaluated today

| Layer | Method | Recorded result (2026-11-27) |
| --- | --- | --- |
| Response validation | `tests/ai-validation.test.ts` — 15 tests: unknown/duplicate action IDs, URLs, HTML, markdown, oversize output, empty payload | all pass |
| Transport failure modes | `tests/api.test.ts` + `tests/provider.test.ts` — 429 → honest fallback; malformed HTTP; timeout; model-ID verification (the route asserts the configured model string) | all pass |
| **Live model, deployed site** | two real questions POSTed to the **deployed** `/api/assistant` (2026-11-27) | both `status: "ok"`, `model: "gemini-3.5-flash-lite"`, schema-validated prose + 4 action notes each — [evidence/06](evidence/06-deployed-ai-answer-exclusion.json), [evidence/07](evidence/07-deployed-ai-answer-child.json); rendered UI: [screenshots/desktop-ai-answer.png](screenshots/desktop-ai-answer.png) |
| No-key behaviour, end-to-end | live POST `/api/assistant` with a question and no key (local production build of the same commit) | plan intact; AI state `unavailable / key_not_configured / gemini-3.5-flash-lite` — [evidence/08](evidence/08-honest-fallback-no-key.json) |
| Prompt hygiene | `tests/ai-validation.test.ts` asserts the prompt contains no coordinates and marks the user question untrusted | all pass |
| Real browser fallback | scripted Chromium on a production build: ask a question with no key → panel shows the honest unavailable message; plan remains | [screenshots/desktop-ai-fallback.png](screenshots/desktop-ai-fallback.png) |

## Live-model result (recorded 2026-11-27, deployed site)

With a free-tier key configured server-side on the deployment, two questions
were captured verbatim from the deployed production site:

| # | Question (abridged) | Result | Evidence |
| --- | --- | --- | --- |
| 1 | "Why were walking and cycling excluded from my commute alternatives today?" | `ok`; 494-char explanation grounded in the day's payload (Very Poor, PM2.5 186.3, estimate 355) + 4 notes referencing real action IDs (`breathe_shift_outdoor_window`, `breathe_sensitive_indoor_play`, `breathe_keep_windows_closed_peak`, `indoor_no_smoke_sources`) | [06-deployed-ai-answer-exclusion.json](evidence/06-deployed-ai-answer-exclusion.json) |
| 2 | "Which of these actions helps a young child the most, and what should we do first this evening?" | `ok`; 589-char explanation + 4 notes, same contract | [07-deployed-ai-answer-child.json](evidence/07-deployed-ai-answer-child.json) |

Both replies passed the full validation contract before reaching the UI:
JSON shape, action IDs against the approved plan, no URLs/HTML/markdown/emoji,
length caps. The rendered answer in the real interface is committed as
[screenshots/desktop-ai-answer.png](screenshots/desktop-ai-answer.png). The
verification window used a free-tier key that is deleted afterwards; the
captures remain as the record of the run.

## Known limitations of the AI layer

- The model can only annotate the approved plan; it cannot add, reorder or
  re-weight actions (by design — see [DECISIONS.md](DECISIONS.md) D4).
- Free-tier rate limits can make explanations unavailable at busy times; the
  fallback is the designed answer, not an error state.
- The question is length-capped and sanitised; long pasted text is truncated
  rather than interpreted.
- The live captures are point-in-time: a model can answer differently on a
  different day (the grounding payload is in each evidence file, so the
  quality of that day's grounding can be judged against it).
