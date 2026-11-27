import { describe, expect, it } from "vitest";
import { findBetterWindow, DEFAULT_WINDOW_OPTIONS } from "@/lib/planner/window";
import type { HourlyPoint } from "@/lib/schemas";

function hour(iso: string): string {
  return iso;
}

function series(values: [number, number][]): HourlyPoint[] {
  return values.map(([offsetH, pm25]) => ({
    time: hour(
      new Date(Date.parse("2026-11-27T12:00") + offsetH * 3600_000)
        .toISOString()
        .slice(0, 16)
    ),
    pm25: offsetH === 0 ? null : pm25,
    pm10: null,
  }));
}

const NOW = "2026-11-27T12:00";

describe("findBetterWindow", () => {
  it("finds a substantially cleaner window", () => {
    const points = series([
      [1, 120],
      [2, 130],
      [3, 60],
      [4, 62],
      [5, 118],
      [6, 120],
    ]);
    const result = findBetterWindow(points, NOW);
    expect(result.found).toBe(true);
    expect(result.windowMeanPm25).toBe(61);
    expect(result.comparisonMeanPm25).toBe(125);
    expect(result.improvementPercent).toBeGreaterThanOrEqual(
      DEFAULT_WINDOW_OPTIONS.minImprovementPercent
    );
    expect(result.note).toMatch(/not a guarantee/i);
  });

  it("refuses to recommend when differences are small", () => {
    const points = series([
      [1, 120],
      [2, 120],
      [3, 105],
      [4, 108],
      [5, 118],
    ]);
    const result = findBetterWindow(points, NOW);
    expect(result.found).toBe(false);
    expect(result.note).toMatch(/too small/i);
  });

  it("does not look for windows when levels are already low", () => {
    const points = series([
      [1, 30],
      [2, 32],
      [3, 10],
      [4, 12],
    ]);
    const result = findBetterWindow(points, NOW);
    expect(result.found).toBe(false);
    expect(result.note).toMatch(/already relatively low/i);
  });

  it("handles missing hourly data honestly", () => {
    const result = findBetterWindow([], NOW);
    expect(result.found).toBe(false);
    expect(result.note).toMatch(/not enough/i);
  });

  it("skips invalid (null/negative) values when selecting the window", () => {
    const points: HourlyPoint[] = [
      { time: "2026-11-27T13:00", pm25: 120, pm10: null },
      { time: "2026-11-27T14:00", pm25: null, pm10: null },
      { time: "2026-11-27T15:00", pm25: -3, pm10: null },
      { time: "2026-11-27T16:00", pm25: 58, pm10: null },
      { time: "2026-11-27T17:00", pm25: 60, pm10: null },
      { time: "2026-11-27T18:00", pm25: 115, pm10: null },
    ];
    const result = findBetterWindow(points, NOW);
    expect(result.found).toBe(true);
    expect(result.windowMeanPm25).toBe(59);
  });

  it("ignores an invalid reference time", () => {
    const result = findBetterWindow(series([[1, 120]]), "not-a-date");
    expect(result.found).toBe(false);
    expect(result.note).toMatch(/reference time/i);
  });

  it("only looks within the configured forecast horizon", () => {
    const points = series([
      [1, 120],
      [2, 120],
      [30, 20], // beyond the 24h horizon
      [31, 20],
    ]);
    const result = findBetterWindow(points, NOW);
    expect(result.found).toBe(false);
  });
});
