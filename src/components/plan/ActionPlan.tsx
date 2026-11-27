"use client";

/**
 * "Your plan for today" (brief sections 6.2-6.5).
 * Three required pillars: Breathe safer today / Cleaner indoor air /
 * Lower-emission routine. IndoorAirPanel and CommuteAlternatives are the
 * dedicated pillar components; the exposure pillar renders inline here.
 * All actions come from the deterministic engine; the AI panel never
 * modifies this list.
 */

import { Home, Leaf, Wind } from "lucide-react";
import { ActionCard, type ActionVerdict } from "./ActionCard";
import { IndoorAirPanel } from "./IndoorAirPanel";
import { CommuteAlternatives } from "./CommuteAlternatives";
import { WindowCard } from "./WindowCard";
import { Skeleton } from "@/components/ui/skeleton";
import { StepHeading } from "@/components/StepHeading";
import type { Plan } from "@/lib/schemas";

interface Props {
  plan: Plan | null;
  loading: boolean;
  feedback: Record<string, ActionVerdict>;
  onVerdictChange: (actionId: string, verdict: ActionVerdict) => void;
}

export function ActionPlan({ plan, loading, feedback, onVerdictChange }: Props) {
  if (loading && !plan) {
    return (
      <section
        aria-labelledby="plan-heading"
        className="card-shadow rounded-2xl border bg-card p-4 sm:p-6"
        aria-busy="true"
      >
        <StepHeading step={4} title="Your plan for today" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
    );
  }

  if (!plan) {
    return null;
  }

  const totalUsed =
    Object.values(feedback).filter((v) => v === "used").length;

  return (
    <section
      aria-labelledby="plan-heading"
      className="card-shadow rounded-2xl border bg-card p-4 sm:p-6"
    >
      <StepHeading
        step={4}
        title="Your plan for today"
        aside={
          <p
            className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-600/30 sm:text-sm"
            aria-live="polite"
          >
            {totalUsed > 0
              ? `${totalUsed} action${totalUsed === 1 ? "" : "s"} marked as used`
              : "Mark what you will actually do - the plan adapts"}
          </p>
        }
      />
      <p className="mt-1 text-sm text-muted-foreground">
        Built for a <strong>{plan.airSummary.categoryLabel.toLowerCase()}</strong>{" "}
        day from {plan.airSummary.dataSourceType}. Every action card shows why
        it fits today, what impact to expect, and how that number was derived.
      </p>

      <div className="mt-4">
        <WindowCard window={plan.betterWindow} />
      </div>

      {/* Pillar 1: Breathe safer today */}
      <div className="mt-6">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 ring-1 ring-teal-700/25"
          >
            <Wind className="h-4.5 w-4.5 text-teal-700" />
          </span>
          Breathe safer today
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Exposure-aware timing and outdoor activity choices for today&apos;s
          conditions.
        </p>
        <div className="mt-3 space-y-3">
          {plan.pillars.breathe.length > 0 ? (
            plan.pillars.breathe.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                verdict={feedback[action.id] ?? "none"}
                onVerdictChange={onVerdictChange}
              />
            ))
          ) : (
            <p className="rounded-xl bg-muted/40 p-3 text-sm">
              No exposure actions needed from your profile for today&apos;s
              conditions - nothing is forced when the data does not call for
              it.
            </p>
          )}
        </div>
      </div>

      {/* Pillar 2: Cleaner indoor air */}
      <IndoorAirPanel
        actions={plan.pillars.indoor}
        feedback={feedback}
        onVerdictChange={onVerdictChange}
      />

      {/* Pillar 3: Lower-emission routine */}
      <CommuteAlternatives
        actions={plan.pillars.emission}
        feedback={feedback}
        onVerdictChange={onVerdictChange}
      />

      {plan.excluded.length > 0 ? (
        <details className="mt-5 text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">
            Actions not included today ({plan.excluded.length}) - and why
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {plan.excluded.map((e) => (
              <li key={`${e.actionId}-${e.reason.slice(0, 30)}`}>
                <span className="font-medium text-foreground">
                  {e.actionId.replace(/_/g, " ")}
                </span>
                : {e.reason}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
