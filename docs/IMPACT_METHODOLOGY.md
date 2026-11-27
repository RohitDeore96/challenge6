# Impact Methodology — HawaSathi

Last reviewed: 2026-11-27 (project build date)

HawaSathi shows several distinct impact types. This document records every
formula, factor, unit, assumption and source, and the rules that decide when
NO number is shown.

## 1. Travel emissions (`travel_emissions`)

**Formula** (implemented in `src/lib/impact/emissions.ts`):

```
estimated CO2e avoided (kg/day) =
  distance_km × (baseline_factor_per_person − alternative_factor_per_person)
  × trips_per_day
```

- **Per-person comparison.** Car factors are per vehicle-km; a carpool
  alternative divides the vehicle factor by the number of occupants
  (default 3, user-adjustable 1–6). Public transport and active modes use
  per-passenger factors directly.
- **Trips.** Defaults to 2 one-way trips/day; clamped to 1–6.
- **Distance.** From the optional profile field; clamped to 150 km. Without
  a distance **no numeric estimate is shown** — the card states that a
  numeric estimate requires trip distance and documented factors, and
  neither is guessed.
- **Clamping.** Distance >150 km and trip counts beyond the band are clamped
  before computing; the formula string on the card always shows the actual
  numbers used.

### Emission factor table (indicative defaults)

| Mode | Factor | Basis | Source |
|---|---|---|---|
| Car (avg fuel) | 0.17016 kg CO2e/km | per vehicle-km | UK DEFRA/BEIS GHG conversion factors 2024 |
| Carpool | same vehicle factor, ÷ occupants | per person-km | same |
| Two-wheeler (avg motorcycle) | 0.10311 kg CO2e/km | per vehicle-km | same |
| Local bus | 0.10186 kg CO2e/km | per passenger-km | same |
| Metro/train | 0.03318 kg CO2e/km | per passenger-km | DEFRA/BEIS national rail used as the nearest published proxy for electric urban rail |
| Walk / cycle | 0 | direct-emission-free | WHO personal-interventions guidance |

Source URL: https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting (DEFRA/BEIS 2024).

**Assumptions attached to every numeric card:**
1. Indicative public factors — not India-certified measured values.
2. Direct tailpipe CO2e only; upstream fuel/electricity production excluded.
3. Assumes N one-way trips/day for this shift (N shown on the card).
4. Applies to the household's trips — **never** to the city's ambient air
   quality or its AQI.

### When numbers are withheld

- Distance missing or invalid → qualitative copy only.
- Baseline or alternative factor missing (e.g. unknown modes) → no number.
- The shift is not lower-emitting (per-person difference ≤ 0) → no number.
- Trip chaining / errand combining → no number (no reliable km-saved input);
  the card describes the mechanism (fewer cold starts and km) qualitatively.

## 2. Outdoor exposure (`outdoor_exposure`)

Displayed as **minutes of optional outdoor time that can move** to a cleaner
window or indoors (e.g. "roughly 45 minutes … moved"). No health-percentage
claims are made; the benefit is exposure reduction, not a medical outcome.

## 3. Indoor source control (`indoor_source_control`)

Always **qualitative**: the action removes or contains the source itself
(EPA source-control hierarchy). No percentage reduction is claimed without a
measurement inside the user's home.

## 4. Filtration (`filtration`)

Always **qualitative** with scope limits: a purifier may reduce particles in
the treated room only; the app cannot claim a percentage for the user's room
and does not claim removal of every pollutant. Maintenance follows the
manufacturer's instructions.

## 5. Cost (`cost`)

Cost bands come from the user's own stated budget
(₹0 / under ₹500 / ₹500–2,000 / above ₹2,000). Cards display the action's
band plus a short note. Where a recurring cost exists (e.g. purifier filter
replacement) the note says it varies by brand and size — no invented prices.
The rule engine filters actions that exceed the stated budget.

## 6. Time (`time`)

`effortMinutes` is the estimated time the action itself takes; shown as
"~N min" or "no extra time". When not derivable, the card says "effort
varies". Travel-time savings are not claimed (no route data).

## 7. Anti-goals (enforced by tests in `tests/impact.test.ts` and `tests/planner.test.ts`)

- No numeric impact when a factor/source is missing.
- No claim that one person's choice changes the city AQI.
- No exact indoor PM-reduction percentages.
- No fabricated prices, routes, fares or journey times.
