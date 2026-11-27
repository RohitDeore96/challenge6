"use client";

/**
 * HawaSathi - Urban Air Quality Assistant (PromptWars Challenge 6).
 *
 * Single-page flow (brief section 4.3):
 * choose location -> load air data -> describe household routine
 * -> generate plan -> inspect three action pillars -> change a choice
 * -> see impact update -> ask Gemini why -> share a grounded summary.
 *
 * This component renders client-side only (imported with ssr:false) so
 * persisted preferences can be read lazily from localStorage without
 * hydration mismatches. No account, no address, no medical data anywhere.
 */

import { useCallback, useEffect, useState } from "react";
import { Wind } from "lucide-react";
import { LocationPicker } from "@/components/LocationPicker";
import { AirQualitySummary } from "@/components/AirQualitySummary";
import { PollutantDetails } from "@/components/PollutantDetails";
import { HouseholdProfile } from "@/components/HouseholdProfile";
import { ActionPlan } from "@/components/plan/ActionPlan";
import { GeminiPanel } from "@/components/GeminiPanel";
import { CommunityShare } from "@/components/CommunityShare";
import type {
  ActionVerdict,
} from "@/components/plan/ActionCard";
import {
  type AiExplanation,
  type AiUnavailable,
  type AirQualityResponse,
  type AssistantResponse,
  type HouseholdProfile as HouseholdProfileData,
  type LocationInput,
  type Plan,
} from "@/lib/schemas";

const LS_LOCATION = "hawasathi.location.v1";
const LS_PROFILE = "hawasathi.profile.v1";
const LS_FEEDBACK = "hawasathi.feedback.v1";

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode): the app still works in-session.
  }
}

