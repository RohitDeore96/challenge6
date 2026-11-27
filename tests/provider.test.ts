import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAirQuality } from "@/lib/providers/openMeteo";
import { makeOpenMeteoResponse } from "./fixtures/openMeteoResponse";
import { TEST_LOCATION } from "./helpers";

const LOCATION = TEST_LOCATION;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Open-Meteo adapter - success paths", () => {
  it("normalises a valid provider response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(makeOpenMeteoResponse()))
    );
    const result = await fetchAirQuality(LOCATION, {
      now: new Date("2026-11-27T09:20"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.current.pm25).toBe(112);
    expect(result.source.dataType).toBe("modelled area-level forecast");
    expect(result.freshness.status).toBe("fresh");
    expect(result.hourly.length).toBeGreaterThan(40);
  });

  it("derives an indicative India AQI with coverage metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(makeOpenMeteoResponse()))
    );
    const result = await fetchAirQuality(LOCATION);
    if (!result.ok) throw new Error("expected ok");
    expect(result.derivedIndiaAqi.status).toBe("available");
    expect(result.derivedIndiaAqi.label).toBe(
      "model-derived indicative India AQI estimate"
    );
    expect(result.derivedIndiaAqi.pollutantsIncluded.length).toBeGreaterThan(0);
    expect(result.derivedIndiaAqi.note).toMatch(/NOT an official CPCB AQI/i);
  });

  it("marks provider data older than the staleness threshold as stale", async () => {
    const stale = makeOpenMeteoResponse();
    stale.current.time = "2026-11-25T09:00";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(stale))
    );
    const result = await fetchAirQuality(LOCATION, {
      now: new Date("2026-11-27T09:30"),
    });
    if (!result.ok) throw new Error("expected ok");
    expect(result.freshness.status).toBe("stale");
    expect(result.freshness.stalenessNote).toMatch(/stale/i);
  });
});

describe("Open-Meteo adapter - failure honesty", () => {
  it("reports provider timeouts without faking data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        const err = new Error("The operation was aborted due to timeout");
        err.name = "TimeoutError";
        return Promise.reject(err);
      })
    );
    const result = await fetchAirQuality(LOCATION);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("provider_timeout");
    expect(result.error.message).toMatch(/temporarily unavailable/i);
  });

  it("reports network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connect ECONNREFUSED");
      })
    );
    const result = await fetchAirQuality(LOCATION);
    if (result.ok) throw new Error("expected failure");
    expect(result.error.code).toBe("provider_error");
  });

  it("reports HTTP error statuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: true }, 503))
    );
    const result = await fetchAirQuality(LOCATION);
    if (result.ok) throw new Error("expected failure");
    expect(result.error.code).toBe("provider_error");
    expect(result.error.message).toContain("503");
  });

  it("rejects malformed JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html>oops</html>", {
            status: 200,
            headers: { "Content-Type": "text/html" },
          })
      )
    );
    const result = await fetchAirQuality(LOCATION);
    if (result.ok) throw new Error("expected failure");
    expect(result.error.code).toBe("invalid_response");
  });

  it("rejects structurally incomplete responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ latitude: 28.6 }))
    );
    const result = await fetchAirQuality(LOCATION);
    if (result.ok) throw new Error("expected failure");
    expect(result.error.code).toBe("invalid_response");
  });

  it("keeps missing pollutants as null instead of inventing values", async () => {
    const partial = makeOpenMeteoResponse();
    partial.current.pm2_5 = null;
    partial.current.us_aqi = null;
    partial.hourly.pm2_5 = partial.hourly.pm2_5.map(() => null);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(partial))
    );
    const result = await fetchAirQuality(LOCATION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.current.pm25).toBeNull();
    expect(result.current.usAqi).toBeNull();
    // With no PM2.5 series the indicative estimate must be honest about it.
    expect(result.derivedIndiaAqi.pollutantsExcluded).toContain("PM2.5");
  });
});
