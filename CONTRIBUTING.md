# Contributing to HawaSathi

Thank you for helping build HawaSathi — an urban air-quality assistant where
**the rules calculate, Gemini explains, and the user decides**. This guide
covers setup and the conventions that keep the project auditable.
Security-sensitive disclosures go through [SECURITY.md](SECURITY.md), not pull
requests.

## Setup

```bash
bun install            # exact dependency tree from bun.lock
cp .env.example .env.local   # optional: only for live AI explanations
bun run dev            # http://localhost:3000
bun test               # unit/integration tests (vitest)
```

Node 22+ (or Bun 1.3+). The app is fully functional without any API key:
the deterministic plan engine answers, and the AI panel shows an honest
"unavailable" state that says so.

## The quality gates

Every push runs the same gates CI runs (`.github/workflows/ci.yml`):

| Gate | Command | Expectation |
| --- | --- | --- |
| Lint | `bun run lint` | zero errors, zero warnings |
| Typecheck | `bun run typecheck` | `tsc --noEmit` clean; type errors fail the build |
| Tests | `bun test` | all green; safety-rule behaviour is covered by named tests |
| Build | `bun run build` | production build clean (no `ignoreBuildErrors` escape hatch exists) |

A pull request is reviewable only when every gate is green. No gate may be
weakened or skipped to make a change pass.

## Conventions

**Data honesty is the design centre.** A failed provider call returns an
explicit unavailable/stale state — never a fabricated reading, never a silent
retry-until-fake-success. US AQI (Open-Meteo) and the model-derived indicative
India AQI estimate are separate systems and are never merged or averaged.
If you add a data path, its failure mode must be as honest as its success path.

**Rules calculate; Gemini explains.** AQI derivation, safety gates, action
selection and impact numbers live in deterministic, unit-tested modules
(`src/lib/`). The AI receives the approved action list plus timestamped data
and returns prose that is schema-validated (action IDs verified, URLs/HTML
rejected, length-bounded) before rendering. Never move a calculation into the
prompt.

**Secrets.** The Gemini key is read only from `process.env` inside server
routes. Nothing secret may be prefixed `NEXT_PUBLIC_`, logged, or committed.
`.env.local` is gitignored; `.env.example` documents the shape.

**Privacy.** No accounts, names, addresses, phone numbers or diagnoses.
Profile choices live in browser localStorage only. Coordinates are rounded to
2 decimals server-side; never send or log anything finer. Free-tier Gemini
calls carry only non-sensitive context (city label, category, values, profile
flags).

**TypeScript.** Strict mode; no `@ts-ignore`. New boundaries get zod contracts
in `src/lib/schemas.ts` shared by routes and tests.

**Tests.** Behaviour changes need a test that fails without them. Safety gates
(severe-smog blocks, budget matching, purifier advice, feedback determinism)
are the highest-value suites — extend `tests/planner.test.ts` first.

**Originality.** Do not copy another participant's code, text or assets.
Record any third-party template, icon pack or sample in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Make small, meaningful
commits whose messages describe the actual work.
