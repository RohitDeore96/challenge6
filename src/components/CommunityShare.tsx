"use client";

/**
 * Community bulletin (brief section 6.8).
 * Generates a locality-level clean-air summary with timestamp, provenance
 * and up to 3 community actions. Copy-to-clipboard only - nothing is sent
 * anywhere automatically. The bulletin never contains household profile
 * details or exact coordinates.
 */

import { useState } from "react";
import { Check, Copy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { AirQualityResponse, CommunityBulletin } from "@/lib/schemas";

interface Props {
  air: AirQualityResponse | null;
  disabled: boolean;
}

function buildBulletin(
  air: AirQualityResponse,
  bulletinActions: string[]
): CommunityBulletin {
  const generatedAt = new Date().toISOString();
  if (!air.ok) {
    return {
      generatedAt,
      localityLabel: air.location.label,
      dataLine:
        "Air data temporarily unavailable - no live reading is included in this bulletin.",
      actions: bulletinActions,
      footer:
        "Prepared with HawaSathi. General public-health information, not medical advice. No personal data included.",
    };
  }
  const derived = air.derivedIndiaAqi;
  return {
    generatedAt,
    localityLabel: air.location.label,
    dataLine: `Air data: ${air.source.provider} (${air.source.dataType}), reference ${formatDateTime(air.current.time)}. Indicative category: ${derived.status === "available" ? derived.category : "estimate unavailable"} - model-derived estimate, not an official CPCB reading. PM2.5 ${air.current.pm25 === null ? "n/a" : Math.round(air.current.pm25) + " µg/m³"}.`,
    actions: bulletinActions,
    footer:
      "Prepared with HawaSathi. General public-health information, not medical advice. No personal or household data included.",
  };
}

function bulletinToText(b: CommunityBulletin): string {
  const lines = [
    `Clean-air bulletin for ${b.localityLabel} - ${formatDateTime(b.generatedAt)}`,
    b.dataLine,
    "",
    "3 community actions for today:",
    ...b.actions.map((a, i) => `${i + 1}. ${a}`),
    "",
    b.footer,
  ];
  return lines.join("\n");
}

export function CommunityShare({ air, disabled }: Props) {
  const [copied, setCopied] = useState(false);

  // Deterministic community actions: safe for every locality, no invented
  // municipal services, no authority-contact claims.
  const actions = [
    "Ask school-gate and market drivers to switch engines off while waiting (anti-idling).",
    "Do not burn waste or leaves; use your usual waste collection channel instead.",
    "Combine trips - share one vehicle run for errands instead of several cold starts.",
  ];

  const bulletin = air ? buildBulletin(air, actions) : null;

  async function copyBulletin() {
    if (!bulletin) return;
    try {
      await navigator.clipboard.writeText(bulletinToText(bulletin));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby="community-heading"
      className="rounded-xl border bg-card p-4 sm:p-6"
    >
      <h2 id="community-heading" className="text-lg font-semibold">
        6. Community bulletin
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A shareable locality-level summary with clear data provenance and
        three community actions. Copy it and share it yourself - the app never
        posts anything automatically, never claims to contact authorities,
        and never includes household details.
      </p>

      {!air || disabled ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Load air data for an area first.
        </p>
      ) : bulletin ? (
        <>
          <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 font-sans text-sm">
            {bulletinToText(bulletin)}
          </pre>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-11"
            onClick={copyBulletin}
          >
            {copied ? (
              <Check aria-hidden="true" className="mr-2 h-4 w-4 text-emerald-700" />
            ) : (
              <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy bulletin"}
          </Button>
          {copied ? (
            <span role="status" className="ml-2 text-sm text-emerald-700">
              Bulletin copied to clipboard.
            </span>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
