/**
 * GET /api/air-quality?lat=..&lon=..&label=..
 *
 * Server-side proxy for the Open-Meteo Air Quality API. Caching lives in
 * the provider adapter (shared with the assistant route) and rate limiting
 * here. This route never exposes provider errors verbatim and never
 * fabricates data; failures return honest unavailable states.
 */

import { NextResponse } from "next/server";
import { fetchAirQuality } from "@/lib/providers/openMeteo";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseNumberParam(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request): Promise<NextResponse> {
  const rate = checkRateLimit(req, "air");
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "provider_error",
          message: `Too many requests. Retry after ${rate.retryAfterSeconds}s.`,
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  const url = new URL(req.url);
  const lat = parseNumberParam(url.searchParams.get("lat"));
  const lon = parseNumberParam(url.searchParams.get("lon"));
  const label = (url.searchParams.get("label") ?? "").trim().slice(0, 80);

  if (
    lat === null ||
    lon === null ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_input",
          message:
            "Valid lat and lon query parameters are required (e.g. ?lat=28.61&lon=77.21&label=Delhi).",
        },
      },
      { status: 400 }
    );
  }

  const safeLabel = label.length > 0 ? label : "Selected area";
  const location = {
    lat: Math.round(lat * 100) / 100,
    lon: Math.round(lon * 100) / 100,
    label: safeLabel,
  };

  const result = await fetchAirQuality(location, { useCache: true });
  return NextResponse.json(result);
}
