import { describe, expect, it } from "vitest";
import {
  CPCB_BREAKPOINTS,
  MIN_POLLUTANTS_FOR_OVERALL,
  computeIndicativeIndiaAqi,
  isValidConcentration,
  subIndex,
  trailingWindowMean,
} from "@/lib/aqi/cpcb";
import { categoryForIndex, CPCB_CATEGORIES } from "@/lib/aqi/categories";

describe("CPCB category boundaries", () => {
  it("maps index values to the six official categories", () => {
    expect(categoryForIndex(0)?.key).toBe("good");
    expect(categoryForIndex(50)?.key).toBe("good");
    expect(categoryForIndex(51)?.key).toBe("satisfactory");
    expect(categoryForIndex(100)?.key).toBe("satisfactory");
    expect(categoryForIndex(101)?.key).toBe("moderate");
    expect(categoryForIndex(200)?.key).toBe("moderate");
    expect(categoryForIndex(201)?.key).toBe("poor");
    expect(categoryForIndex(300)?.key).toBe("poor");
    expect(categoryForIndex(301)?.key).toBe("very_poor");
    expect(categoryForIndex(400)?.key).toBe("very_poor");
    expect(categoryForIndex(401)?.key).toBe("severe");
    expect(categoryForIndex(500)?.key).toBe("severe");
  });

  it("clamps out-of-range indices instead of failing", () => {
    expect(categoryForIndex(-20)?.key).toBe("good");
    expect(categoryForIndex(9999)?.key).toBe("severe");
  });

  it("returns undefined for non-finite indices", () => {
    expect(categoryForIndex(Number.NaN)).toBeUndefined();
    expect(categoryForIndex(Infinity)).toBeUndefined();
  });

  it("defines six categories with contiguous ranges", () => {
    expect(CPCB_CATEGORIES).toHaveLength(6);
    for (let i = 1; i < CPCB_CATEGORIES.length; i++) {
      expect(CPCB_CATEGORIES[i].minIndex).toBe(
        CPCB_CATEGORIES[i - 1].maxIndex + 1
      );
    }
  });
});

describe("sub-index interpolation", () => {
  it("interpolates inside breakpoint bands (PM2.5 examples)", () => {
    // PM2.5 24h: 0-30 -> 0-50 ; 30-60 -> 51-100 ; 90-120 -> 201-300
    expect(subIndex(15, CPCB_BREAKPOINTS.pm25_24h)).toBe(25);
    expect(subIndex(45, CPCB_BREAKPOINTS.pm25_24h)).toBe(76); // 75.5 rounded
    expect(subIndex(120, CPCB_BREAKPOINTS.pm25_24h)).toBe(300);
  });

  it("returns boundary values at exact breakpoints", () => {
    expect(subIndex(0, CPCB_BREAKPOINTS.pm25_24h)).toBe(0);
    expect(subIndex(250, CPCB_BREAKPOINTS.pm25_24h)).toBe(400);
    expect(subIndex(500, CPCB_BREAKPOINTS.pm25_24h)).toBe(500);
  });

  it("rejects invalid concentrations", () => {
    expect(subIndex(-5, CPCB_BREAKPOINTS.pm25_24h)).toBeNull();
    expect(subIndex(Number.NaN, CPCB_BREAKPOINTS.pm25_24h)).toBeNull();
    expect(subIndex(Infinity, CPCB_BREAKPOINTS.pm25_24h)).toBeNull();
  });

  it("clamps beyond-scale concentrations to the top of the index", () => {
    // CPCB defines no index above 500; beyond-scale values map to the top.
    expect(subIndex(9999, CPCB_BREAKPOINTS.pm25_24h)).toBe(500);
  });

  it("validates concentrations strictly", () => {
    expect(isValidConcentration(0)).toBe(true);
    expect(isValidConcentration(12.5)).toBe(true);
    expect(isValidConcentration(-1)).toBe(false);
    expect(isValidConcentration(Number.NaN)).toBe(false);
    expect(isValidConcentration("120")).toBe(false);
    expect(isValidConcentration(null)).toBe(false);
  });
});

describe("trailing window means", () => {
  const series = [10, 20, 30, 40, 50, 60];

  it("computes the mean of the last N hours", () => {
    expect(trailingWindowMean(series, 3, 3)).toBe(50);
  });

  it("requires the minimum number of valid points", () => {
    expect(trailingWindowMean([10, null, null], 3, 3)).toBeNull();
    expect(trailingWindowMean([10, null, 30], 3, 2)).toBe(20);
  });

  it("ignores negative values as invalid data points", () => {
    expect(trailingWindowMean([10, -5, 30], 3, 2)).toBe(20);
  });

  it("treats non-finite values as invalid", () => {
    expect(
      trailingWindowMean([10, Number.NaN, Infinity, 40], 4, 2)
    ).toBe(25);
  });

  it("returns null for empty or invalid windows", () => {
    expect(trailingWindowMean([], 3, 1)).toBeNull();
    expect(trailingWindowMean(series, 0, 1)).toBeNull();
    expect(trailingWindowMean(series, -2, 1)).toBeNull();
  });
});

