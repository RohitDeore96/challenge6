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
      className="rounded-xl border bg-card p-4 sm:p-6"
    >
      <h2 id="ai-heading" className="text-lg font-semibold">
        5. Ask about your plan
      </h2>
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
            className="h-11 px-6"
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
            <div className="mt-2 rounded-lg border bg-muted/30 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <Bot aria-hidden="true" className="h-4 w-4" />
                gemini-3.5-flash-lite · server-side call
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{ai.explanation}</p>
              {ai.actionNotes.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {ai.actionNotes.map((note) => (
                    <li key={note.actionId}>
                      <span className="font-medium">
                        {note.actionId.replace(/_/g, " ")}
                      </span>
                      : {note.note}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                {ai.disclaimer}
              </p>
            </div>
          ) : (
            <div
              role="alert"
              className="mt-2 rounded-lg border border-amber-600/40 bg-amber-50 p-3"
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
