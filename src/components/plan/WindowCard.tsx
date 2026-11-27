"use client";

/**
 * Better-window timing card (brief section 6.7).
 * Honest states: found (with times + values) or not found (with the reason),
 * plus the standing caveat that a better forecast is not a safe-air promise.
 */

import { Clock3 } from "lucide-react";
import { formatTimeIso } from "@/lib/format";
import type { BetterWindow } from "@/lib/schemas";

export function WindowCard({ window }: { window: BetterWindow }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        window.found ? "border-emerald-600/40 bg-emerald-50/60" : "bg-muted/40"
      }`}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Clock3 aria-hidden="true" className="h-4 w-4" />
        {window.found
          ? "Potentially better window for outdoor time"
          : "Timing: no clearly better window found"}
      </p>
      {window.found ? (
        <p className="mt-1 text-sm">
          Forecast PM2.5 averages about{" "}
          <strong>{window.windowMeanPm25} µg/m³</strong> between{" "}
          <strong>
            {window.startIso ? formatTimeIso(window.startIso) : "?"} and{" "}
            {window.endIso ? formatTimeIso(window.endIso) : "?"}
          </strong>
          , versus about <strong>{window.comparisonMeanPm25} µg/m³</strong> in
          the next hours ({window.improvementPercent}% lower, same pollutant
          and same provider series).
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">{window.note}</p>
    </div>
  );
}
