# ACCESSIBILITY_REPORT — what is implemented, what is verified, what is not

**Status: no automated axe scan or screen-reader session has been recorded
yet.** This report documents the accessibility measures actually implemented
in the code and the parts of them that were exercised during verification
(2026-11-27). Claims are limited accordingly; the gaps are listed at the end.

## Implemented measures (in code)

| Measure | Where | Detail |
| --- | --- | --- |
| Skip link | `src/components/HawaSathiApp.tsx` | "Skip to main content" link, visually hidden until focused, targets `#main` |
| Landmarks and headings | app shell | `<header>`, `<main id="main">`, `<footer>`; section headings use a shared `StepHeading` component — a visible numbered chip (decorative, `aria-hidden`) plus an `sr-only` "Step N:" prefix, so the page keeps a navigable heading outline ("Step 1: Choose your area" … "Step 6: Community bulletin") |
| Fieldset/legend grouping | `HouseholdProfile.tsx` | form fields grouped in `<fieldset>`s with `sr-only` legends ("Daily routine and commute", "Household equipment and flexibility") |
| Label association | forms | every control has a `<Label htmlFor>` tied by id; selects have accessible names |
| Icon-only affordances | `LocationPicker.tsx` | search input carries `aria-label="Search for your city or locality"`; decorative icons marked `aria-hidden` |
| Status regions | app shell | page-level errors render in `role="alert"`; loading states via `aria-busy` on the submit button and `role="status"` skeletons on the server shell |
| Evidence-based feedback | `ActionCard.tsx` | verdict chips are real buttons with visible text (not icon-only), so the state change is announced as a normal button |
| Focus visibility | globals | Tailwind focus rings on interactive elements; the skip link is the first tab stop |
| Colour and category | `AirQualitySummary.tsx` | AQI categories use colour **and** a text label ("Very Poor"), never colour alone; both index systems are labelled in text. The 0-500 gauge is decorative colour plus a numeric axis; it carries `role="img"` with a text alternative stating where the current estimate falls on the scale, and the number + category are always rendered as text beside it |
| Reduced motion | `globals.css` | explicit `prefers-reduced-motion` block forces animation/transition durations to 0.01 ms (covers the skeleton pulse and the AQI gauge marker slide) |
| Touch targets | forms/plan | controls use `min-h-11` (44 px) trigger heights on the primary selectors and buttons |

## Exercised during verification (2026-11-27)

- The full journey (location → data → profile → plan → AI ask) was driven in
  Chromium **via accessible roles and text** — `getByRole("button", { name: /
  Generate today's plan/i })`, `getByPlaceholder`, `getByText` — which
  required the labels/roles above to be present and correct. The journey
  passed at 1440 px and 390 px ([screenshots](screenshots/)).
- The distance-input defect (D5 in [../worklog.md](../worklog.md)) — where
  native validation silently blocked a legitimate value — was found exactly
  because a screen-reader-style accessible automation could not proceed; the
  fix restores submission for any 0.2–150 km value with the documented error
  message for out-of-range input.

## Honest gaps (not yet verified)

- No axe-core scan has been run (jsdom or browser); no violation count is
  claimed.
- No real screen-reader session (NVDA/VoiceOver) has been recorded; live-
  region announcement behaviour is inferred from the roles used, not tested.
- Keyboard-only navigation beyond the skip link and normal tab order has not
  been formally journaled.
- Contrast ratios of the category colour tokens against their backgrounds
  have not been measured; category labels are always present in text so the
  colour is supplementary.

**Next step (tracked):** add an axe scan to the browser verification pass and
a keyboard-only journey, then update this report with the recorded results.
