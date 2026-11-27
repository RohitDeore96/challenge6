"use client";

/**
 * Impact display (brief section 6.6).
 * Numeric impacts always show units, formula, assumptions and the named
 * source. When a numeric estimate cannot be computed honestly, only the
 * qualitative description is shown - never an invented number.
 */

import { useState } from "react";
import { ChevronDown, Sigma } from "lucide-react";
import type { ActionImpact } from "@/lib/schemas";

const IMPACT_LABELS: Record<ActionImpact["type"], string> = {
  travel_emissions: "Travel emissions",
  outdoor_exposure: "Outdoor exposure",
  indoor_source_control: "Indoor source control",
  filtration: "Filtration",
  cost: "Cost",
  time: "Time",
};

export function ImpactBreakdown({ impact }: { impact: ActionImpact }) {
  const [expanded, setExpanded] = useState(false);
  const numeric = impact.numeric;

  return (
    <div className="rounded-lg border border-dashed p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Impact · {IMPACT_LABELS[impact.type]}
      </p>
      <p className="mt-1.5 text-sm">{impact.display}</p>

      {numeric ? (
        <>
          <button
            type="button"
            className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <Sigma aria-hidden="true" className="h-4 w-4" />
            How is this number calculated?
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
          {expanded ? (
            <div className="mt-2 space-y-2 rounded-md bg-muted/60 p-3 text-xs">
              <p>
                <span className="font-semibold">Formula:</span> {numeric.formula}
              </p>
              <div>
                <p className="font-semibold">Assumptions:</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {numeric.assumptions.map((a) => (
                    <li key={a.slice(0, 40)}>{a}</li>
                  ))}
                </ul>
              </div>
              <p>
                <span className="font-semibold">Source:</span>{" "}
                <a
                  className="underline underline-offset-2"
                  href={numeric.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {numeric.source.name} ({numeric.source.year})
                </a>
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
