# DECISIONS — key design choices and why

Each entry states the decision, the alternatives considered and the trade-off
accepted. The brief's principles (real data or honest unavailability; rules
calculate, Gemini explains; privacy by default) outrank everything here.

## D1 — Next.js 16 single page, no database

**Decision:** one client-rendered page, localStorage persistence, two server
routes.
**Why:** the brief's product is a daily assistant, not a multi-user system; a
database would add accounts, GDPR-shaped obligations and Vercel cost for zero
user value. localStorage keeps the privacy promise trivially auditable
("your choices stay in your browser" is literally true).
**Trade-off:** preferences do not follow the user across devices — stated in
the UI and README rather than hidden.

## D2 — Open-Meteo (CAMS) as the sole provider

**Decision:** use the Open-Meteo Air Quality API only; no CPCB station feed.
**Why:** free, no key, global CAMS model coverage, documented licence (CC BY
4.0 for non-commercial use). CPCB station data has no stable free API and
would push the project over the ₹0 budget.
**Trade-off:** modelled area-level data (11–45 km grid), not street truth —
which is why every screen labels the data type and caveats, and why the
derived index says "model-derived indicative … estimate".

## D3 — Two index systems, never merged

**Decision:** show the provider's US AQI **and** a model-derived indicative
India AQI estimate (CPCB breakpoints on model data), each labelled, never
averaged.
**Why:** Indian users think in CPCB categories ("Very Poor"), and showing
only a US AQI number would mislead them; presenting model data as an official
CPCB AQI would be dishonest.
**Trade-off:** two numbers on screen; mitigated by fixed labels and a
one-line explanation of the difference.

## D4 — Deterministic engine with safety gates; AI is prose-only

**Decision:** all selection, gating and arithmetic in tested modules; Gemini
receives the approved plan + timestamped data and returns explanation prose
validated against a zod schema (known action IDs, no URLs/HTML, length caps).
**Why:** the brief forbids AI-invented numbers; schema validation makes the
AI's failure modes (hallucinated actions, injected links, oversized output)
fail closed into an honest unavailable state.
**Trade-off:** the AI cannot restructure recommendations — accepted; users
can disagree with an action via feedback chips, which re-runs the engine, not
the model.

## D5 — Emission factors from UK DEFRA/BEIS 2024 defaults

**Decision:** use published DEFRA/BEIS 2024 conversion factors for travel
impact estimates.
**Why:** freely published, methodologically documented, and consistent
enough for honest comparisons; India-specific certified factors are not
freely available in a citable form.
**Trade-off:** factors are indicative for Indian vehicles and fuels — stated
per card and in [IMPACT_METHODOLOGY.md](IMPACT_METHODOLOGY.md). No numeric
claim is shown without a distance and a sourced factor.

## D6 — In-memory cache and rate limits (per instance)

**Decision:** shared 10-minute grid cache + per-IP in-memory limits.
**Why:** ₹0 budget; identical grid cells (family members, repeated refreshes)
should not repeat provider calls; per-instance semantics are acceptable at
challenge scale.
**Trade-off:** limits multiply with serverless instances — isolated in one
module so a shared store can replace it; documented in
[SECURITY.md](../SECURITY.md).

## D7 — Coordinates rounded server-side; non-sensitive AI context

**Decision:** round lat/lon to 2 decimals (~1.1 km) in the routes; send only
city label, category, values and profile flags to Gemini.
**Why:** geolocation improves the grid match, but fine coordinates are
personal data the app does not need after rounding; the AI context is
non-sensitive by design.
**Trade-off:** "Use my location" is slightly coarser than the browser
reported — disclosed next to the control.

## D8 — `@types/node` as an explicit dev dependency

**Decision:** declare `@types/node@^22` even though transitive installs can
mask its absence locally.
**Why:** Next's build-time TypeScript check requires it; Vercel's clean
`bun install` failed without it (defect D1 in [../worklog.md](../worklog.md))
while local runs passed. Undeclared-but-needed packages create
works-on-my-machine builds.
**Trade-off:** one more dev dependency to keep updated.

## D9 — Repository documentation mirrors the maintainer's Challenge 5 repo

**Decision:** same root/doc structure as `RohitDeore96/Eventplanner`
(worklog, SECURITY, CONTRIBUTING, evidence index, live verification) so the
maintainer's verification habits are consistent across submissions.
**Trade-off:** more docs to keep in sync — mitigated by this DECISIONS file
and dated worklog entries.
