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
| No-key behaviour, end-to-end | live POST `/api/assistant` with a question and an empty key | plan intact; AI state `unavailable / key_not_configured / gemini-3.5-flash-lite` — [evidence/06](evidence/06-assistant-ai-fallback-no-key.json) |
| Prompt hygiene | `tests/ai-validation.test.ts` asserts the prompt contains no coordinates and marks the user question untrusted | all pass |
| Real browser fallback | Playwright on the production build: ask a question with no key → panel shows the honest unavailable message; plan remains | [screenshots/desktop-ai-fallback.png](screenshots/desktop-ai-fallback.png) |

## Live-model status (stated plainly)

**The live Gemini provider has not yet been exercised** in a recorded run: no
`GEMINI_API_KEY` was available in the verification environment, and the
project's honesty rules forbid claiming a live-model result that did not
happen. The one thing a key cannot change is the contract above — validation
and fallback are provider-independent and fully covered.

**Pending (needs the maintainer's key):** a live smoke run — one question
against the deployed or local server with `GEMINI_API_KEY` set — whose
verbatim request/response would be committed to `docs/evidence/ai/` with the
model label, following the same pattern as
[LIVE_VERIFICATION.md](LIVE_VERIFICATION.md).

## Known limitations of the AI layer

- The model can only annotate the approved plan; it cannot add, reorder or
  re-weight actions (by design — see [DECISIONS.md](DECISIONS.md) D4).
- Free-tier rate limits can make explanations unavailable at busy times; the
  fallback is the designed answer, not an error state.
- The question is length-capped and sanitised; long pasted text is truncated
  rather than interpreted.
