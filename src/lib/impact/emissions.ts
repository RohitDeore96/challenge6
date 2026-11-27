/**
 * Travel emission impact estimates.
 *
 * Formula (brief section 6.6):
 *   estimated CO2e avoided (kg) =
 *     distance_km x (baseline_mode_factor - alternative_mode_factor)
 *     x occupancy_adjustment
 *
 * RULES
 * - Every factor below carries a named public source and year. If a needed
 *   factor or the trip distance is missing, the module returns NO numeric
 *   impact (null) and callers show a qualitative description instead.
 *   Numbers are never invented (brief section 2: "Rules calculate").
 * - Factors are indicative public defaults, not India-specific certified
 *   values unless stated. They are documented in docs/IMPACT_METHODOLOGY.md
 *   and reviewed there.
 * - One person's commute choice never "lowers the city's AQI"; the UI copy
 *   for this impact type always says the estimate applies to the trip, not
 *   to ambient air quality.
 */

import type { CommuteMode } from "@/lib/schemas";

export interface EmissionFactor {
  /** kg CO2e per passenger-km (or per vehicle-km when perVehicle=true). */
  kgCo2ePerKm: number;
  source: {
    name: string;
    url: string;
    year: number;
  };
  note: string;
  perVehicle?: boolean;
}

/**
 * Indicative passenger transport factors.
 * Source: UK DEFRA/BEIS Greenhouse Gas reporting conversion factors 2024
 * (public). These are widely used indicative defaults; they are NOT
 * India-measured values, and the UI labels every numeric impact as an
 * indicative estimate. Walking and cycling are zero direct-emission modes.
 */
const FACTORS: Partial<Record<CommuteMode, EmissionFactor>> = {
  car: {
    kgCo2ePerKm: 0.17016,
    perVehicle: true,
    source: {
      name: "UK DEFRA/BEIS GHG conversion factors 2024 - average car (unknown fuel)",
      url: "https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting",
      year: 2024,
    },
    note: "Per vehicle-km, average petrol/diesel mix, single vehicle.",
  },
  carpool: {
    kgCo2ePerKm: 0.17016,
    perVehicle: true,
    source: {
      name: "UK DEFRA/BEIS GHG conversion factors 2024 - average car (unknown fuel)",
      url: "https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting",
      year: 2024,
    },
    note: "Same car factor; per-person share is applied via occupancy.",
  },
  two_wheeler: {
    kgCo2ePerKm: 0.10311,
    perVehicle: true,
    source: {
      name: "UK DEFRA/BEIS GHG conversion factors 2024 - average motorcycle",
      url: "https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting",
      year: 2024,
    },
    note: "Per vehicle-km, average motorcycle.",
  },
  bus: {
    kgCo2ePerKm: 0.10186,
    source: {
      name: "UK DEFRA/BEIS GHG conversion factors 2024 - local bus",
      url: "https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting",
      year: 2024,
    },
    note: "Per passenger-km, average local bus.",
  },
  metro: {
    kgCo2ePerKm: 0.03318,
    source: {
      name: "UK DEFRA/BEIS GHG conversion factors 2024 - national rail (used as nearest published proxy for electric urban rail)",
      url: "https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting",
      year: 2024,
    },
    note: "Per passenger-km; proxy factor - metro supply mix varies by city.",
  },
  walk: {
    kgCo2ePerKm: 0,
    source: {
      name: "Direct-emission-free mode (no fuel combustion)",
      url: "https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication",
      year: 2021,
    },
    note: "No tailpipe emissions. Exposure safety is assessed separately.",
  },
  cycle: {
    kgCo2ePerKm: 0,
    source: {
      name: "Direct-emission-free mode (no fuel combustion)",
      url: "https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication",
      year: 2021,
    },
    note: "No tailpipe emissions. Exposure safety is assessed separately.",
  },
};

/** Occupancy adjustment for shared car trips (carpool occupants). */
export const DEFAULT_CARPOOL_OCCUPANCY = 3;

export interface ModeShiftImpactInput {
  /** Baseline mode the household currently uses. */
  baselineMode: CommuteMode;
  /** Alternative low-emission mode being considered. */
  alternativeMode: CommuteMode;
  /** One-way trip distance in km (user-provided or undefined). */
  distanceKm?: number | null;
  /** Number of occupants sharing the vehicle for the alternative. */
  occupancy?: number;
  /** Round trips per day this shift applies to (default 2). */
  tripsPerDay?: number;
}

