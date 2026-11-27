/**
 * Open-Meteo Air Quality API adapter (server-side only).
 *
 * Data honesty rules implemented here (brief sections 2 and 7):
 * - Live provider responses are normalised and validated before use; a
 *   malformed response is REJECTED, not patched with fake values.
 * - Stale data is marked stale with its timestamp; it is never called
 *   current.
 * - Missing/null pollutants stay null; the indicative index reports which
 *   pollutants were excluded.
 * - Failures return an honest unavailable state; nothing here fabricates a
 *   reading.
 *
 * Provider: https://open-meteo.com/en/docs/air-quality-api
 * Model: CAMS global forecast (~11 km/45 km grid depending on domain) -
 * presented to users as modelled area-level data, never as a CPCB station
 * reading.
 */

import { computeIndicativeIndiaAqi } from "@/lib/aqi/cpcb";
import { categoryForIndex } from "@/lib/aqi/categories";
import { findBetterWindow } from "@/lib/planner/window";
import { cacheGet, cacheSet, gridKey } from "@/lib/cache";
import {
  DATA_DOCS_URL,
  DATA_MODEL,
  DATA_PROVIDER,
  type AirQualityResponse,
  type AirQualitySuccess,
  type HourlyPoint,
  type LocationInput,
} from "@/lib/schemas";

const PROVIDER_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const HOURLY_VARS = [
  "pm2_5",
  "pm10",
  "nitrogen_dioxide",
  "sulphur_dioxide",
  "carbon_monoxide",
  "ozone",
  "ammonia",
] as const;

const PAST_DAYS = 1;
const FORECAST_DAYS = 2;
const TIMEOUT_MS = 9_000;

/** Provider data older than this is flagged stale in the UI. */
const STALE_AFTER_MINUTES = 75;

function buildUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "pm2_5,pm10,us_aqi",
    hourly: HOURLY_VARS.join(","),
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
    timezone: "auto",
  });
  return `${PROVIDER_URL}?${params.toString()}`;
}

function toNullableNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

function isProviderRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

interface ParsedSeries {
  time: string[];
  pm25: (number | null)[];
  pm10: (number | null)[];
  no2: (number | null)[];
  so2: (number | null)[];
  co: (number | null)[];
  o3: (number | null)[];
  nh3: (number | null)[];
}

function parseHourly(raw: unknown): ParsedSeries | null {
  if (!isProviderRecord(raw)) return null;
  const time = raw.time;
  if (!Array.isArray(time) || time.length === 0) return null;
  const n = time.length;
  const pick = (key: string): (number | null)[] => {
    const arr = raw[key];
    if (!Array.isArray(arr) || arr.length !== n) {
      return Array.from({ length: n }, () => null);
    }
    return arr.map(toNullableNumber);
  };
  return {
    time: time.map(String),
    pm25: pick("pm2_5"),
    pm10: pick("pm10"),
    no2: pick("nitrogen_dioxide"),
    so2: pick("sulphur_dioxide"),
    co: pick("carbon_monoxide"),
    o3: pick("ozone"),
    nh3: pick("ammonia"),
  };
}

function failure(
  location: LocationInput,
  code: "provider_timeout" | "provider_error" | "invalid_response",
  message: string
): AirQualityResponse {
  return {
    ok: false,
    location: { lat: location.lat, lon: location.lon, label: location.label },
    fetchedAt: new Date().toISOString(),
    error: { code, message },
  };
}

export interface FetchOptions {
  /** Injectable fetch for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  now?: Date;
  /** Disable the shared 10-minute cache (tests default to isolated). */
  useCache?: boolean;
}

const PROVIDER_RETRIES = 1;
const RETRY_DELAY_MS = 600;
const CACHE_TTL_MS = 10 * 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch and normalise air-quality data for a location.
 * Never throws: every failure becomes an honest AirQualityFailure payload.
 * Successful payloads are shared through the in-memory grid cache so the
 * assistant route and the air route do not duplicate provider calls.
 */
export async function fetchAirQuality(
  location: LocationInput,
  options: FetchOptions = {}
): Promise<AirQualityResponse> {
  const now = options.now ?? new Date();
  const useCache = options.useCache ?? false;
  const cacheKey = gridKey(location.lat, location.lon, "air");

  if (useCache) {
    const cached = cacheGet<AirQualityResponse>(cacheKey);
    if (cached) return cached;
  }

  const result = await fetchAirQualityUncached(location, options, now);

  if (useCache && result.ok) {
    cacheSet(cacheKey, result, CACHE_TTL_MS);
  }
  return result;
}

