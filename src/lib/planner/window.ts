/**
 * Hourly "potentially better window" analysis (brief section 6.7).
 *
 * Deterministic and conservative by design:
 * - Compares forecast hours of the SAME pollutant (PM2.5) from the SAME
 *   provider series only.
 * - Requires a minimum relative AND absolute improvement before calling a
 *   window "potentially better".
 * - If the difference is small or data is missing, returns found=false with
 *   an honest note ("No clearly better window found").
 * - A lower forecast concentration is NEVER a guarantee of safe air; the
 *   returned note always carries that caveat.
 */

import type { BetterWindow, HourlyPoint } from "@/lib/schemas";

export interface WindowOptions {
  /** Minimum relative improvement of window mean vs the next-hours mean. */
  minImprovementPercent: number;
  /** Minimum absolute improvement in ug/m3 required. */
  minImprovementUg: number;
  /** Contiguous window length in hours. */
  windowHours: number;
  /** Only look this many hours into the forecast. */
  maxForecastHours: number;
  /** Above this next-hours PM2.5 mean, "already clean" shortcut is off. */
  alreadyCleanThresholdUg: number;
}

export const DEFAULT_WINDOW_OPTIONS: WindowOptions = {
  minImprovementPercent: 30,
  minImprovementUg: 20,
  windowHours: 2,
  maxForecastHours: 24,
  alreadyCleanThresholdUg: 35,
};

function validPm25(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function mean(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Find a potentially better low-PM2.5 window in the next hours.
 * `nowIso` should be an ISO timestamp in the same time basis as the series.
 */
export function findBetterWindow(
  hourly: readonly HourlyPoint[],
  nowIso: string,
  options: WindowOptions = DEFAULT_WINDOW_OPTIONS
): BetterWindow {
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(nowMs)) {
    return { found: false, note: "Hourly data had no valid reference time." };
  }

  const horizonEndMs = nowMs + options.maxForecastHours * 3600_000;
  const future = hourly
    .filter((p) => {
      const t = Date.parse(p.time);
      return t > nowMs && t <= horizonEndMs;
    })
    .filter((p) => validPm25(p.pm25));

  const baselineHours = future.slice(0, 2).map((p) => p.pm25 as number);
  if (future.length < options.windowHours || baselineHours.length === 0) {
    return {
      found: false,
      note: "Not enough valid hourly forecast data to identify a better window.",
    };
  }

  const currentMean = mean(baselineHours);
  if (currentMean <= options.alreadyCleanThresholdUg) {
    return {
      found: false,
      note:
        "Forecast levels in the next hours are already relatively low; no clearly better window worth planning around.",
    };
  }

  let best: { start: string; end: string; meanValue: number } | null = null;
  for (let i = 0; i + options.windowHours <= future.length; i++) {
    const slice = future.slice(i, i + options.windowHours);
    const values = slice.map((p) => p.pm25 as number);
    const m = mean(values);
    if (!Number.isFinite(m)) continue;
    if (!best || m < best.meanValue) {
      best = {
        start: slice[0].time,
        end: slice[slice.length - 1].time,
        meanValue: m,
      };
    }
  }

  if (!best) {
    return {
      found: false,
      note: "No clearly better window found in the available forecast.",
    };
  }

  const improvementPercent =
    ((currentMean - best.meanValue) / currentMean) * 100;
  const improvementUg = currentMean - best.meanValue;

  const goodEnough =
    improvementPercent >= options.minImprovementPercent &&
    improvementUg >= options.minImprovementUg;

  if (!goodEnough) {
    return {
      found: false,
      note:
        "No clearly better window found: forecast differences are too small to plan around.",
    };
  }

  return {
    found: true,
    startIso: best.start,
    endIso: best.end,
    windowMeanPm25: Math.round(best.meanValue * 10) / 10,
    comparisonMeanPm25: Math.round(currentMean * 10) / 10,
    improvementPercent: Math.round(improvementPercent),
    note:
      "Potentially better window for outdoor activity, based on the same PM2.5 forecast series. A lower forecast is not a guarantee of safe air; conditions can vary by street and indoors.",
  };
}
