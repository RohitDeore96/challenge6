import { describe, expect, it } from "vitest";
import {
  DEFAULT_CARPOOL_OCCUPANCY,
  estimateModeShift,
  commuteModeLabel,
} from "@/lib/impact/emissions";

describe("emission impact estimates", () => {
  it("computes car -> metro shift with documented factors", () => {
    const result = estimateModeShift({
      baselineMode: "car",
      alternativeMode: "metro",
      distanceKm: 10,
      tripsPerDay: 2,
    });
    // 10 km * (0.17016 - 0.03318) * 1 * 2 = 2.7396 -> 2.74
    expect(result.kgCo2eAvoidedPerDay).toBeCloseTo(2.74, 2);
    expect(result.source?.url).toContain("gov.uk");
    expect(result.unit).toBe("kg CO2e/day");
  });

  it("applies the occupancy adjustment for carpool alternatives", () => {
    const result = estimateModeShift({
      baselineMode: "car",
      alternativeMode: "carpool",
      distanceKm: 10,
      occupancy: 4,
      tripsPerDay: 1,
    });
    // One-way shift: 10 * (0.17016-0.17016... wait carpool factor same as car
    // For carpool alternative the factor is divided by occupancy: same factor,
    // per-person share = 0.17016/4.
    // baseline car per vehicle-km (person drives alone) vs carpool per-person:
    // 10 * (0.17016 - 0.17016/4) * 1 = 1.2762
    expect(result.kgCo2eAvoidedPerDay).toBeCloseTo(1.28, 1);
  });

  it("returns no numeric estimate when distance is missing", () => {
    const result = estimateModeShift({
      baselineMode: "car",
      alternativeMode: "metro",
      distanceKm: null,
    });
    expect(result.kgCo2eAvoidedPerDay).toBeNull();
    expect(result.source).toBeNull();
  });

  it("returns no numeric estimate when a factor is missing", () => {
    const result = estimateModeShift({
      baselineMode: "none",
      alternativeMode: "metro",
      distanceKm: 10,
    });
    expect(result.kgCo2eAvoidedPerDay).toBeNull();
  });

  it("never claims savings for a shift that is not lower-emitting", () => {
    // Car -> carpool with no occupancy info still divides by default occupancy.
    // A same-mode shift (car -> car) must produce no numeric claim.
    const result = estimateModeShift({
      baselineMode: "car",
      alternativeMode: "car",
      distanceKm: 10,
    });
    expect(result.kgCo2eAvoidedPerDay).toBeNull();
  });

  it("treats walking and cycling as zero-direct-emission modes", () => {
    const result = estimateModeShift({
      baselineMode: "two_wheeler",
      alternativeMode: "cycle",
      distanceKm: 4,
      tripsPerDay: 2,
    });
    // 4 km * (0.10311 - 0) * 2 = 0.82488 -> 0.82
    expect(result.kgCo2eAvoidedPerDay).toBeCloseTo(0.82, 2);
  });

  it("rounds the estimate to two decimals", () => {
    const result = estimateModeShift({
      baselineMode: "bus",
      alternativeMode: "metro",
      distanceKm: 7.5,
      tripsPerDay: 2,
    });
    const raw =
      7.5 * (0.10186 - 0.03318) * 2;
    expect(result.kgCo2eAvoidedPerDay).toBe(
      Math.round(raw * 100) / 100
    );
  });

  it("uses the documented default occupancy for carpools", () => {
    expect(DEFAULT_CARPOOL_OCCUPANCY).toBe(3);
  });

  it("clamps extreme distances and trip counts", () => {
    const result = estimateModeShift({
      baselineMode: "car",
      alternativeMode: "metro",
      distanceKm: 5000,
      tripsPerDay: 50,
    });
    // distance clamped to 150 km, trips clamped to 6
    const raw = 150 * (0.17016 - 0.03318) * 6;
    expect(result.kgCo2eAvoidedPerDay).toBe(Math.round(raw * 100) / 100);
  });

  it("labels commute modes for UI copy", () => {
    expect(commuteModeLabel("two_wheeler")).toBe("two-wheeler");
    expect(commuteModeLabel("none")).toBe("no regular commute");
  });
});
