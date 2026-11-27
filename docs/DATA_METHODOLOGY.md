# Data Methodology — HawaSathi

Last reviewed: 2026-11-27 (project build date)

## 1. Provider and data type

- **Source:** Open-Meteo Air Quality API — https://open-meteo.com/en/docs/air-quality-api
- **Underlying model:** CAMS (Copernicus Atmosphere Monitoring Service) global atmospheric composition forecast, area-level gridded model data.
- **Variables requested:** current + hourly PM2.5, PM10, NO2, SO2, CO (µg/m³), O3, NH3, and Open-Meteo's `us_aqi`.
- **Presentation rule:** the UI always labels this as **"modelled area-level forecast"** with provider name, model description, reference timestamp and freshness. It is never described as a CPCB station reading or street-level truth.

## 2. Freshness and staleness

- The provider's `current.time` is the reference; age in minutes is displayed.
- Age > 75 minutes → the status chip shows **STALE** (amber text + label, never colour alone) and the note says the data is shown as stale, not current.
- On provider failure the card shows "Air-quality data is temporarily unavailable" with the failure class (timeout / network / HTTP status / malformed response). No substitute or estimated value is ever displayed.

## 3. Indicative India AQI estimate (model-derived)

`src/lib/aqi/cpcb.ts` implements a **model-derived indicative India AQI estimate**:

1. **Averaging windows.** CPCB methodology uses 24-hour averages for particulate and gaseous pollutants and 8-hour values for CO and O3. The adapter computes trailing-window means from the hourly series: 24h for PM2.5/PM10/NO2/SO2/NH3, 8h for CO/O3.
2. **Coverage threshold.** A sub-index is computed only when ≥75% of the window's hours contain valid values (≥18 of 24 hours; ≥6 of 8 hours). Insufficient data → the pollutant is listed under `pollutantsExcluded` in the response and surfaced in the UI.
3. **Breakpoints.** The CPCB National AQI breakpoint table (source: CPCB "Report of the Expert Group on Air Quality Index", Sept 2017 / "About AQI" documentation; last reviewed against those documents 2026-11-27) with linear interpolation inside each band:
   - PM2.5 24h: 0-30→0-50, 30-60→51-100, 60-90→101-200, 90-120→201-300, 120-250→301-400, 250-500→401-500
   - PM10 24h: 0-50→0-50, 50-100→51-100, 100-250→101-200, 250-350→201-300, 350-430→301-400, 430-600→401-500
   - NO2 24h: 40 / 80 / 180 / 280 / 400 µg/m³ band edges
   - SO2 24h: 40 / 80 / 380 / 800 / 1600 µg/m³
   - NH3 24h: 200 / 400 / 800 / 1200 / 1800 µg/m³
   - CO 8h (mg/m³): 1 / 2 / 10 / 17 / 34 (input converted µg/m³ ÷ 1000)
   - O3 8h: 50 / 100 / 168 / 208 / 748 µg/m³
4. **Overall value.** The worst (maximum) available sub-index, mirroring CPCB's rule that the worst pollutant determines the AQI. Values beyond the table top map to 500.
5. **Labelling.** The UI card is titled "India AQI estimate" and every mention carries the phrase **model-derived indicative India AQI estimate — NOT an official CPCB AQI**. US AQI is displayed in its own card, always labelled "US AQI". The two systems are never merged or compared as equivalents.
6. **Fallback.** If no pollutant yields a sub-index, the response says `India AQI estimate unavailable` and the UI shows raw concentrations instead of an index value.

Known limitation: trailing-window means from an hourly forecast are not identical to CPCB's official averaging protocol (which uses measured 24-hour concentrations and 8-hour maxima). This gap is stated in the UI caveats.

## 4. "Potentially better window" (`src/lib/planner/window.ts`)

- Compares the same pollutant (PM2.5) within the same provider series only.
- Baseline: mean of the next 2 forecast hours. A window (2 contiguous hours, within a 24-hour horizon) qualifies only when it improves on the baseline by ≥30% **and** ≥20 µg/m³.
- If baseline PM2.5 is already ≤35 µg/m³, or improvements are smaller than the thresholds, the answer is "No clearly better window found" — no forced recommendation.
- Every positive result carries the caveat: a lower forecast is not a guarantee of safe air.

## 5. Privacy in the data flow

- Coordinates are rounded to 2 decimals server-side before caching/provider calls; the cache key is the rounded grid cell. No addresses, names, or profile free-text are stored, logged, or forwarded to the AI.
- In-memory cache and per-IP rate limiting are per-serverless-instance and best-effort (documented limitation, not a distributed guarantee).

## 6. Review log

| Date | Review | Result |
|---|---|---|
| 2026-11-27 | CPCB breakpoint table vs. published Expert Group report values | matched; implemented as listed above |
| 2026-11-27 | Open-Meteo air-quality parameters and response shape | verified against live API responses during development |
