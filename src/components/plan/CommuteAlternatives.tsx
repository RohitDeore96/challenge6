"use client";

/**
 * Lower-emission routine pillar (brief sections 6.3, 6.5).
 * Transport and habit alternatives matched to the household's actual
 * mobility, schedule flexibility and budget - never promoting outdoor
 * exercise during severe smog, never inventing routes or fares.
 */

import { Leaf } from "lucide-react";
import { ActionCard, type ActionVerdict } from "./ActionCard";
import type { PlanAction } from "@/lib/schemas";

interface Props {
  actions: PlanAction[];
  feedback: Record<string, ActionVerdict>;
  onVerdictChange: (actionId: string, verdict: ActionVerdict) => void;
}

export function CommuteAlternatives({
  actions,
  feedback,
  onVerdictChange,
}: Props) {
  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Leaf aria-hidden="true" className="h-5 w-5 text-teal-700" />
        Lower-emission routine
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Sustainable alternatives that fit your real commute and schedule -
        with the emission maths shown where it can be shown honestly.
      </p>
      <div className="mt-3 space-y-3">
        {actions.length > 0 ? (
          actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              verdict={feedback[action.id] ?? "none"}
              onVerdictChange={onVerdictChange}
            />
          ))
        ) : (
          <p className="rounded-lg bg-muted/40 p-3 text-sm">
            No routine changes fit your commute and schedule today.
          </p>
        )}
      </div>
    </div>
  );
}
