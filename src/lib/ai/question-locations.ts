/**
 * Question-time location resolution (server-side only).
 *
 * When the user asks "what is mumbai aqi" or "what is warje aqi in pune"
 * while their selected location is Pune, the AI must not be left with only
 * the home city's data. This module finds real places mentioned in the
 * question and resolves them to coordinates so the route can fetch LIVE
 * air-quality data for each of them before the model is called.
 *
 * Design rules:
 * - Deterministic first: exact matches against the curated city list
 *   (no network call, no false positives on "aqui"/"queue" style noise).
 * - Fallback: Open-Meteo Geocoding API (GeoNames data) for names that are
 *   not in the list, filtered to India. The geocoder is only consulted for
 *   plausible place tokens (length, stopword filtering, attempt cap).
 * - Nominatim (OpenStreetMap) is used only as the second fallback tier for
 *   neighbourhood/locality names, and is kept inside its public usage
 *   policy: successful geocodes are cached per place name (24 h), and
 *   Nominatim requests are serialised with a >=1.1 s spacing. Like every
 *   module-level guard this is per serverless instance and best-effort,
 *   not a global rate limiter; the attempt cap (2 tokens/question) keeps
 *   the worst case well inside the published limits.
 * - Nothing is ever guessed: if a place cannot be resolved confidently it
 *   is simply not returned, and the AI is told which places have live data.
 * - Places within ~0.3 degrees of the selected location are marked "home";
 *   the route reuses the home fetch instead of duplicating provider calls.
 * - Never throws: any failure degrades to "no extra locations".
 */

import { findCity } from "@/lib/data/cities";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 6_000;
const MAX_LOCATIONS = 2;
const MAX_GEOCODE_ATTEMPTS = 2;
/**
 * Two points closer than this (~2 km in India) are treated as the same
 * grid cell for dedupe/home purposes. Deliberately tight: a named
 * neighbourhood such as Warje (~6 km from Pune centre) still gets its own
 * live fetch, while "Delhi" vs "New Delhi" (~1 km apart) collapses to one.
 */
const SAME_PLACE_DEGREES = 0.02;

/** Words that are almost never a place name in this app's context. */
const STOPWORDS = new Set([
  "about", "after", "again", "air", "all", "also", "and", "any", "are", "area",
  "areas", "aqi", "bad", "because", "been", "being", "best", "better", "between",
  "both", "but", "can", "cannot", "city", "cities", "clean", "compare", "compared",
  "concern", "data", "day", "days", "did", "does", "doing", "during", "each",
  "effect", "effects", "even", "ever", "every", "forecast", "for", "from",
  "get", "give", "good", "got", "has", "have", "help", "here", "high", "higher",
  "how", "index", "into", "is", "its", "just", "know", "level", "levels", "like",
  "little", "local", "low", "lower", "made", "many", "mask", "masks", "mean",
  "more", "most", "much", "must", "my", "need", "needs", "now", "number",
  "off", "often", "our", "out", "over", "plan", "plans", "action", "actions",
  "excluded", "exclude", "pm2", "pm10", "pm25", "pm2_5", "pollution",
  "pollutant", "pollutants", "quality", "reading", "readings", "really", "right",
  "risk", "risks", "safe", "safety", "said", "same", "see", "should", "since",
  "some", "such", "take", "tell", "than", "that", "the", "their", "them", "then",
  "there", "these", "they", "this", "those", "through", "time", "times", "today",
  "tomorrow", "too", "true", "unit", "units", "until", "updated", "very", "was",
  "weather", "were", "what", "when", "where", "which", "while", "who", "why",
  "will", "with", "without", "would", "yesterday", "you", "your",
]);

export interface QuestionLocation {
  label: string;
  lat: number;
  lon: number;
  /** Where the resolution came from. */
  source: "city_list" | "geocoder";
  /** "home" = same place as the selected location; the plan data covers it. */
  relation: "home" | "other";
}

