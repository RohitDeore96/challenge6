import { describe, expect, it, vi } from "vitest";
import { resolveQuestionLocations } from "@/lib/ai/question-locations";

/** Unit tests: real places from user questions, no invented locations. */

const HOME = { label: "Pune", lat: 18.5204, lon: 73.8567 };

function geocoderJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("question location resolution", () => {
  it("finds cities from the curated list without any network call", async () => {
    const fetchImpl = vi.fn();
    const found = await resolveQuestionLocations(
      "what is the mumbai aqi right now",
      HOME,
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(found).toEqual([
      {
        label: "Mumbai, Maharashtra",
        lat: 19.076,
        lon: 72.8777,
        source: "city_list",
        relation: "other",
      },
    ]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("marks a mention of the selected location as home", async () => {
    const fetchImpl = vi.fn();
    const found = await resolveQuestionLocations(
      "how is the air in pune today",
      HOME,
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(found).toEqual([
      {
        label: "Pune, Maharashtra",
        lat: 18.5204,
        lon: 73.8567,
        source: "city_list",
        relation: "home",
      },
    ]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("falls back to the geocoder for neighbourhood names such as Warje", async () => {
    const fetchImpl = vi.fn(async () =>
      geocoderJson({
        results: [
          {
            name: "Warje",
            latitude: 18.4626,
            longitude: 73.7949,
            country_code: "IN",
            admin1: "Maharashtra",
          },
        ],
      })
    );
    const found = await resolveQuestionLocations(
      "what is warje aqi in pune",
      HOME,
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(found).toEqual([
      {
        label: "Pune, Maharashtra",
        lat: 18.5204,
        lon: 73.8567,
        source: "city_list",
        relation: "home",
      },
      {
        label: "Warje, Maharashtra",
        lat: 18.46,
        lon: 73.79,
        source: "geocoder",
        relation: "other",
      },
    ]);
  });

  it("ignores geocoder hits outside India and unmatched tokens", async () => {
    const fetchImpl = vi.fn(async () =>
      geocoderJson({
        results: [
          {
            name: "Nowhereville",
            latitude: 40.7,
            longitude: -74.0,
            country_code: "US",
            admin1: "New York",
          },
        ],
      })
    );
    const found = await resolveQuestionLocations(
      "why is walking excluded for my commute",
      HOME,
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(found).toEqual([]);
  });

  it("caps resolution at two places", async () => {
    const fetchImpl = vi.fn();
    const found = await resolveQuestionLocations(
      "compare mumbai delhi chennai aqi today",
      HOME,
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(found).toHaveLength(2);
    expect(found.map((f) => f.label)).toEqual([
      "Mumbai, Maharashtra",
      "Delhi, Delhi",
    ]);
  });

  it("returns nothing for questions without plausible place tokens", async () => {
    const fetchImpl = vi.fn();
    const found = await resolveQuestionLocations(
      "why? how? what should we do",
      HOME,
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(found).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
