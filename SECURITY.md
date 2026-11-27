# Security policy — HawaSathi

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main`  | yes       |

## Reporting a vulnerability

Open a private security advisory via GitHub ("Security" → "Report a
vulnerability"). Please do not open a public issue for anything exploitable.
You will get a response within a week.

## Threat model (honest, current)

HawaSathi is a single-page Next.js app plus two server routes that call the
Open-Meteo Air Quality API and (optionally) the Gemini API.

| Asset | Threat | Mitigation |
| --- | --- | --- |
| `GEMINI_API_KEY` | Theft | Read only from `process.env` inside `src/app/api/` routes; never shipped to the browser, never logged, never returned to the client; `.env.local` gitignored; CI builds with an empty key to prove the app degrades honestly |
| Provider/AI quota | Abuse by third parties | Server-side proxy only (the browser never calls Open-Meteo or Gemini directly); in-memory rate limiting per IP on both routes with honest 429 responses |
| AI output | Prompt injection through the user's question | The question is sanitised (control characters stripped, length-capped) and wrapped between `"""` markers labelled UNTRUSTED; the system instruction forbids inventing numbers, actions, URLs or official alerts |
| AI output | Unvalidated content | JSON-mode response; server-side zod validation rejects unknown/duplicate action IDs, URLs, HTML and markdown before anything reaches the client; React escapes all text (no `dangerouslySetInnerHTML` anywhere) |
| Browser | Clickjacking, sniffing, protocol downgrade | HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Permissions-Policy` (set in `vercel.json`) |
| User data | Loss/leak | There is no account and no server-side storage. Profile choices and action feedback stay in browser localStorage. Coordinates are rounded to 2 decimals (~1.1 km) server-side before use; nothing finer is stored or logged |

## Known residual risks (stated plainly)

- The in-memory cache and rate limiter are **per serverless instance**. Without
  a shared store (Upstash/Vercel KV), limits multiply by instance count. The
  logic is isolated in `src/lib/rate-limit.ts` so a shared store can be added
  without touching the routes.
- Geolocation is optional and browser-mediated; the server receives only
  coordinates rounded to 2 decimals, but users should understand the label
  shown is coarse by design.
- Free-tier Gemini calls carry non-sensitive context only (city label,
  category, values, profile flags), but the model is a third party; the app
  remains fully usable with the AI panel unavailable.
- No automated secret-scanning or dependency-audit job runs in CI yet; the
  repository review checklist in the development log covers this manually.