export interface ResolveOptions {
  fetchImpl?: typeof fetch;
  /**
   * Route-level deadline (epoch ms). Before each geocoder attempt the
   * resolver stops if the deadline has passed, so question resolution can
   * never push a serverless request past its overall time budget.
   */
  deadline?: number;
}

/* ------------------------------------------------------------------ */
/* Shared geocoder state: success cache + Nominatim throttle            */
/* ------------------------------------------------------------------ */

const NOMINATIM_MIN_INTERVAL_MS = 1_100; // public policy: max 1 request/second
const GEOCACHE_TTL_MS = 24 * 60 * 60_000; // successful geocodes cached 24 h
const GEOCACHE_MAX_ENTRIES = 200;

interface GeocoderState {
  /** Successful geocode results by "tier:token"; never stores questions. */
  successes: Map<string, { match: IndiaMatch; expiresAt: number }>;
  /** Serialised Nominatim requests (keeps spacing without retry storms). */
  queue: Promise<unknown>;
  lastNominatimAt: number;
}

/**
 * Per-fetcher geocoder state. In production every call shares the same
 * fetcher (the platform global fetch), so this is one shared cache and one
 * shared throttle per serverless instance. Tests that inject their own
 * fetchImpl automatically get isolated state.
 */
const geocoderStates = new Map<typeof fetch | null, GeocoderState>();

function stateFor(fetcher: typeof fetch | null): GeocoderState {
  let state = geocoderStates.get(fetcher);
  if (!state) {
    state = {
      successes: new Map(),
      queue: Promise.resolve(),
      lastNominatimAt: 0,
    };
    geocoderStates.set(fetcher, state);
  }
  return state;
}

function cacheGetMatch(state: GeocoderState, key: string): IndiaMatch | null {
  const hit = state.successes.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    state.successes.delete(key);
    return null;
  }
  return hit.match;
}

