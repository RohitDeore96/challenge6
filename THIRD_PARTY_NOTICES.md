# Third-Party Notices and Attribution

HawaSathi is an original implementation for PromptWars Challenge 6. The
items below are the third-party components, data sources and reference
documents used, with source and licence information. Nothing from other
participants' repositories (or previous challenge submissions) was copied.

## Framework scaffold

| Item | Source | Licence | Notes |
|---|---|---|---|
| Next.js 16 (App Router) | https://nextjs.org | MIT | App framework |
| React / React DOM 19 | https://react.dev | MIT | UI runtime |
| Tailwind CSS 4 | https://tailwindcss.com | MIT | Styling |
| shadcn/ui (New York style) | https://ui.shadcn.com | MIT | Component primitives; only the used subset is committed (button, card, input, label, select, radio-group, badge, separator, textarea, alert, switch, checkbox, tabs, accordion, tooltip, scroll-area, skeleton, toast, sonner) |
| Radix UI primitives | https://www.radix-ui.com | MIT | Underlying shadcn primitives |
| lucide-react | https://lucide.dev | ISC | Icons |
| Recharts | https://recharts.org | MIT | Hourly forecast chart |
| Zod | https://zod.dev | MIT | Schema validation |
| Vitest | https://vitest.dev | MIT | Test runner |

The project started from a Next.js + TypeScript + Tailwind + shadcn/ui
scaffold provided by the development environment; the scaffold was cleaned
before implementation and all product code is original (see
docs/DEVELOPMENT_LOG.md).

## Data sources

| Source | URL | Terms | Used for |
|---|---|---|---|
| Open-Meteo Air Quality API | https://open-meteo.com/en/docs/air-quality-api | CC BY 4.0 (non-commercial use); data from CAMS (ECMWF/Copernicus) | Hourly pollutant model data, US AQI. Attribution linked in the air summary card and the UI footer |
| CAMS — Copernicus Atmosphere Monitoring Service | https://atmosphere.copernicus.eu | Copernicus open licence | Underlying forecast model (via Open-Meteo) |
| Open-Meteo Geocoding API (GeoNames) | https://open-meteo.com/en/docs/geocoding-api | CC BY 4.0 (non-commercial use); GeoNames data | Question-time place resolution for city/town names, filtered to India |
| OpenStreetMap Nominatim | https://nominatim.openstreetmap.org | ODbL 1.0; © OpenStreetMap contributors | Question-time neighbourhood/locality resolution fallback (place-type filtered, serialised to the public rate limit, successful results cached; attribution linked in the AI panel and the UI footer) |

## Reference documents (no content copied; used as methodology sources)

| Reference | URL | Use |
|---|---|---|
| CPCB — National AQI Expert Group report / "About AQI" | https://cpcb.nic.in/displaypdf.php?id=bWFudWFsLW1vbml0b3JpbmcvQVFJX05BTVBfUmVwX1NlcHRyMjAxNy5wZGY%3D | Category list, breakpoint table, averaging windows for the indicative index (re-implemented in original code, `src/lib/aqi/cpcb.ts`) |
| UK DEFRA/BEIS GHG conversion factors 2024 | https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting | Indicative emission factors (values + source recorded per factor in `src/lib/impact/emissions.ts`) |
| US EPA — Indoor air quality basics | https://www.epa.gov/air-quality/indoor-air-quality | Indoor action guidance principles |
| US EPA — Air cleaners and air filters for the home | https://www.epa.gov/indoor-air-quality-iaq/air-cleaners-and-air-filters-home | Filtration/CADR/ventilation guidance principles |
| WHO — Air pollution: personal interventions and risk communication | https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication | Exposure-reduction guidance principles |
| Google Gemini API docs (models/pricing) | https://ai.google.dev/gemini-api/docs/models | Model ID, API shape for `gemini-3.5-flash-lite` |
| Vercel docs (environment variables, limits) | https://vercel.com/docs/environment-variables | Deployment configuration |

## AI model

- **Google Gemini `gemini-3.5-flash-lite`** — accessed via Google's public
  Generative Language REST API with a user-provided API key. Model output
  is validated before display; Google's terms apply to API usage. No
  Google SDK is bundled (REST calls only).

## Original assets

- Logo/icon (`src/app/icon.svg`): original SVG created for this project.
- City list (`src/lib/data/cities.ts`): hand-maintained public geographic
  facts, compiled for this project.
- All UI copy, action descriptions, methodology docs and tests: original.
