"use client";

/**
 * Current air-quality summary (brief section 6.1).
 * Shows provider, data type, timestamps, freshness, PM values and BOTH
 * index systems clearly separated (US AQI vs model-derived indicative
 * India AQI estimate). Never shows a "Live" badge when data is stale or
 * the provider failed.
 */

import { AlertTriangle, Clock, RefreshCw, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryForIndex } from "@/lib/aqi/categories";
import { formatAge, formatAqiValue, formatUgM3 } from "@/lib/format";
import type { AirQualityResponse } from "@/lib/schemas";

interface Props {
  air: AirQualityResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

export function AirQualitySummary({ air, loading, onRefresh }: Props) {
  if (!air) {
    return (
      <section
        aria-labelledby="air-heading"
        className="rounded-xl border bg-card p-4 sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 id="air-heading" className="text-lg font-semibold">
            2. Air quality where you are
          </h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Select an area above to load modelled air-quality data for that
          grid cell.
        </p>
        {loading ? (
          <div
            className="mt-4 space-y-2"
            role="status"
            aria-label="Loading air quality data"
          >
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-16 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : null}
      </section>
    );
  }

  if (!air.ok) {
    return (
      <section
        aria-labelledby="air-heading"
        className="rounded-xl border border-destructive/40 bg-card p-4 sm:p-6"
      >
        <h2 id="air-heading" className="text-lg font-semibold">
          2. Air quality where you are
        </h2>
        <div role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3">
          <p className="font-medium text-destructive">
            Air-quality data is temporarily unavailable
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {air.error.message} No substitute reading is shown: this app does
            not display estimated values as if they were live data.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-11"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </section>
    );
  }

  const derived = air.derivedIndiaAqi;
  const category =
    derived.status === "available"
      ? categoryForIndex(derived.value!)
      : undefined;
  const categoryClass = category ? category.colorToken : "";

  return (
    <section
      aria-labelledby="air-heading"
      className="rounded-xl border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="air-heading" className="text-lg font-semibold">
          2. Air quality in {air.location.label}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 px-4"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw
            aria-hidden="true"
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Data provenance first (brief section 11: visual hierarchy 1) */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Satellite aria-hidden="true" className="h-3.5 w-3.5" />
          {air.source.provider} · {air.source.dataType}
        </span>
        <span
          className={`inline-flex items-center gap-1 font-medium ${
            air.freshness.status === "stale"
              ? "text-amber-700"
              : "text-emerald-700"
          }`}
        >
          <Clock aria-hidden="true" className="h-3.5 w-3.5" />
          {air.freshness.status === "stale" ? "STALE" : "Fresh"} ·{" "}
          {formatAge(air.freshness.ageMinutes)}
        </span>
        <span>{air.freshness.stalenessNote}</span>
      </div>

      {/* Main values: pollutant concentrations + both index systems */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            PM2.5
          </p>
          <p className="mt-1 text-xl font-bold" aria-live="polite">
            {formatUgM3(air.current.pm25)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            PM10
          </p>
          <p className="mt-1 text-xl font-bold">{formatUgM3(air.current.pm10)}</p>
        </div>
        <div className={`rounded-lg p-3 ${categoryClass || "border"}`}>
          <p className="text-xs font-medium uppercase tracking-wide">
            India AQI estimate
          </p>
          <p className="mt-1 text-xl font-bold">
            {derived.status === "available" ? formatAqiValue(derived.value) : "n/a"}
          </p>
          <p className="mt-0.5 text-xs font-semibold">
            {derived.status === "available"
              ? `${derived.category} (model-derived)`
              : "Estimate unavailable"}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            US AQI
          </p>
          <p className="mt-1 text-xl font-bold">
            {formatAqiValue(air.current.usAqi)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Open-Meteo US AQI system
          </p>
        </div>
      </div>

      {/* Index explanation and caveats */}
      <div className="mt-4 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
        <p>
          <span className="font-medium">Which index is which?</span> The
          &quot;India AQI estimate&quot; card applies CPCB category logic to
          model data - it is a{" "}
          <strong>model-derived indicative India AQI estimate</strong>, not an
          official CPCB station reading. The US AQI card is a different index
          system from the same provider. The two are never merged.
        </p>
        {derived.status === "unavailable" ? (
          <p className="font-medium text-amber-700">
            India AQI estimate unavailable: raw concentrations are shown
            instead. {derived.note}
          </p>
        ) : (
          <p className="text-muted-foreground">
            Sub-index coverage: {derived.pollutantsIncluded.join(", ") || "none"}
            {derived.pollutantsExcluded.length > 0
              ? ` · excluded (insufficient data): ${derived.pollutantsExcluded.join(", ")}`
              : ""}
          </p>
        )}
        {category ? (
          <p>
            <span className="font-medium">What this category means:</span>{" "}
            {category.advisory}
          </p>
        ) : null}
      </div>

      <details className="mt-3 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          Data limitations ({air.caveats.length})
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {air.caveats.map((c) => (
            <li key={c.slice(0, 40)}>{c}</li>
          ))}
        </ul>
        <p className="mt-2 inline-flex items-center gap-1">
          <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
          Model grid: {air.location.gridNote}
        </p>
      </details>
    </section>
  );
}
