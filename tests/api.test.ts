import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as airGET } from "@/app/api/air-quality/route";
import { POST as assistantPOST } from "@/app/api/assistant/route";
import { resetRateLimits } from "@/lib/rate-limit";
import { cacheClear } from "@/lib/cache";
import { makeOpenMeteoResponse } from "./fixtures/openMeteoResponse";
import { makeProfile, TEST_LOCATION } from "./helpers";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function airRequest(query: string): Request {
  return new Request(`http://localhost:3000/api/air-quality?${query}`);
}

function assistantRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  location: TEST_LOCATION,
  profile: makeProfile(),
};

beforeEach(() => {
  resetRateLimits();
  cacheClear();
  // Assistant tests run without a Gemini key unless one is stubbed.
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/air-quality", () => {
  it("validates input parameters", async () => {
    const res = await airGET(airRequest("lat=999&lon=10"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_input");
  });

  it("requires both lat and lon", async () => {
    const res = await airGET(airRequest("lat=28.61"));
    expect(res.status).toBe(400);
  });

  it("returns live normalised data on provider success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(makeOpenMeteoResponse()))
    );
    const res = await airGET(
      airRequest("lat=28.61&lon=77.21&label=Delhi")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.location.label).toBe("Delhi");
    expect(body.derivedIndiaAqi.label).toBe(
      "model-derived indicative India AQI estimate"
    );
  });

  it("serves repeated requests from cache without extra provider calls", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(makeOpenMeteoResponse()));
    vi.stubGlobal("fetch", fetchMock);
    await airGET(airRequest("lat=28.61&lon=77.21&label=Delhi"));
    await airGET(airRequest("lat=28.61&lon=77.21&label=Delhi"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an honest failure payload when the provider is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, 503))
    );
    const res = await airGET(airRequest("lat=28.61&lon=77.21&label=Delhi"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("provider_error");
    expect(body.error.message).toMatch(/unavailable|status 503/i);
  });

  it("rate-limits abusive clients", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(makeOpenMeteoResponse()))
    );
    const req = airRequest("lat=28.61&lon=77.21&label=Delhi");
    let last: Response | null = null;
    for (let i = 0; i < 35; i++) {
      last = await airGET(req);
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("POST /api/assistant", () => {
  it("rejects malformed bodies", async () => {
    const res = await assistantPOST(
      new Request("http://localhost:3000/api/assistant", {
        method: "POST",
        body: "not json",
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid profiles with actionable issues", async () => {
    const res = await assistantPOST(
      assistantRequest({
        location: TEST_LOCATION,
        profile: { ...makeProfile(), routine: "party_all_night" },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("returns the deterministic plan plus an honest AI state without a key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(makeOpenMeteoResponse()))
    );
    const res = await assistantPOST(assistantRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan.pillars.breathe).toBeDefined();
    expect(body.plan.pillars.indoor).toBeDefined();
    expect(body.plan.pillars.emission).toBeDefined();
    // The AI briefing is generated with every plan; without a key it
    // degrades to the honest unavailable state.
    expect(body.ai.status).toBe("unavailable");
    expect(body.ai.reason).toBe("key_not_configured");
    expect(body.queriedLocations).toBeUndefined();
  });

  it("reports an honest unavailable AI state when a question is asked without a key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(makeOpenMeteoResponse()))
    );
    const res = await assistantPOST(
      assistantRequest({ ...VALID_BODY, question: "Why is walking excluded?" })
    );
    const body = await res.json();
    expect(body.ai.status).toBe("unavailable");
    expect(body.ai.reason).toBe("key_not_configured");
    expect(body.plan).toBeDefined();
  });

  it("skips AI-only question lookups when no Gemini key is configured", async () => {
    // Geocoding a named place + fetching its live data is AI-only work:
    // without a server-side key it can never contribute to a useful AI
    // answer, so the route must skip it (single provider fetch for home).
    const fetchMock = vi.fn(async () => jsonResponse(makeOpenMeteoResponse()));
    vi.stubGlobal("fetch", fetchMock);
    const res = await assistantPOST(
      assistantRequest({
        ...VALID_BODY,
        question: "What is the AQI in Mumbai right now?",
      })
    );
    const body = await res.json();
    expect(body.ai.status).toBe("unavailable");
    expect(body.ai.reason).toBe("key_not_configured");
    expect(body.plan).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(body.queriedLocations).toBeUndefined();
  });

  it("honours 'not practical' feedback in the returned plan", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(makeOpenMeteoResponse()))
    );
    const res = await assistantPOST(
      assistantRequest({
        ...VALID_BODY,
        feedback: [
          { actionId: "emission_no_idle", verdict: "not_practical" },
        ],
      })
    );
    const body = await res.json();
    const ids = [
      ...body.plan.pillars.breathe,
      ...body.plan.pillars.indoor,
      ...body.plan.pillars.emission,
    ].map((a: { id: string }) => a.id);
    expect(ids).not.toContain("emission_no_idle");
  });

  it("calls Gemini server-side with the exact model when a key exists", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key-for-vitest");
    const geminiFetch = vi.fn(async (url: string) =>
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    explanation: "The plan protects exposure first today.",
                    actionNotes: [],
                  }),
                },
              ],
            },
          },
        ],
      })
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("generativelanguage.googleapis.com")) {
          return geminiFetch(url);
        }
        return jsonResponse(makeOpenMeteoResponse());
      })
    );

    const res = await assistantPOST(
      assistantRequest({ ...VALID_BODY, question: "Why this plan today?" })
    );
    const body = await res.json();
    expect(body.ai.status).toBe("ok");
    expect(body.ai.model).toBe("gemini-3.5-flash-lite");
    const calledUrl = geminiFetch.mock.calls[0]?.[0] ?? "";
    expect(calledUrl).toContain("gemini-3.5-flash-lite:generateContent");
    expect(calledUrl).not.toContain("test-key-for-vitest");
  });

  it("fetches live data for a city named in the question and passes it to Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key-for-vitest");
    let geminiRequestBody = "";
    const geminiFetch = vi.fn(async (url: string, init?: RequestInit) => {
      geminiRequestBody = String(init?.body ?? "");
      return jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    explanation: "Mumbai is cleaner than Delhi today.",
                    actionNotes: [],
                  }),
                },
              ],
            },
          },
        ],
      });
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("generativelanguage.googleapis.com")) {
          return geminiFetch(url, init);
        }
        return jsonResponse(makeOpenMeteoResponse());
      })
    );

    const res = await assistantPOST(
      assistantRequest({
        ...VALID_BODY,
        question: "What is the AQI in Mumbai right now?",
      })
    );
    const body = await res.json();
    expect(body.ai.status).toBe("ok");
    expect(body.queriedLocations).toEqual([
      { label: "Mumbai, Maharashtra", status: "ok" },
    ]);
    // The prompt must contain the live Mumbai data block for the model.
    expect(geminiRequestBody).toContain("Mumbai, Maharashtra");
    expect(geminiRequestBody).toContain('live_data_available\\":true');
    // Privacy: coordinates of the queried place must never be sent.
    expect(geminiRequestBody).not.toContain("72.8777");
    expect(geminiRequestBody).not.toContain("19.076");
  });

  it("marks a home-city mention without duplicating provider fetches", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key-for-vitest");
    const providerCalls = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse(makeOpenMeteoResponse())
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("generativelanguage.googleapis.com")) {
          return jsonResponse({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        explanation: "Delhi air is moderate today.",
                        actionNotes: [],
                      }),
                    },
                  ],
                },
              },
            ],
          });
        }
        return providerCalls(url, init);
      })
    );

    const res = await assistantPOST(
      assistantRequest({
        ...VALID_BODY,
        question: "How is the air in Delhi today?",
      })
    );
    const body = await res.json();
    expect(body.queriedLocations).toEqual([
      { label: "Delhi, Delhi", status: "home" },
    ]);
    // Home data comes from the single initial provider fetch.
    expect(providerCalls).toHaveBeenCalledTimes(1);
  });

  it("degrades gracefully when Gemini returns 429", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key-for-vitest");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("generativelanguage.googleapis.com")) {
          return jsonResponse({ error: "rate" }, 429);
        }
        return jsonResponse(makeOpenMeteoResponse());
      })
    );
    const res = await assistantPOST(
      assistantRequest({ ...VALID_BODY, question: "why?" })
    );
    const body = await res.json();
    expect(body.ai.status).toBe("unavailable");
    expect(body.ai.reason).toBe("rate_limited");
    expect(body.plan.pillars.breathe).toBeDefined();
  });

  it("rejects Gemini output that invents action IDs", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key-for-vitest");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("generativelanguage.googleapis.com")) {
          return jsonResponse({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        explanation: "Sure, here is a secret new action",
                        actionNotes: [
                          { actionId: "made_up_action", note: "do this" },
                        ],
                      }),
                    },
                  ],
                },
              },
            ],
          });
        }
        return jsonResponse(makeOpenMeteoResponse());
      })
    );
    const res = await assistantPOST(
      assistantRequest({ ...VALID_BODY, question: "why?" })
    );
    const body = await res.json();
    expect(body.ai.status).toBe("unavailable");
    expect(body.ai.reason).toBe("invalid_response");
    expect(body.ai.message).toMatch(/unknown actionId/i);
  });

  it("rate-limits the assistant endpoint separately from air data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(makeOpenMeteoResponse()))
    );
    let last: Response | null = null;
    for (let i = 0; i < 15; i++) {
      last = await assistantPOST(assistantRequest(VALID_BODY));
    }
    expect(last?.status).toBe(429);
  });
});
