"use client";

/**
 * AI explanation panel (brief sections 6.2, 8).
 * - A natural-language briefing is generated with every plan; users can
 *   additionally ask any question - including about other places, for which
 *   the server fetches live data before the model is called.
 * - Responses are labelled with the exact configured model (AI_MODEL,
 *   default gemini-3.5-flash-lite) and a disclaimer that the AI produces
 *   prose only, never data.
 * - Unavailable states are honest and the deterministic plan is untouched.
 */

import { useState } from "react";
import { Bot, Globe2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StepHeading } from "@/components/StepHeading";
import type { AiExplanation, AiUnavailable, QueriedLocation } from "@/lib/schemas";

interface Props {
  onAsk: (question: string) => void;
  ai: AiExplanation | AiUnavailable | null;
  loading: boolean;
  disabled: boolean;
  queried: QueriedLocation[] | null;
}

function LiveLocationChips({ queried }: { queried: QueriedLocation[] }) {
  const ok = queried.filter((q) => q.status === "ok");
  const failed = queried.filter((q) => q.status === "failed");
  const home = queried.filter((q) => q.status === "home");
  if (ok.length === 0 && failed.length === 0 && home.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      {ok.map((q) => (
        <span
          key={`ok-${q.label}`}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800"
        >
          <Globe2 aria-hidden="true" className="h-3 w-3" />
          Live data fetched for {q.label}
        </span>
      ))}
      {home.map((q) => (
        <span
          key={`home-${q.label}`}
          className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-800"
        >
          {q.label} - your selected location
        </span>
      ))}
      {failed.map((q) => (
        <span
          key={`failed-${q.label}`}
          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800"
        >
          No live data for {q.label} right now
        </span>
      ))}
      <span className="w-full text-[10px] text-muted-foreground">
        Place search &copy;{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          OpenStreetMap
        </a>{" "}
        contributors (Nominatim) and Open-Meteo geocoding
      </span>
    </div>
  );
}

export function GeminiPanel({ onAsk, ai, loading, disabled, queried }: Props) {
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = question.trim();
    if (trimmed.length < 4) {
      setError("Ask a short question first (at least 4 characters).");
      return;
    }
    if (trimmed.length > 400) {
      setError("Keep the question under 400 characters.");
      return;
    }
    setError(null);
    onAsk(trimmed);
  }

  const modelLabel = ai?.model ?? "a Gemini model (server-side)";

  return (
    <section
      aria-labelledby="ai-heading"
      className="card-shadow rounded-2xl border bg-card p-4 sm:p-6"
    >
      <StepHeading step={5} title="AI briefing & answers" />
      <p className="mt-1 text-sm text-muted-foreground">
        A short briefing is generated with every plan. You can also ask
        anything - including other places: if you name a city or locality, the
        server first fetches{" "}
        <strong>live air-quality data for that exact place</strong> and the AI
        answers using those real numbers. It never invents readings, and every
        value on this page still comes from the data engine.
      </p>

      <div className="mt-4 space-y-3">
        <Textarea
          aria-label="Your question about today's plan or any other place"
          placeholder="e.g. What is the AQI in Mumbai right now? Which action helps my child most today?"
          className="min-h-20"
          maxLength={400}
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            if (error) setError(null);
          }}
          disabled={disabled || loading}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="h-11 bg-gradient-to-r from-emerald-700 to-teal-700 px-6 text-white shadow-sm hover:from-emerald-800 hover:to-teal-800"
            onClick={submit}
            disabled={disabled || loading}
            aria-busy={loading}
          >
            <Send aria-hidden="true" className="mr-2 h-4 w-4" />
            {loading ? "Thinking…" : "Ask"}
          </Button>
          {error ? (
            <span role="alert" className="text-sm text-destructive">
              {error}
            </span>
          ) : null}
        </div>

        {queried && !loading ? <LiveLocationChips queried={queried} /> : null}

        {loading ? (
          <div className="mt-2 space-y-2" role="status" aria-live="polite">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ) : null}

        {ai && !loading ? (
          ai.status === "ok" ? (
            <div className="mt-2 rounded-xl border bg-gradient-to-br from-emerald-50/60 to-teal-50/40 p-4 ring-1 ring-emerald-600/20">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white"
                >
                  <Bot className="h-3.5 w-3.5" />
                </span>
                {modelLabel} · server-side call
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{ai.explanation}</p>
              {ai.actionNotes.length > 0 ? (
                <ul className="mt-3 space-y-1.5 border-t border-emerald-700/15 pt-3 text-sm">
                  {ai.actionNotes.map((note) => (
                    <li key={note.actionId} className="flex gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700"
                      />
                      <span>
                        <span className="font-medium capitalize">
                          {note.actionId.replace(/_/g, " ")}
                        </span>
                        {": "}
                        {note.note}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-3 border-t border-emerald-700/15 pt-2 text-xs text-muted-foreground">
                {ai.disclaimer}
              </p>
            </div>
          ) : (
            <div
              role="alert"
              className="mt-2 rounded-xl border border-amber-600/40 bg-amber-50 p-4"
            >
              <p className="text-sm font-semibold text-amber-800">
                AI explanation unavailable ({ai.reason.replace(/_/g, " ")})
              </p>
              <p className="mt-1 text-sm text-amber-900">{ai.message}</p>
              <p className="mt-1 text-xs text-amber-800">
                The deterministic plan above stays fully usable - this app
                never depends on the AI to function.
              </p>
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
