/**
 * POST /api/assistant
 *
 * The main flow endpoint (brief sections 6.2, 8.4):
 *   validated request -> air data (cached provider call)
 *   -> deterministic rule engine -> approved plan
 *   -> optional Gemini explanation (strictly validated)
 *
 * Works fully without a Gemini key: the plan is deterministic and the AI
 * part degrades to an honest "unavailable" state.
 */

import { NextResponse } from "next/server";
import { assistantRequestSchema } from "@/lib/schemas";
import { fetchAirQuality, categoryFromAir } from "@/lib/providers/openMeteo";
import { generatePlan } from "@/lib/planner/rules";
import { findBetterWindow, DEFAULT_WINDOW_OPTIONS } from "@/lib/planner/window";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildUserContent, SYSTEM_INSTRUCTION } from "@/lib/ai/prompt";
import { callGemini } from "@/lib/ai/gemini";
import { validateAiOutput, sanitizeQuestion } from "@/lib/ai/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep serverless requests bounded (brief section 10).
const MAX_BODY_BYTES = 16 * 1024;

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

  const wantsAi = question !== undefined && question.trim().length > 0;
  if (!wantsAi) {
    return NextResponse.json({ air, plan });
  }

  const safeQuestion = sanitizeQuestion(question!);
  if (!safeQuestion) {
    return NextResponse.json({ air, plan });
  }

  const geminiResult = await callGemini(SYSTEM_INSTRUCTION, buildUserContent({
    locationLabel: safeLocation.label,
    air,
    profile,
    plan,
    question: safeQuestion,
  }));

  if (!geminiResult.ok || !geminiResult.text) {
    return NextResponse.json({
      air,
      plan,
      ai: geminiResult.unavailable,
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
  });
}
