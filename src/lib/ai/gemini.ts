/**
 * Server-side Gemini client (REST, no SDK).
 *
 * Security and reliability rules (brief sections 8.1 and 8.6):
 * - The model is EXACTLY gemini-3.5-flash-lite. No hidden fallback models.
 * - Called only from server-side API routes; never from the browser.
 * - The API key comes from the GEMINI_API_KEY environment variable and is
 *   never logged, never returned to the client, never sent client-side.
 * - Strict timeout; at most one retry for transient 429/5xx with backoff
 *   and jitter; no retry loops; no retry on validation errors.
 * - Failures map to an honest AiUnavailable state; the deterministic plan
 *   remains fully functional without Gemini.
 */

import { GEMINI_MODEL } from "./prompt";
import type { AiUnavailable } from "@/lib/schemas";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

export interface GeminiCallResult {
  ok: boolean;
  /** Raw model text (to be validated by lib/ai/validate.ts). */
  text?: string;
  unavailable?: AiUnavailable;
  /** Safe metadata only: status + latency. No keys, no user content. */
  meta: { httpStatus?: number; latencyMs: number; attempts: number };
}

function unavailable(
  reason: AiUnavailable["reason"],
  message: string,
  meta: GeminiCallResult["meta"]
): GeminiCallResult {
  return {
    ok: false,
    unavailable: {
      status: "unavailable",
      reason,
      message,
      model: GEMINI_MODEL,
    },
    meta,
  };
}

function isTransient(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

interface GeminiPart {
  text?: string;
}
interface GeminiResponseShape {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call Gemini generateContent with a JSON-expecting prompt.
 * Returns the raw text on success; callers must validate it.
 */
export async function callGemini(
  systemInstruction: string,
  userContent: string,
  options: { fetchImpl?: typeof fetch; apiKey?: string } = {}
): Promise<GeminiCallResult> {
  const started = Date.now();
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return unavailable(
      "key_not_configured",
      "AI explanation is unavailable because no Gemini API key is configured. The deterministic plan below remains fully usable.",
      { latencyMs: 0, attempts: 0 }
    );
  }

  const url = `${API_BASE}/${GEMINI_MODEL}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 700,
      responseMimeType: "application/json",
    },
  });

  let lastMeta: GeminiCallResult["meta"] = { latencyMs: 0, attempts: 0 };
  let lastHttpStatus: number | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Backoff with jitter, bounded.
      const backoff = 800 + Math.floor(Math.random() * 400);
      await sleep(backoff);
    }
    const attemptStart = Date.now();
    lastMeta.attempts = attempt + 1;

    let response: Response;
    try {
      response = await (options.fetchImpl ?? fetch)(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const timedOut =
        err instanceof Error &&
        (err.name === "TimeoutError" || err.name === "AbortError");
      lastMeta.latencyMs = Date.now() - attemptStart;
      if (timedOut) {
        return unavailable(
          "timeout",
          "The AI explanation timed out. Your deterministic plan is unaffected.",
          lastMeta
        );
      }
      // Network-level error: one retry for transient conditions.
      if (attempt < MAX_RETRIES) continue;
      return unavailable(
        "provider_error",
        "The AI service could not be reached. Your deterministic plan is unaffected.",
        lastMeta
      );
    }

    lastHttpStatus = response.status;
    lastMeta.httpStatus = response.status;
    lastMeta.latencyMs = Date.now() - attemptStart;

    if (response.status === 429) {
      if (attempt < MAX_RETRIES && isTransient(response.status)) continue;
      return unavailable(
        "rate_limited",
        "The AI service is rate-limited right now. Your deterministic plan is unaffected.",
        lastMeta
      );
    }
    if (response.status >= 500 && response.status <= 599) {
      if (attempt < MAX_RETRIES) continue;
      return unavailable(
        "provider_error",
        "The AI service is temporarily unavailable. Your deterministic plan is unaffected.",
        lastMeta
      );
    }
    if (!response.ok) {
      return unavailable(
        "provider_error",
        `The AI service rejected the request (status ${response.status}). Your deterministic plan is unaffected.`,
        lastMeta
      );
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      return unavailable(
        "invalid_response",
        "The AI service returned a malformed HTTP response. Your deterministic plan is unaffected.",
        lastMeta
      );
    }

    const shape = raw as GeminiResponseShape;
    const text = shape.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("");

    if (typeof text !== "string" || text.trim().length === 0) {
      return unavailable(
        "invalid_response",
        "The AI response was empty. Your deterministic plan is unaffected.",
        lastMeta
      );
    }

    return {
      ok: true,
      text,
      meta: { ...lastMeta, latencyMs: Date.now() - attemptStart },
    };
  }

  return unavailable(
    "provider_error",
    "The AI service did not respond after retries. Your deterministic plan is unaffected.",
    { ...lastMeta, httpStatus: lastHttpStatus }
  );
}