async function fetchAirQualityUncached(
  location: LocationInput,
  options: FetchOptions,
  now: Date
): Promise<AirQualityResponse> {
  const url = buildUrl(location.lat, location.lon);

  let response: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= PROVIDER_RETRIES; attempt++) {
    if (attempt > 0) {
      // Single bounded retry for transient network conditions only.
      await sleep(RETRY_DELAY_MS);
    }
    try {
      response = await (options.fetchImpl ?? fetch)(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      const aborted =
        err instanceof Error &&
        (err.name === "TimeoutError" || err.name === "AbortError");
      if (aborted) break; // timeouts are not retried
    }
  }

  if (!response) {
    const aborted =
      lastError instanceof Error &&
      (lastError.name === "TimeoutError" || lastError.name === "AbortError");
    if (aborted) {
      return failure(
        location,
        "provider_timeout",
        "Air-quality data is temporarily unavailable (provider timed out)."
      );
    }
    return failure(
      location,
      "provider_error",
      "Air-quality data is temporarily unavailable (network error)."
    );
  }

  if (!response.ok) {
    return failure(
      location,
      "provider_error",
      `Air-quality provider returned status ${response.status}.`
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return failure(
      location,
      "invalid_response",
      "Air-quality provider returned a malformed response."
    );
  }

  if (!isProviderRecord(raw)) {
    return failure(
      location,
      "invalid_response",
      "Air-quality provider response has an unexpected structure."
    );
  }

  const current = raw.current;
  const hourly = parseHourly(raw.hourly);
  if (!isProviderRecord(current) || !hourly) {
    return failure(
      location,
      "invalid_response",
      "Air-quality provider response is missing current or hourly series."
    );
  }

  const currentPm25 = toNullableNumber(current.pm2_5);
  const currentPm10 = toNullableNumber(current.pm10);
  const currentUsAqi = toNullableNumber(current.us_aqi);

  const hourlyPoints: HourlyPoint[] = hourly.time.map((t, i) => ({
    time: t,
    pm25: hourly.pm25[i],
    pm10: hourly.pm10[i],
  }));

  const derived = computeIndicativeIndiaAqi({
    pm25: { hourly: hourly.pm25 },
    pm10: { hourly: hourly.pm10 },
    no2: { hourly: hourly.no2 },
    so2: { hourly: hourly.so2 },
    nh3: { hourly: hourly.nh3 },
    co: { hourly: hourly.co },
    o3: { hourly: hourly.o3 },
  });

  // Reference time for freshness: provider "current.time" when parseable.
  const currentTime = typeof current.time === "string" ? current.time : null;
  const currentMs = currentTime ? Date.parse(currentTime) : Number.NaN;
  const ageMinutes =
    Number.isFinite(currentMs)
      ? Math.max(0, Math.round((now.getTime() - currentMs) / 60_000))
      : 0;
  const stale =
    !Number.isFinite(currentMs) || ageMinutes > STALE_AFTER_MINUTES;

  const indicative =
    derived.status === "available"
      ? {
          status: "available" as const,
          value: derived.value,
          category: derived.categoryLabel,
          subIndices: derived.subIndices,
          pollutantsIncluded: derived.pollutantsIncluded,
          pollutantsExcluded: derived.pollutantsExcluded,
          label: "model-derived indicative India AQI estimate" as const,
          note:
            "CPCB-style breakpoints applied to CAMS model data with documented averaging-window coverage. This is NOT an official CPCB AQI and not a station reading.",
        }
      : {
          status: "unavailable" as const,
          subIndices: derived.subIndices,
          pollutantsIncluded: derived.pollutantsIncluded,
          pollutantsExcluded: derived.pollutantsExcluded,
          label: "model-derived indicative India AQI estimate" as const,
          note: derived.reason,
        };

  const category =
    indicative.status === "available"
      ? categoryForIndex(indicative.value!)
      : undefined;

  const betterWindow = findBetterWindow(
    hourlyPoints,
    currentTime ?? now.toISOString()
  );

  const caveats: string[] = [
    "Modelled area-level forecast (CAMS via Open-Meteo), not a CPCB station reading; street-level values can differ substantially.",
    "Global forecast grid is coarse; conditions can vary by street, time and indoor environment.",
    "US AQI (Open-Meteo) and the model-derived indicative India AQI estimate are different systems and are never merged.",
  ];
  if (indicative.status === "unavailable") {
    caveats.push(
      "India AQI estimate unavailable: raw pollutant concentrations are shown instead of an index value."
    );
  }

  const result: AirQualitySuccess = {
    ok: true,
    location: {
      lat: location.lat,
      lon: location.lon,
      label: location.label,
      gridNote: `Approximate area for lat/lon rounded to 2 decimals; values represent a model grid cell, not an exact address.`,
    },
    source: {
      provider: DATA_PROVIDER,
      model: DATA_MODEL,
      dataType: "modelled area-level forecast",
      docsUrl: DATA_DOCS_URL,
    },
    fetchedAt: now.toISOString(),
    freshness: {
      status: stale ? "stale" : "fresh",
      ageMinutes,
      stalenessNote: stale
        ? `Data reference time is ${ageMinutes} minutes old - shown as stale, never as current.`
        : `Updated ${ageMinutes} minutes ago (provider reference time).`,
    },
    current: {
      time: currentTime ?? now.toISOString(),
      pm25: currentPm25,
      pm10: currentPm10,
      usAqi: currentUsAqi,
    },
    derivedIndiaAqi: indicative,
    hourly: hourlyPoints,
    caveats,
  };

  return result;
}

/** Category used by the planner; falls back gracefully. */
export function categoryFromAir(air: AirQualitySuccess) {
  if (air.derivedIndiaAqi.status === "available") {
    return categoryForIndex(air.derivedIndiaAqi.value!);
  }
  return undefined;
}