export interface ModeShiftImpact {
  /** kg CO2e avoided per day for the described trips. Null when not computable. */
  kgCo2eAvoidedPerDay: number | null;
  unit: string;
  formula: string;
  assumptions: string[];
  source: { name: string; url: string; year: number } | null;
}

function factorFor(mode: CommuteMode): EmissionFactor | null {
  const f = FACTORS[mode];
  return f ?? null;
}

/**
 * Compute the estimated CO2e avoided per day for a mode shift.
 * Returns kgCo2eAvoidedPerDay = null whenever a required input (distance,
 * baseline factor) is missing, so callers can fall back to qualitative copy.
 */
export function estimateModeShift(
  input: ModeShiftImpactInput
): ModeShiftImpact {
  const baseline = factorFor(input.baselineMode);
  const alternative = factorFor(input.alternativeMode);
  const tripsPerDay =
    typeof input.tripsPerDay === "number" && input.tripsPerDay > 0
      ? Math.min(6, input.tripsPerDay)
      : 2;

  const assumptions: string[] = [
    "Indicative public emission factors, not India-certified measured values.",
    "Direct tailpipe CO2e only; no upstream fuel/electricity production included.",
    `Assumes ${tripsPerDay} one-way trips per day for this mode shift.`,
  ];

  const hasDistance =
    typeof input.distanceKm === "number" &&
    Number.isFinite(input.distanceKm) &&
    input.distanceKm > 0;

  if (!baseline || !alternative || !hasDistance) {
    return {
      kgCo2eAvoidedPerDay: null,
      unit: "kg CO2e/day",
      formula:
        "distance_km x (baseline_per_person_factor - alternative_per_person_factor) x trips_per_day",
      assumptions,
      source: null,
    };
  }

  const distance = Math.min(input.distanceKm as number, 150);

  /**
   * Per-person comparison (occupancy adjustment):
   * - "car" baseline assumes the driver rides alone, so per-person = factor.
   * - A carpool baseline/alternative divides the vehicle factor by occupants,
   *   so per-person = factor / occupancy.
   * - Public-transport and active modes are already per-passenger factors.
   */
  const sharedOccupants = Math.max(
    1,
    Math.min(6, input.occupancy ?? DEFAULT_CARPOOL_OCCUPANCY)
  );
  function perPersonFactor(
    mode: CommuteMode,
    factor: EmissionFactor
  ): number {
    if (mode === "carpool") return factor.kgCo2ePerKm / sharedOccupants;
    return factor.kgCo2ePerKm;
  }

  const baselinePerKm = perPersonFactor(input.baselineMode, baseline);
  const alternativePerKm = perPersonFactor(input.alternativeMode, alternative);

  const perKm = baselinePerKm - alternativePerKm;
  if (perKm <= 0) {
    // Alternative is not lower-emitting than baseline: no numeric claim.
    return {
      kgCo2eAvoidedPerDay: null,
      unit: "kg CO2e/day",
      formula:
        "distance_km x (baseline_per_person_factor - alternative_per_person_factor) x trips_per_day",
      assumptions,
      source: null,
    };
  }

  const kg = distance * perKm * tripsPerDay;

  const firstSource = alternative.source;
  return {
    kgCo2eAvoidedPerDay: Math.round(kg * 100) / 100,
    unit: "kg CO2e/day",
    formula: `distance_km x (baseline ${baselinePerKm.toFixed(4)} - alternative ${alternativePerKm.toFixed(4)} kg CO2e per person-km) x ${tripsPerDay} trips${input.alternativeMode === "carpool" ? ` (carpool: vehicle factor / ${sharedOccupants} occupants)` : ""}`,
    assumptions,
    source: {
      name: firstSource.name,
      url: firstSource.url,
      year: firstSource.year,
    },
  };
}

/** Human-readable label for a commute mode (also used in UI copy). */
export function commuteModeLabel(mode: CommuteMode): string {
  const labels: Record<CommuteMode, string> = {
    walk: "walking",
    cycle: "cycling",
    two_wheeler: "two-wheeler",
    car: "car",
    carpool: "shared car / carpool",
    bus: "bus",
    metro: "metro or train",
    none: "no regular commute",
  };
  return labels[mode];
}
