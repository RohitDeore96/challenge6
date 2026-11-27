/**
 * Model-derived indicative India AQI estimate (CPCB-style breakpoints).
 *
 * WHAT THIS IS
 * - A deterministic, unit-tested module that applies CPCB National AQI
 *   breakpoints to pollutant concentrations derived from Open-Meteo/CAMS
 *   model data.
 *
 * WHAT THIS IS NOT (brief section 7.2)
 * - It is NOT the official CPCB AQI. The official index uses measured
 *   station data, official averaging periods (24-hour for most pollutants,
 *   8-hour maxima for CO and O3) and pollutant-specific sub-index rules.
 * - The result is always labelled "model-derived indicative India AQI
 *   estimate" in the UI, never "CPCB AQI".
 *
 * SOURCE: CPCB, "National Air Quality Index - Report of the Expert Group"
 * (CPCB/NAMP, Sept 2017) and CPCB "About AQI" documentation. Breakpoint
 * table last reviewed against those documents when this module was written;
 * see docs/DATA_METHODOLOGY.md for the review log.
 */

import { categoryForIndex } from "./categories";

/* ------------------------------------------------------------------ */
/* Breakpoint tables: [cLow, cHigh, iLow, iHigh]                        */
/* Units: ug/m3 unless stated otherwise. CO is mg/m3 per CPCB.          */
/* ------------------------------------------------------------------ */

type Breakpoint = readonly [number, number, number, number];

const PM25_24H: readonly Breakpoint[] = [
  [0, 30, 0, 50],
  [30, 60, 51, 100],
  [60, 90, 101, 200],
  [90, 120, 201, 300],
  [120, 250, 301, 400],
  [250, 500, 401, 500],
];

const PM10_24H: readonly Breakpoint[] = [
  [0, 50, 0, 50],
  [50, 100, 51, 100],
  [100, 250, 101, 200],
  [250, 350, 201, 300],
  [350, 430, 301, 400],
  [430, 600, 401, 500],
];

const NO2_24H: readonly Breakpoint[] = [
  [0, 40, 0, 50],
  [40, 80, 51, 100],
  [80, 180, 101, 200],
  [180, 280, 201, 300],
  [280, 400, 301, 400],
  [400, 600, 401, 500],
];

const SO2_24H: readonly Breakpoint[] = [
  [0, 40, 0, 50],
  [40, 80, 51, 100],
  [80, 380, 101, 200],
  [380, 800, 201, 300],
  [800, 1600, 301, 400],
  [1600, 2400, 401, 500],
];

const NH3_24H: readonly Breakpoint[] = [
  [0, 200, 0, 50],
  [200, 400, 51, 100],
  [400, 800, 101, 200],
  [800, 1200, 201, 300],
  [1200, 1800, 301, 400],
  [1800, 2400, 401, 500],
];

const CO_8H_MG: readonly Breakpoint[] = [
  [0, 1, 0, 50],
  [1, 2, 51, 100],
  [2, 10, 101, 200],
  [10, 17, 201, 300],
  [17, 34, 301, 400],
  [34, 50, 401, 500],
];

const O3_8H: readonly Breakpoint[] = [
  [0, 50, 0, 50],
  [50, 100, 51, 100],
  [100, 168, 101, 200],
  [168, 208, 201, 300],
  [208, 748, 301, 400],
  [748, 1000, 401, 500],
];

export const CPCB_BREAKPOINTS = {
  pm25_24h: PM25_24H,
  pm10_24h: PM10_24H,
  no2_24h: NO2_24H,
  so2_24h: SO2_24H,
  nh3_24h: NH3_24H,
  co_8h_mg: CO_8H_MG,
  o3_8h: O3_8H,
} as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** True only for a real, usable numeric concentration. */
export function isValidConcentration(v: unknown): v is number {
  return (
    typeof v === "number" &&
    Number.isFinite(v) &&
    v >= 0
  );
}

/**
 * CPCB-style sub-index via linear interpolation inside a breakpoint band.
 * Returns null when the concentration is invalid or outside the table.
 */
export function subIndex(
  concentration: number,
  table: readonly Breakpoint[]
): number | null {
  if (!isValidConcentration(concentration)) return null;
  const c = Math.min(concentration, table[table.length - 1][1]);
  for (const [cLow, cHigh, iLow, iHigh] of table) {
    if (c >= cLow && c <= cHigh) {
      if (cHigh === cLow) return iHigh;
      return Math.round(iLow + ((c - cLow) / (cHigh - cLow)) * (iHigh - iLow));
    }
  }
  return null;
}

/**
 * Trailing-window mean over an hourly series (oldest first).
 * A value counts only when it is a valid, finite, non-negative number.
 * Requires at least `minHours` valid points inside the window, otherwise
 * returns null (insufficient data -> no sub-index for that pollutant).
 */
