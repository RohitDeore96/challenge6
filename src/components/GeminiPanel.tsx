"use client";

/**
 * Optional grounded AI explanation panel (brief sections 6.2, 8).
 * - The question is user-triggered and rate-limited server-side.
 * - Responses are labelled with the exact model (gemini-3.5-flash-lite) and
 *   a disclaimer that the AI produces prose only, never data.
 * - Unavailable states are honest and the deterministic plan is untouched.
 */

import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StepHeading } from "@/components/StepHeading";
import type { AiExplanation, AiUnavailable } from "@/lib/schemas";

interface Props {
  onAsk: (question: string) => void;
  ai: AiExplanation | AiUnavailable | null;
  loading: boolean;
  disabled: boolean;
}

export function GeminiPanel({ onAsk, ai, loading, disabled }: Props) {
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

  return (
    <section
      aria-labelledby="ai-heading"
      className="card-shadow rounded-2xl border bg-card p-4 sm:p-6"
    >
      <StepHeading step={5} title="Ask about your plan" />
      <p className="mt-1 text-sm text-muted-foreground">
        Optional. Answers come from{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          gemini-3.5-flash-lite
        </code>{" "}
        via a server route, grounded only in today&apos;s data and your
        approved actions. The AI never calculates values or adds actions -
        every number on this page comes from the deterministic engine.
      </p>

      <div className="mt-4 space-y-3">
        <Textarea
          aria-label="Your question about today's plan"
          placeholder="e.g. Why is walking excluded today? Which of these actions helps a young child most?"
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
            {loading ? "Asking…" : "Ask"}
          </Button>
          {error ? (
            <span role="alert" className="text-sm text-destructive">
              {error}
            </span>
          ) : null}
        </div>

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
                gemini-3.5-flash-lite · server-side call
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
