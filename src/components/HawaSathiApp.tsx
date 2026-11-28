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

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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
  type QueriedLocation,
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
  const [queried, setQueried] = useState<QueriedLocation[] | null>(null);

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
      // The AI briefing is generated with the plan in the same request.
      setAi(data.ai ?? null);
      setQueried(data.queriedLocations ?? null);
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
      setQueried(data.queriedLocations ?? null);
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
    // Plan refresh: the AI briefing is regenerated with it in one request.
    setLoadingPlan(true);
    const data = await callAssistant({ prof: profile, fb: next });
    if (data?.plan) {
      setPlan(data.plan);
      setAi(data.ai ?? null);
      setQueried(null);
    }
    setLoadingPlan(false);
  }

  function handleRefresh() {
    if (location) void fetchAir(location);
  }

  return (
    <div className="page-shell flex min-h-screen flex-col text-stone-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-emerald-700 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Hero header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 text-white">
        <div aria-hidden="true" className="hero-grid absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-1 shadow-lg ring-1 ring-white/40">
              <Image
                src="/logo-mark.png"
                alt="HawaSathi logo"
                width={52}
                height={52}
                priority
                className="h-12 w-12"
              />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                HawaSathi{" "}
                <span aria-hidden="true" className="text-base font-medium text-emerald-200/90 sm:text-lg">
                  · हवासाथी
                </span>
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-emerald-50/90 sm:text-base">
                Know what the air is like, what your household can do today,
                why it matters, and what impact to expect.
              </p>
            </div>
          </div>
          <ul
            aria-label="How HawaSathi works"
            className="mt-5 flex flex-wrap gap-2 text-xs font-medium sm:text-sm"
          >
            {["Modelled air data", "Deterministic plan", "AI explains, never invents", "No sign-up, no tracking"].map(
              (item) => (
                <li
                  key={item}
                  className="rounded-full border border-white/25 bg-white/10 px-3 py-1 backdrop-blur-sm"
                >
                  {item}
                </li>
              ),
            )}
          </ul>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-4 py-6 sm:px-6 sm:py-8">
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
          loading={aiLoading || loadingPlan}
          disabled={profile === null}
          queried={queried}
        />

        <CommunityShare air={air} disabled={profile === null} />
      </main>

      <footer className="border-t bg-background/80 backdrop-blur-sm">
        <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8 text-xs text-muted-foreground sm:grid-cols-2 sm:px-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Data &amp; AI honesty</p>
            <p>
              <strong>Data:</strong>{" "}
              <a
                href="https://open-meteo.com/en/docs/air-quality-api"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-foreground"
              >
                Air-quality data by Open-Meteo
              </a>{" "}
              (model data &copy; CAMS / Copernicus-ECMWF; place search &copy;{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-foreground"
              >
                OpenStreetMap
              </a>{" "}
              contributors via Nominatim) - modelled area-level data, not
              official CPCB station readings. Indicative India AQI values are
              model-derived estimates using CPCB category logic and are never
              mixed with the US AQI.
            </p>
            <p>
              <strong>AI:</strong> a Gemini model (AI_MODEL setting, default
              gemini-3.5-flash-lite), called server-side only, explains the
              plan and answers questions using live fetched data - it never
              calculates values or invents readings.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Privacy &amp; scope</p>
            <p>
              <strong>Not medical advice:</strong> HawaSathi gives general
              public-health information. It does not diagnose conditions or
              replace guidance from doctors or local authorities.
            </p>
            <p>
              <strong>Privacy:</strong> no account, no address, no personal
              data collected. Profile choices stay in your browser.{" "}
              <a
                className="font-medium text-emerald-800 underline underline-offset-2"
                href="/api/air-quality?lat=28.61&lon=77.21&label=Delhi"
              >
                Public API example
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
