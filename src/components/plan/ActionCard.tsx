"use client";

/**
 * A single action card (brief section 6.2).
 * Includes: verb-led instruction, "Why this today?", impact with
 * methodology, cost/effort/confidence, assumptions, source, and the
 * "Use this action" / "Not practical" interaction that updates the plan.
 */

import { useState } from "react";
import { Check, ExternalLink, ThumbsDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImpactBreakdown } from "./ImpactBreakdown";
import { costBandLabel, effortLabel } from "@/lib/format";
import type { PlanAction } from "@/lib/schemas";

export type ActionVerdict = "used" | "not_practical" | "none";

interface Props {
  action: PlanAction;
  verdict: ActionVerdict;
  onVerdictChange: (actionId: string, verdict: ActionVerdict) => void;
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-800",
  medium: "bg-amber-50 text-amber-800",
  low: "bg-stone-100 text-stone-700",
};

export function ActionCard({ action, verdict, onVerdictChange }: Props) {
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <article className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-base font-semibold leading-snug">{action.title}</h4>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${CONFIDENCE_STYLES[action.confidence]}`}
        >
          Confidence: {action.confidence}
        </span>
      </div>

      <p className="mt-2 text-sm">{action.instruction}</p>

      {/* Why this today - deterministic text from the rule engine */}
      <button
        type="button"
        className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
        aria-expanded={whyOpen}
        onClick={() => setWhyOpen((v) => !v)}
      >
        Why this today?
      </button>
      {whyOpen ? (
        <p className="mt-1.5 rounded-md bg-muted/60 p-3 text-sm">
          {action.why}
        </p>
      ) : null}

      <ImpactBreakdown impact={action.impact} />

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Cost: {costBandLabel(action.costBand)}</span>
        <span>Time: {effortLabel(action.effortMinutes)}</span>
        {action.source ? (
          <a
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
            href={action.source.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Methodology source
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>
        ) : null}
      </div>

      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer text-foreground">
          Assumptions &amp; limitations
        </summary>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          {action.assumptions.map((a) => (
            <li key={a.slice(0, 40)}>{a}</li>
          ))}
          <li>{action.methodology}</li>
        </ul>
      </details>

      {/* Household feedback: updates the plan deterministically */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={verdict === "used" ? "default" : "outline"}
          className={`h-11 ${verdict === "used" ? "bg-emerald-700 hover:bg-emerald-800" : ""}`}
          onClick={() =>
            onVerdictChange(action.id, verdict === "used" ? "none" : "used")
          }
          aria-pressed={verdict === "used"}
        >
          <Check aria-hidden="true" className="mr-1.5 h-4 w-4" />
          Using this action
        </Button>
        <Button
          type="button"
          size="sm"
          variant={verdict === "not_practical" ? "destructive" : "outline"}
          className="h-11"
          onClick={() =>
            onVerdictChange(
              action.id,
              verdict === "not_practical" ? "none" : "not_practical"
            )
          }
          aria-pressed={verdict === "not_practical"}
        >
          {verdict === "not_practical" ? (
            <X aria-hidden="true" className="mr-1.5 h-4 w-4" />
          ) : (
            <ThumbsDown aria-hidden="true" className="mr-1.5 h-4 w-4" />
          )}
          Not practical for us
        </Button>
      </div>
      {verdict === "not_practical" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Removed from your plan. No judgement - every household is different.
        </p>
      ) : null}
    </article>
  );
}
