"use client";

/**
 * Current air-quality summary (brief section 6.1).
 * Hero card: the model-derived indicative India AQI estimate is the visual
 * centre with a category-coloured gauge (0-500). Supporting values: PM2.5,
 * PM10 and the separate US AQI. Provider, data type and freshness are shown
 * first. Never shows a "Live" badge when data is stale or the provider
 * failed. Colour is only a secondary cue - every status is always carried
 * by its text label and advisory.
 */

import { AlertTriangle, Clock, RefreshCw, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepHeading } from "@/components/StepHeading";
import { categoryForIndex } from "@/lib/aqi/categories";
import { formatAge, formatAqiValue, formatUgM3 } from "@/lib/format";
import type { AirQualityResponse } from "@/lib/schemas";

interface Props {
  air: AirQualityResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

const GAUGE_STOPS = [0, 50, 100, 200, 300, 400, 500];
const GAUGE_COLORS = [
  "#22c55e", // good
  "#a3e635", // satisfactory
  "#facc15", // moderate
  "#f97316", // poor
  "#ef4444", // very poor
  "#7f1d1d", // severe
];

function AqiGauge({ value, markerClass }: { value: number; markerClass: string }) {
  const pct = Math.min(100, Math.max(0, (value / 500) * 100));
  return (
    <div>
      <div
        role="img"
        aria-label={`Gauge from 0 to 500 on the India AQI scale; the current estimate ${value} falls ${pct.toFixed(0)} percent along the scale.`}
        className="relative mt-2 h-3 w-full overflow-visible rounded-full"
        style={{
          background: `linear-gradient(to right, ${GAUGE_COLORS.map(
            (c, i) => `${c} ${((GAUGE_STOPS[i] ?? 0) / 500) * 100}%`,
          ).join(", ")})`,
        }}
      >
        <span
          className={`gauge-marker absolute -top-1.5 h-6 w-[3px] rounded-full border border-white shadow ${markerClass}`}
          style={{ left: `calc(${pct}% - 1.5px)` }}
        />
      </div>
      <div
        aria-hidden="true"
        className="mt-1 flex justify-between text-[10px] font-medium text-muted-foreground"
      >
        {GAUGE_STOPS.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  );
}

export function AirQualitySummary({ air, loading, onRefresh }: Props) {
  if (!air) {
    return (
      <section
        aria-labelledby="air-heading"
        className="card-shadow rounded-2xl border bg-card p-4 sm:p-6"
      >
        <StepHeading step={2} title="Air quality where you are" />
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
        className="card-shadow rounded-2xl border border-destructive/40 bg-card p-4 sm:p-6"
      >
        <StepHeading step={2} title="Air quality where you are" />
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
      className="card-shadow rounded-2xl border bg-card p-4 sm:p-6"
    >
      <StepHeading
        step={2}
        title={`Air quality in ${air.location.label}`}
        aside={
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
        }
      />

      {/* Data provenance first (brief section 11: visual hierarchy 1) */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Satellite aria-hidden="true" className="h-3.5 w-3.5" />
          <a
            href={air.source.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            Air-quality data by Open-Meteo (CAMS model)
          </a>
          · {air.source.dataType}
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

      {/* Hero: indicative India AQI estimate + gauge */}
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div
          className={`rounded-xl p-4 ${categoryClass || "border bg-muted/40"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide">
            India AQI estimate
          </p>
          <p className="mt-1 flex items-baseline gap-2" aria-live="polite">
            <span className="text-5xl font-bold leading-none tracking-tight">
              {derived.status === "available"
                ? formatAqiValue(derived.value)
                : "n/a"}
            </span>
            <span className="text-xs font-medium">
              / 500 scale
            </span>
          </p>
          <p className="mt-1 text-sm font-bold">
            {derived.status === "available"
              ? derived.category
              : "Estimate unavailable"}
            {derived.status === "available" ? (
              <span className="ml-1 font-medium opacity-80">
                (model-derived)
              </span>
            ) : null}
          </p>
          {derived.status === "available" ? (
            <AqiGauge value={derived.value!} markerClass="bg-stone-900" />
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-gradient-to-br from-background to-muted/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              PM2.5
            </p>
            <p className="mt-1 text-2xl font-bold" aria-live="polite">
              {formatUgM3(air.current.pm25)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">µg/m³ · fine particles</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-background to-muted/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              PM10
            </p>
            <p className="mt-1 text-2xl font-bold">{formatUgM3(air.current.pm10)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">µg/m³ · coarse particles</p>
          </div>
          <div className="col-span-2 rounded-xl border bg-gradient-to-br from-background to-muted/40 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                US AQI
              </p>
              <p className="text-xs text-muted-foreground">Open-Meteo US AQI system</p>
            </div>
            <p className="mt-0.5 text-2xl font-bold">
              {formatAqiValue(air.current.usAqi)}
            </p>
          </div>
        </div>
      </div>

      {/* Index explanation and caveats */}
      <div className="mt-4 space-y-2 rounded-xl bg-muted/50 p-3 text-sm">
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