export function HawaSathiApp() {
  // Lazy initializers read persisted preferences once, client-side only.
  const [location, setLocation] = useState<LocationInput | null>(() =>
    readJson<LocationInput>(LS_LOCATION)
  );
  const [air, setAir] = useState<AirQualityResponse | null>(null);
  const [loadingAir, setLoadingAir] = useState(false);

  const [profile, setProfile] = useState<HouseholdProfileData | null>(() =>
    readJson<HouseholdProfileData>(LS_PROFILE)
  );
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const [ai, setAi] = useState<AiExplanation | AiUnavailable | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [feedback, setFeedback] = useState<Record<string, ActionVerdict>>(
    () => readJson<Record<string, ActionVerdict>>(LS_FEEDBACK) ?? {}
  );
  const [pageError, setPageError] = useState<string | null>(null);

  const fetchAir = useCallback(async (loc: LocationInput) => {
    setLoadingAir(true);
    setPageError(null);
    try {
      const res = await fetch(
        `/api/air-quality?lat=${encodeURIComponent(loc.lat)}&lon=${encodeURIComponent(loc.lon)}&label=${encodeURIComponent(loc.label)}`
      );
      const data = (await res.json()) as AirQualityResponse;
      setAir(data);
    } catch {
      setPageError(
        "Could not reach the air-quality service. Check your connection and try Refresh."
      );
    } finally {
      setLoadingAir(false);
    }
  }, []);

  /* Load air data automatically when a persisted location exists.
     Deferred to a macrotask so the effect does not synchronously cascade
     state updates during render commit (react-hooks/set-state-in-effect). */
  useEffect(() => {
    if (location && !air) {
      const id = setTimeout(() => void fetchAir(location), 0);
      return () => clearTimeout(id);
    }
  }, [location, air, fetchAir]);

  function handleSelectLocation(loc: LocationInput) {
    setLocation(loc);
    setPlan(null);
    setAi(null);
    writeJson(LS_LOCATION, loc);
    void fetchAir(loc);
  }

  /** Shared call to the assistant endpoint. */
  async function callAssistant(opts: {
    prof: HouseholdProfileData;
    question?: string;
    fb: Record<string, ActionVerdict>;
  }): Promise<AssistantResponse | null> {
    const feedbackList = Object.entries(opts.fb)
      .filter(([, v]) => v !== "none")
      .map(([actionId, verdict]) => ({ actionId, verdict }));

    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location,
        profile: opts.prof,
        ...(opts.question ? { question: opts.question } : {}),
        ...(feedbackList.length > 0 ? { feedback: feedbackList } : {}),
      }),
    });
    if (!res.ok) {
      setPageError(
        res.status === 429
          ? "Too many requests - wait a minute before generating again."
          : "The assistant service could not process the request. Please try again."
      );
      return null;
    }
    return (await res.json()) as AssistantResponse;
  }

  async function handleProfileSubmit(prof: HouseholdProfileData) {
    if (!location) return;
    setLoadingPlan(true);
    setPageError(null);
    setProfile(prof);
    writeJson(LS_PROFILE, prof);
    const data = await callAssistant({ prof, fb: feedback });
    if (data?.plan) {
      setPlan(data.plan);
      setAi(null);
    }
    setLoadingPlan(false);
  }

  async function handleAsk(question: string) {
    if (!profile || !location) return;
    setAiLoading(true);
    setPageError(null);
    const data = await callAssistant({ prof: profile, question, fb: feedback });
    if (data?.ai) {
      setAi(data.ai);
    }
    setAiLoading(false);
  }

  async function handleVerdictChange(actionId: string, verdict: ActionVerdict) {
    if (!profile || !location) return;
    const next = { ...feedback };
    if (verdict === "none") delete next[actionId];
    else next[actionId] = verdict;
    setFeedback(next);
    writeJson(LS_FEEDBACK, next);
    // Plan refresh without a question: no unnecessary Gemini call.
    setLoadingPlan(true);
    const data = await callAssistant({ prof: profile, fb: next });
    if (data?.plan) setPlan(data.plan);
    setLoadingPlan(false);
  }

  function handleRefresh() {
    if (location) void fetchAir(location);
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-emerald-700 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b bg-background/95">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700">
            <Wind aria-hidden="true" className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight">HawaSathi</h1>
            <p className="text-sm text-muted-foreground">
              Know what the air is like, what your household can do today,
              why it matters, and what impact to expect.
            </p>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
        {pageError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            {pageError}
          </div>
        ) : null}

        <LocationPicker
          selected={location}
          onSelect={handleSelectLocation}
          disabled={loadingAir}
        />

        <AirQualitySummary air={air} loading={loadingAir} onRefresh={handleRefresh} />

        {air?.ok ? <PollutantDetails air={air} /> : null}

        <HouseholdProfile
          initial={profile}
          onSubmit={handleProfileSubmit}
          loading={loadingPlan}
          hasPlan={plan !== null}
        />

        <ActionPlan
          plan={plan}
          loading={loadingPlan}
          feedback={feedback}
          onVerdictChange={handleVerdictChange}
        />

        <GeminiPanel
          onAsk={handleAsk}
          ai={ai}
          loading={aiLoading}
          disabled={profile === null}
        />

        <CommunityShare air={air} disabled={profile === null} />
      </main>

      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto max-w-3xl space-y-2 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <p>
            <strong>Data:</strong> Open-Meteo Air Quality API (CAMS model
            forecast) - modelled area-level data, not official CPCB station
            readings. Indicative India AQI values are model-derived estimates
            using CPCB category logic and are never mixed with the US AQI.
          </p>
          <p>
            <strong>AI:</strong> gemini-3.5-flash-lite, called server-side
            only, generates explanations for the deterministic plan - it never
            calculates values or invents actions.
          </p>
          <p>
            <strong>Not medical advice:</strong> HawaSathi gives general
            public-health information. It does not diagnose conditions or
            replace guidance from doctors or local authorities.
          </p>
          <p>
            <strong>Privacy:</strong> no account, no address, no personal
            data collected. Profile choices stay in your browser.{" "}
            <a
              className="underline underline-offset-2"
              href="/api/air-quality?lat=28.61&lon=77.21&label=Delhi"
            >
              Public API example
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
