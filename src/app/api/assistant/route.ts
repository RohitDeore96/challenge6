/**
 * POST /api/assistant
 *
 * The main flow endpoint (brief sections 6.2, 8.4):
 *   validated request -> air data (cached provider call)
 *   -> deterministic rule engine -> approved plan
 *   -> Gemini explanation (strictly validated, always generated)
 *
 * The AI explanation is part of every response: generating the plan always
 * produces a natural-language briefing, and asking a question answers it.
 * When the question mentions another place AND a server-side Gemini key is
 * configured, the route resolves that place, fetches LIVE air-quality data
 * for it (Open-Meteo) and hands the real numbers to the model - the AI
 * quotes fetched data, it never invents. Without a key the deterministic
 * plan is still produced and the AI part degrades to an honest
 * "key_not_configured" state; AI-only lookups are skipped because they
 * could never contribute to a useful answer.
 *
 * The whole route runs under one deadline (see ROUTE_DEADLINE_MS): if the
 * budget is exhausted mid-question, remaining AI-only lookups are skipped
 * instead of stacking unbounded fetch timeouts.
 */

import { NextResponse } from "next/server";
import { assistantRequestSchema } from "@/lib/schemas";
import type { QueriedLocation } from "@/lib/schemas";
import { fetchAirQuality, categoryFromAir } from "@/lib/providers/openMeteo";
import { generatePlan } from "@/lib/planner/rules";
import { findBetterWindow, DEFAULT_WINDOW_OPTIONS } from "@/lib/planner/window";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildUserContent,
  SYSTEM_INSTRUCTION,
  type ExtraLocationData,
} from "@/lib/ai/prompt";
import { callGemini, isGeminiConfigured } from "@/lib/ai/gemini";
import { validateAiOutput, sanitizeQuestion } from "@/lib/ai/validate";
import { resolveQuestionLocations } from "@/lib/ai/question-locations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The question flow can chain geocoding + extra provider fetches + Gemini.
export const maxDuration = 30;

// Keep serverless requests bounded (brief section 10).
const MAX_BODY_BYTES = 16 * 1024;
/**
 * Overall request deadline across the FULL route (not just individual
 * fetch timeouts): geocoding + extra provider fetches + one Gemini call
 * must fit inside the serverless maxDuration with margin to spare.
 */
const ROUTE_DEADLINE_MS = 25_000;

export async function POST(req: Request): Promise<NextResponse> {
  const rate = checkRateLimit(req, "assistant");
  if (!rate.allowed) {
    return NextResponse.json(
      {
        air: { ok: false, error: { code: "provider_error", message: "Rate limited" } },
        error: `Too many requests. Retry after ${rate.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body too large." },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body too large." },
        { status: 413 }
      );
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Invalid request: check location and profile fields against the documented schema.",
        issues: parsed.error.issues
            .slice(0, 5)
            .map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 }
    );
  }

  const { location, profile, question, feedback } = parsed.data;

  // Round coordinates to 2 decimals; never store or forward anything finer.
  const safeLocation = {
    ...location,
    lat: Math.round(location.lat * 100) / 100,
    lon: Math.round(location.lon * 100) / 100,
  };

  // Shared cache: identical grid cells reuse the same 10-minute payload
  // (efficiency rule: minimal provider calls; failures are not cached).
  const air = await fetchAirQuality(safeLocation, { useCache: true });
  if (!air.ok) {
    return NextResponse.json({ air });
  }

  const category = categoryFromAir(air);
  const betterWindow = findBetterWindow(
    air.hourly,
    air.current.time,
    DEFAULT_WINDOW_OPTIONS
  );

  const plan = generatePlan({
    locationLabel: safeLocation.label,
    air,
    profile,
    betterWindow,
    category,
    feedback: feedback ?? [],
  });

  // Question flow: find real places mentioned in the question and fetch
  // live data for each of them so the AI answers with real-world numbers.
  // This work is AI-ONLY: when no server-side Gemini key is configured it
  // can never contribute to a useful answer, so it is skipped and the
  // deterministic plan + honest key_not_configured state are returned
  // without spending provider/geocoder quota.
  const safeQuestion = question ? sanitizeQuestion(question) : null;
  const extraLocations: ExtraLocationData[] = [];
  let queriedLocations: QueriedLocation[] | undefined;
  const routeDeadline = Date.now() + ROUTE_DEADLINE_MS;

  if (safeQuestion && isGeminiConfigured()) {
    const resolved = await resolveQuestionLocations(safeQuestion, {
      label: safeLocation.label,
      lat: safeLocation.lat,
      lon: safeLocation.lon,
    }, { deadline: routeDeadline });

    if (resolved.length > 0) {
      queriedLocations = [];
      for (const place of resolved.slice(0, 2)) {
        if (place.relation === "home") {
          queriedLocations.push({ label: place.label, status: "home" });
          continue;
        }
        // Overall-route deadline check: skip remaining AI-only lookups
        // rather than stacking another bounded fetch on an exhausted
        // budget. Places not fetched are answered honestly by the AI
        // (no DATA block -> no invented numbers).
        if (Date.now() >= routeDeadline) break;
        const extraAir = await fetchAirQuality(
          { label: place.label, lat: place.lat, lon: place.lon },
          { useCache: true }
        );
        if (extraAir.ok) {
          extraLocations.push({ label: place.label, status: "ok", air: extraAir });
          queriedLocations.push({ label: place.label, status: "ok" });
        } else {
          extraLocations.push({ label: place.label, status: "failed" });
          queriedLocations.push({ label: place.label, status: "failed" });
        }
      }
    }
  }

  const geminiResult = await callGemini(
    SYSTEM_INSTRUCTION,
    buildUserContent({
      locationLabel: safeLocation.label,
      air,
      profile,
      plan,
      question: safeQuestion ?? undefined,
      extraLocations,
    })
  );

  if (!geminiResult.ok || !geminiResult.text) {
    return NextResponse.json({
      air,
      plan,
      ai: geminiResult.unavailable,
      ...(queriedLocations ? { queriedLocations } : {}),
    });
  }

  const approvedIds = [
    ...plan.pillars.breathe,
    ...plan.pillars.indoor,
    ...plan.pillars.emission,
  ].map((a) => a.id);

  const validated = validateAiOutput(geminiResult.text, approvedIds);
  return NextResponse.json({
    air,
    plan,
    ai: validated.explanation ?? validated.unavailable,
    ...(queriedLocations ? { queriedLocations } : {}),
  });
}
