"use client";

/**
 * Cleaner indoor air pillar (brief sections 6.2, 6.4).
 * Evidence-based, low-cost first: source control before devices, no plants
 * or gadgets as filtration, no purifier purchase pitch without budget.
 */

import { Home } from "lucide-react";
import { ActionCard, type ActionVerdict } from "./ActionCard";
import type { PlanAction } from "@/lib/schemas";

interface Props {
  actions: PlanAction[];
  feedback: Record<string, ActionVerdict>;
  onVerdictChange: (actionId: string, verdict: ActionVerdict) => void;
}

export function IndoorAirPanel({ actions, feedback, onVerdictChange }: Props) {
  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Home aria-hidden="true" className="h-5 w-5 text-teal-700" />
        Cleaner indoor air
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Practical, budget-matched actions: source control first, honest
        filtration guidance, and no gadget claims.
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
            No indoor actions matched your profile and budget today.
          </p>
        )}
      </div>
    </div>
  );
}