describe("indicative India AQI estimate", () => {
  const fullWindow = (v: number, hours = 24) =>
    Array.from({ length: hours }, () => v);

  it("computes the worst sub-index as the overall value", () => {
    // PM2.5 at 75 ug/m3 (24h) -> index ~125; NO2 at 20 ug/m3 -> 25;
    // SO2 at 10 ug/m3 -> 12.5 -> 13. Three pollutants incl. PM2.5:
    // eligibility is met, so an overall value is produced.
    const result = computeIndicativeIndiaAqi({
      pm25: { hourly: fullWindow(75) },
      no2: { hourly: fullWindow(20) },
      so2: { hourly: fullWindow(10) },
    });
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.value).toBeGreaterThan(100);
    expect(result.subIndices["PM2.5"]).toBeGreaterThan(100);
    expect(result.subIndices["NO2"]).toBe(25);
    expect(result.pollutantsIncluded).toContain("PM2.5");
    expect(result.pollutantsExcluded).toContain("O3");
  });

  it("applies CO unit conversion (ug/m3 input, mg/m3 breakpoints)", () => {
    // CO 2000 ug/m3 = 2 mg/m3 -> index 100 (boundary of 51-100 band).
    // CO alone is not eligible for an overall estimate, so the eligibility
    // inputs are added alongside it.
    const result = computeIndicativeIndiaAqi({
      co: { hourly: fullWindow(2000, 8) },
      pm25: { hourly: fullWindow(50) },
      pm10: { hourly: fullWindow(80) },
    });
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.subIndices["CO"]).toBe(100);
  });

  it("reports insufficient windows as excluded pollutants", () => {
    // Only 10 of 24 hours present: below the 18-hour threshold.
    const result = computeIndicativeIndiaAqi({
      pm25: { hourly: fullWindow(80, 10) },
    });
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") return;
    expect(result.pollutantsExcluded).toContain("PM2.5");
    expect(result.reason).toMatch(/insufficient/i);
  });

  it("rejects negative values inside windows", () => {
    const hourly = fullWindow(80, 24).map((v, i) => (i < 5 ? -1 : v));
    // 19 valid points remain -> still enough for a sub-index.
    const result = computeIndicativeIndiaAqi({
      pm25: { hourly },
      pm10: { hourly: fullWindow(90) },
      no2: { hourly: fullWindow(30) },
    });
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.pollutantsIncluded).toContain("PM2.5");
  });

  it("is unavailable when every window is missing or invalid", () => {
    const result = computeIndicativeIndiaAqi({
      pm25: { hourly: fullWindow(-1, 24) },
      pm10: { hourly: [] },
    });
    expect(result.status).toBe("unavailable");
  });

  it("uses the 8-hour window for ozone", () => {
    // O3 8h breakpoints: 100 ug/m3 -> 100. Eligibility inputs are added
    // because O3 alone cannot produce an overall estimate.
    const result = computeIndicativeIndiaAqi({
      o3: { hourly: fullWindow(100, 8) },
      pm25: { hourly: fullWindow(50) },
      pm10: { hourly: fullWindow(80) },
    });
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.subIndices["O3"]).toBe(100);
  });
});

describe("overall India AQI pollutant eligibility", () => {
  const fullWindow = (v: number, hours = 24) =>
    Array.from({ length: hours }, () => v);

  it("requires at least three pollutants (CPCB overall-AQI eligibility)", () => {
    expect(MIN_POLLUTANTS_FOR_OVERALL).toBe(3);
  });

  it("stays unavailable with only one pollutant, but still computes its sub-index", () => {
    const result = computeIndicativeIndiaAqi({
      co: { hourly: fullWindow(2000, 8) },
    });
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") return;
    // Sub-indexes are still computed and reported for valid pollutants.
    expect(result.subIndices["CO"]).toBe(100);
    expect(result.pollutantsIncluded).toEqual(["CO"]);
    expect(result.reason).toMatch(/at least 3 pollutants/i);
  });

  it("stays unavailable with two pollutants even when one is PM2.5", () => {
    const result = computeIndicativeIndiaAqi({
      pm25: { hourly: fullWindow(75) },
      no2: { hourly: fullWindow(20) },
    });
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") return;
    expect(Object.keys(result.subIndices).sort()).toEqual(["NO2", "PM2.5"]);
    expect(result.reason).toMatch(/at least 3 pollutants/i);
    expect(result.reason).toMatch(/PM2\.5, NO2/);
  });

  it("stays unavailable with three pollutants when neither PM2.5 nor PM10 is present", () => {
    const result = computeIndicativeIndiaAqi({
      no2: { hourly: fullWindow(20) },
      so2: { hourly: fullWindow(10) },
      o3: { hourly: fullWindow(100, 8) },
    });
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") return;
    expect(result.pollutantsIncluded).toEqual(["NO2", "SO2", "O3"]);
    expect(result.reason).toMatch(/PM2\.5 or PM10/i);
  });

  it("becomes available with three pollutants including PM10", () => {
    const result = computeIndicativeIndiaAqi({
      pm10: { hourly: fullWindow(80) },
      no2: { hourly: fullWindow(20) },
      so2: { hourly: fullWindow(10) },
    });
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.pollutantsIncluded).toContain("PM10");
    expect(result.value).toBeGreaterThan(0);
  });

  it("becomes available at the exact three-pollutant boundary with PM2.5", () => {
    const result = computeIndicativeIndiaAqi({
      pm25: { hourly: fullWindow(50) },
      no2: { hourly: fullWindow(20) },
      so2: { hourly: fullWindow(10) },
    });
    expect(result.status).toBe("available");
  });

  it("names the unmet condition in the unavailable reason", () => {
    const result = computeIndicativeIndiaAqi({
      no2: { hourly: fullWindow(20) },
      so2: { hourly: fullWindow(10) },
      o3: { hourly: fullWindow(100, 8) },
    });
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") return;
    expect(result.reason).toMatch(/raw concentrations/i);
  });
});