export function trailingWindowMean(
  hourly: readonly (number | null | undefined)[],
  windowHours: number,
  minHours: number
): number | null {
  if (!Number.isFinite(windowHours) || windowHours <= 0) return null;
  const window = hourly.slice(-windowHours);
  const valid = window.filter((v) => isValidConcentration(v)) as number[];
  if (valid.length < minHours) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/* ------------------------------------------------------------------ */
/* Pollutant input for the indicative index                            */
/* ------------------------------------------------------------------ */

export interface PollutantWindow {
  /** Hourly values, oldest first. */
  hourly: readonly (number | null | undefined)[];
}

export interface IndicativeAqiInput {
  pm25?: PollutantWindow;
  pm10?: PollutantWindow;
  no2?: PollutantWindow;
  so2?: PollutantWindow;
  nh3?: PollutantWindow;
  /** Open-Meteo returns CO in ug/m3; CPCB breakpoints use mg/m3. */
  co?: PollutantWindow;
  o3?: PollutantWindow;
}

export interface IndicativeAqiAvailable {
  status: "available";
  value: number;
  categoryLabel: string;
  subIndices: Record<string, number>;
  pollutantsIncluded: string[];
  pollutantsExcluded: string[];
}

export interface IndicativeAqiUnavailable {
  status: "unavailable";
  subIndices: Record<string, number>;
  pollutantsIncluded: string[];
  pollutantsExcluded: string[];
  reason: string;
}

export type IndicativeAqiResult =
  | IndicativeAqiAvailable
  | IndicativeAqiUnavailable;

const AQI_MAX = 500;

/** Minimum valid hours required inside each averaging window. */
const MIN_24H = 18; // >= 75% of a 24-hour window
const MIN_8H = 6; // >= 75% of an 8-hour window

interface SpeciesDef {
  key: string;
  pollutantKey: string;
  table: readonly Breakpoint[];
  windowHours: number;
  minHours: number;
  /** Input series is ug/m3 but breakpoints are mg/m3 (CO only). */
  divideBy1000?: boolean;
}

const SPECIES: readonly SpeciesDef[] = [
  { key: "pm25", pollutantKey: "PM2.5", table: PM25_24H, windowHours: 24, minHours: MIN_24H },
  { key: "pm10", pollutantKey: "PM10", table: PM10_24H, windowHours: 24, minHours: MIN_24H },
  { key: "no2", pollutantKey: "NO2", table: NO2_24H, windowHours: 24, minHours: MIN_24H },
  { key: "so2", pollutantKey: "SO2", table: SO2_24H, windowHours: 24, minHours: MIN_24H },
  { key: "nh3", pollutantKey: "NH3", table: NH3_24H, windowHours: 24, minHours: MIN_24H },
  { key: "co", pollutantKey: "CO", table: CO_8H_MG, windowHours: 8, minHours: MIN_8H, divideBy1000: true },
  { key: "o3", pollutantKey: "O3", table: O3_8H, windowHours: 8, minHours: MIN_8H },
];

/**
 * Compute the model-derived indicative India AQI estimate.
 *
 * Rules implemented (brief section 7.2):
 * 1. A sub-index is produced only when the required averaging window has
 *    enough valid data (>=75% of hours).
 * 2. Missing pollutants are reported as excluded, never silently dropped.
 * 3. If no pollutant yields a sub-index, the result is "unavailable" and
 *    callers must show raw concentrations instead of an index value.
 * 4. The overall value is the worst (maximum) available sub-index,
 *    mirroring CPCB's "worst pollutant defines the AQI" rule.
 */
export function computeIndicativeIndiaAqi(
  input: IndicativeAqiInput
): IndicativeAqiResult {
  const subIndices: Record<string, number> = {};
  const included: string[] = [];
  const excluded: string[] = [];

  for (const species of SPECIES) {
    const window = input[species.key]?.hourly;
    if (!window || window.length === 0) {
      excluded.push(species.pollutantKey);
      continue;
    }
    const mean = trailingWindowMean(
      window,
      species.windowHours,
      species.minHours
    );
    if (mean === null) {
      excluded.push(species.pollutantKey);
      continue;
    }
    const concentration = species.divideBy1000 ? mean / 1000 : mean;
    const idx = subIndex(concentration, species.table);
    if (idx === null) {
      excluded.push(species.pollutantKey);
      continue;
    }
    subIndices[species.pollutantKey] = idx;
    included.push(species.pollutantKey);
  }

  const values = Object.values(subIndices);
  if (values.length === 0) {
    return {
      status: "unavailable",
      subIndices,
      pollutantsIncluded: included,
      pollutantsExcluded: excluded,
      reason:
        "Insufficient valid model data to compute any pollutant sub-index. Raw concentrations are shown instead of an index value.",
    };
  }

  const worst = Math.min(AQI_MAX, Math.max(...values));
  const category = categoryForIndex(worst);

  return {
    status: "available",
    value: worst,
    categoryLabel: category ? category.label : "Unknown",
    subIndices,
    pollutantsIncluded: included,
    pollutantsExcluded: excluded,
  };
}