function cacheSetMatch(
  state: GeocoderState,
  key: string,
  match: IndiaMatch
): void {
  // Simple size guard so a long-lived instance cannot grow unbounded.
  if (state.successes.size >= GEOCACHE_MAX_ENTRIES) {
    const oldest = state.successes.keys().next().value;
    if (oldest !== undefined) state.successes.delete(oldest);
  }
  state.successes.set(key, {
    match,
    expiresAt: Date.now() + GEOCACHE_TTL_MS,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Nominatim fetch through a serialised queue with >=1.1 s spacing between
 * requests, per the public usage policy (max 1 request/second). No retries
 * here: a failed or rate-limited call simply yields no result.
 */
function nominatimFetch(
  fetcher: typeof fetch,
  state: GeocoderState,
  url: string,
  init: RequestInit
): Promise<Response> {
  const run = async (): Promise<Response> => {
    const wait = state.lastNominatimAt + NOMINATIM_MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    try {
      return await fetcher(url, init);
    } finally {
      state.lastNominatimAt = Date.now();
    }
  };
  const result = state.queue.then(run, run);
  state.queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

interface GeocodeResult {
  name?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  country_code?: unknown;
  admin1?: unknown;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toCoord(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Nominatim returns coordinates as strings; accept both safely. */
function toCoordLoose(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Candidate place tokens: letters only, 3-24 chars, not stopwords. */
function candidateTokens(question: string): string[] {
  const raw = question.toLowerCase().replace(/[^a-z]+/g, " ").split(" ");
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const t of raw) {
    if (t.length < 3 || t.length > 24 || STOPWORDS.has(t) || seen.has(t)) continue;
    seen.add(t);
    tokens.push(t);
  }
  return tokens;
}

/** Two-word bigrams for multi-word names such as "new delhi". */
function candidateBigrams(question: string): string[] {
  const raw = question.toLowerCase().replace(/[^a-z]+/g, " ").split(" ");
  const bigrams: string[] = [];
  for (let i = 0; i + 1 < raw.length; i++) {
    const a = raw[i];
    const b = raw[i + 1];
    if (a.length >= 3 && b.length >= 3 && !STOPWORDS.has(a) && !STOPWORDS.has(b)) {
      bigrams.push(`${a} ${b}`);
    }
  }
  return bigrams;
}

function nearHome(
  lat: number,
  lon: number,
  home: { lat: number; lon: number }
): boolean {
  return (
    Math.abs(lat - home.lat) <= SAME_PLACE_DEGREES &&
    Math.abs(lon - home.lon) <= SAME_PLACE_DEGREES
  );
}

function alreadyFound(
  lat: number,
  lon: number,
  found: QuestionLocation[]
): boolean {
  return found.some(
    (f) =>
      Math.abs(f.lat - lat) <= SAME_PLACE_DEGREES &&
      Math.abs(f.lon - lon) <= SAME_PLACE_DEGREES
  );
}

/**
 * Resolve up to MAX_LOCATIONS real places from the question text.
 * Order: curated city-list matches first, then (only if a plausible token
 * is still unresolved) two geocoder tiers filtered to India:
 *   1. Open-Meteo geocoding (GeoNames) - fast, cities and larger towns;
 *   2. Nominatim (OpenStreetMap) - neighbourhood/locality names such as
 *      "Warje" that GeoNames does not carry. Only place-like result types
 *      are accepted (suburb, neighbourhood, city, town, village, state...),
 *      never POIs such as businesses or railway stations.
 */
export async function resolveQuestionLocations(
  question: string,
  home: { label: string; lat: number; lon: number },
  options: ResolveOptions = {}
): Promise<QuestionLocation[]> {
  const found: QuestionLocation[] = [];
  const tokens = candidateTokens(question);
  if (tokens.length === 0 && candidateBigrams(question).length === 0) {
    return found;
  }

  const state = stateFor(options.fetchImpl ?? null);
  const deadlinePassed = () =>
    options.deadline !== undefined && Date.now() >= options.deadline;
  const resolvedTokenNames = new Set<string>();

  // 1. Curated list: exact name matches over tokens and bigrams.
  for (const name of [...candidateBigrams(question), ...tokens]) {
    if (found.length >= MAX_LOCATIONS) break;
    const city = findCity(name);
    if (!city) continue;
    resolvedTokenNames.add(city.name.toLowerCase());
    for (const t of name.split(" ")) resolvedTokenNames.add(t);
    found.push({
      label: city.state ? `${city.name}, ${city.state}` : city.name,
      lat: city.lat,
      lon: city.lon,
      source: "city_list",
      relation: nearHome(city.lat, city.lon, home) ? "home" : "other",
    });
  }

  // 2. Geocoder fallback for tokens not resolved by the list (e.g. a
  //    neighbourhood such as "Warje"). Home-name tokens are skipped: the
  //    plan data already covers them.
  const geoTokens = tokens
    .filter((t) => !resolvedTokenNames.has(t))
    .filter((t) => !home.label.toLowerCase().includes(t))
    .slice(0, MAX_GEOCODE_ATTEMPTS);

  for (const token of geoTokens) {
    if (found.length >= MAX_LOCATIONS) break;
    if (deadlinePassed()) break;
    const match =
      (await geocodeInIndia(token, options, state)) ??
      (await geocodeNeighbourhood(token, options, state));
    if (!match) continue;
    if (alreadyFound(match.lat, match.lon, found)) continue;
    found.push({
      label: match.label,
      lat: match.lat,
      lon: match.lon,
      source: "geocoder",
      relation: nearHome(match.lat, match.lon, home) ? "home" : "other",
    });
  }

  return found;
}

interface IndiaMatch {
  label: string;
  lat: number;
  lon: number;
}

async function geocodeInIndia(
  token: string,
  options: ResolveOptions,
  state: GeocoderState
): Promise<IndiaMatch | null> {
  const cacheKey = `openmeteo:${token}`;
  const cached = cacheGetMatch(state, cacheKey);
  if (cached) return cached;

  const url = `${GEOCODE_URL}?name=${encodeURIComponent(token)}&count=5&language=en&format=json`;
  try {
    const res = await (options.fetchImpl ?? fetch)(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    if (!isRecord(raw) || !Array.isArray(raw.results)) return null;
    for (const entry of raw.results as unknown[]) {
      if (!isRecord(entry)) continue;
      const geo = entry as GeocodeResult;
      if (geo.country_code !== "IN") continue;
      const lat = toCoord(geo.latitude);
      const lon = toCoord(geo.longitude);
      if (lat === null || lon === null) continue;
      const name = typeof geo.name === "string" ? geo.name : token;
      const admin1 = typeof geo.admin1 === "string" ? geo.admin1 : null;
      const match: IndiaMatch = {
        label: admin1 && !name.toLowerCase().includes(admin1.toLowerCase())
          ? `${name}, ${admin1}`
          : name,
        lat: Math.round(lat * 1000) / 1000,
        lon: Math.round(lon * 1000) / 1000,
      };
      cacheSetMatch(state, cacheKey, match);
      return match;
    }
    return null;
  } catch {
    // Geocoder unavailable: degrade honestly, no place invented.
    return null;
  }
}

interface NominatimResult {
  lat?: unknown;
  lon?: unknown;
  name?: unknown;
  addresstype?: unknown;
  type?: unknown;
  display_name?: unknown;
  address?: { state?: unknown };
}

/**
 * Place-like result types accepted from Nominatim. Deliberately excludes
 * POI categories (railway, business, amenity...) so a random shop called
 * "Warje" can never become an air-quality reading location.
 */
const NOMINATIM_PLACE_TYPES = new Set([
  "suburb",
  "neighbourhood",
  "quarter",
  "borough",
  "city",
  "town",
  "village",
  "hamlet",
  "township",
  "municipality",
  "county",
  "district",
  "state",
  "union_territory",
]);

async function geocodeNeighbourhood(
  token: string,
  options: ResolveOptions,
  state: GeocoderState
): Promise<IndiaMatch | null> {
  const cacheKey = `nominatim:${token}`;
  const cached = cacheGetMatch(state, cacheKey);
  if (cached) return cached;

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(token)}&format=jsonv2&addressdetails=1&limit=5&countrycodes=in`;
  try {
    const res = await nominatimFetch(options.fetchImpl ?? fetch, state, url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        "User-Agent": "HawaSathi/1.0 (urban air quality assistant)",
        "Accept-Language": "en",
      },
    });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    if (!Array.isArray(raw)) return null;
    for (const entry of raw as unknown[]) {
      if (!isRecord(entry)) continue;
      const geo = entry as NominatimResult;
      const kind = typeof geo.addresstype === "string" ? geo.addresstype : geo.type;
      if (typeof kind !== "string" || !NOMINATIM_PLACE_TYPES.has(kind)) continue;
      const lat = toCoordLoose(geo.lat);
      const lon = toCoordLoose(geo.lon);
      if (lat === null || lon === null) continue;
      const name = typeof geo.name === "string" && geo.name.length > 0 ? geo.name : token;
      const stateName = typeof geo.address?.state === "string" ? geo.address.state : null;
      const label = stateName && !name.toLowerCase().includes(stateName.toLowerCase())
        ? `${name}, ${stateName}`
        : name;
      const match: IndiaMatch = {
        label: label.slice(0, 100),
        lat: Math.round(lat * 1000) / 1000,
        lon: Math.round(lon * 1000) / 1000,
      };
      cacheSetMatch(state, cacheKey, match);
      return match;
    }
    return null;
  } catch {
    // Nominatim unavailable or rate-limited: degrade honestly.
    return null;
  }
}
