import type {
  AirQualitySuccess,
  HouseholdProfile,
  LocationInput,
} from "@/lib/schemas";

/** Deterministic test helpers shared across suites. */

export const TEST_LOCATION: LocationInput = { lat: 28.61, lon: 77.21, label: "Delhi" };

export function makeProfile(overrides: Partial<HouseholdProfile> = {}): HouseholdProfile {
  return {
    routine: "commute",
    commuteMode: "car",
    oneWayDistanceKm: 10,
    budget: "under_500",
    cookingFuel: "lpg",
    indoorSources: ["incense"],
    hasPurifier: "no",
    sensitiveMember: "no",
    scheduleFlexibility: "flexible",
    ...overrides,
  };
}

export function makeAir(overrides: Partial<AirQualitySuccess> = {}): AirQualitySuccess {
  const pm25Series = Array.from({ length: 30 }, () => 110);
  return {
    ok: true,
    location: {
      lat: 28.61,
      lon: 77.21,
      label: "Delhi",
      gridNote: "test grid",
    },
    source: {
      provider: "Open-Meteo Air Quality API",
      model: "CAMService global atmospheric composition forecast (area-level model data)",
      dataType: "modelled area-level forecast",
      docsUrl: "https://open-meteo.com/en/docs/air-quality-api",
    },
    fetchedAt: "2026-11-27T12:00:00Z",
    freshness: { status: "fresh", ageMinutes: 5, stalenessNote: "test" },
    current: { time: "2026-11-27T12:00", pm25: 112, pm10: 121, usAqi: 190 },
    derivedIndiaAqi: {
      status: "available",
      value: 173,
      category: "Moderately polluted",
      subIndices: { "PM2.5": 173 },
      pollutantsIncluded: ["PM2.5"],
      pollutantsExcluded: ["PM10"],
      label: "model-derived indicative India AQI estimate",
      note: "test",
    },
    hourly: pm25Series.map((v, i) => ({
      time: new Date(Date.parse("2026-11-27T12:00") + (i + 1) * 3600_000)
        .toISOString()
        .slice(0, 16),
      pm25: v,
      pm10: v + 10,
    })),
    caveats: ["test caveat"],
    ...overrides,
  };
}
