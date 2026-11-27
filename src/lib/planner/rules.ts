/**
 * Deterministic recommendation rule engine.
 *
 * THIS MODULE OWNS ALL DECISIONS:
 * - relevance scoring, safety gates, budget filters and impact numbers are
 *   computed here deterministically and are unit-tested (tests/planner.test.ts).
 * - Gemini only receives the resulting approved action list and explains it
 *   (brief section 8.4). It can never add, remove or re-number actions.
 *
 * Safety gates implemented here (brief sections 6.3-6.6):
 * - Outdoor exercise / walk-cycle actions are hard-blocked when the
 *   indicative category is Poor or worse.
 * - Open-window ventilation is offered only when a clearly better forecast
 *   window exists; otherwise closed-windows is suggested for Very Poor+.
 * - Fixed schedules never receive rescheduling or remote-day actions.
 * - Zero-budget households never receive actions with a non-zero cost band.
 * - Purifier advice is matched to ownership and affordability.
 * - No numeric impact is shown when a factor or distance is missing.
 */

import { actionById } from "@/lib/actions/catalog";
import type { AqiCategory } from "@/lib/aqi/categories";
import {
  estimateModeShift,
  commuteModeLabel,
} from "@/lib/impact/emissions";
import type {
  ActionImpact,
  AirQualitySuccess,
  BetterWindow,
  CommuteMode,
  HouseholdProfile,
  Plan,
  PlanAction,
  Pillar,
} from "@/lib/schemas";

export interface PlannerContext {
  locationLabel: string;
  air: AirQualitySuccess;
  profile: HouseholdProfile;
  betterWindow: BetterWindow;
  category: AqiCategory | undefined;
  feedback?: { actionId: string; verdict: "used" | "not_practical" }[];
}

interface ScoredCandidate {
  actionId: string;
  relevance: number;
  why: string;
  impact: ActionImpact;
}

/** Households with a zero budget can only see zero-cost actions. */
const BUDGET_ORDER = ["zero", "under_500", "500_2000", "above_2000"] as const;

function budgetAllows(
  householdBudget: (typeof BUDGET_ORDER)[number],
  actionBand: (typeof BUDGET_ORDER)[number]
): boolean {
  // under_500 actions are affordable to every budget band above zero.
  if (householdBudget === "zero") return actionBand === "zero";
  if (householdBudget === "under_500")
    return actionBand === "zero" || actionBand === "under_500";
  if (householdBudget === "500_2000") return actionBand !== "above_2000";
  return true;
}

const POOR_OR_WORSE = new Set(["poor", "very_poor", "severe"]);
const VERY_POOR_OR_WORSE = new Set(["very_poor", "severe"]);

function isPoorOrWorse(category: AqiCategory | undefined): boolean {
  return category ? POOR_OR_WORSE.has(category.key) : false;
}

function isVeryPoorOrWorse(category: AqiCategory | undefined): boolean {
  return category ? VERY_POOR_OR_WORSE.has(category.key) : false;
}

function categoryLabel(ctx: PlannerContext): string {
  return ctx.category ? ctx.category.label.toLowerCase() : "unavailable";
}

function windowText(betterWindow: BetterWindow): string {
  if (!betterWindow.found) return "no clearly better window";
  return `${betterWindow.startIso} to ${betterWindow.endIso}`;
}

/* ------------------------------------------------------------------ */
/* Impact builders (deterministic)                                     */
/* ------------------------------------------------------------------ */

function modeShiftImpact(
  ctx: PlannerContext,
  alternativeMode: CommuteMode,
  occupancy?: number
): ActionImpact {
  const estimate = estimateModeShift({
    baselineMode: ctx.profile.commuteMode,
    alternativeMode,
    distanceKm: ctx.profile.oneWayDistanceKm ?? null,
    occupancy,
  });

  const baseline = commuteModeLabel(ctx.profile.commuteMode);
  const alternative = commuteModeLabel(alternativeMode);

  if (estimate.kgCo2eAvoidedPerDay !== null) {
    return {
      type: "travel_emissions",
      display: `Estimated ~${estimate.kgCo2eAvoidedPerDay} ${estimate.unit} avoided for your ${ctx.profile.oneWayDistanceKm} km one-way trips (${baseline} -> ${alternative}). Applies to your trip, not to the city's air quality.`,
      numeric: {
        value: estimate.kgCo2eAvoidedPerDay,
        unit: estimate.unit,
        formula: estimate.formula,
        assumptions: estimate.assumptions,
        source: estimate.source!,
      },
    };
  }

  return {
    type: "travel_emissions",
    display: `Fewer vehicle-km for your trips (${baseline} -> ${alternative}). No numeric estimate shown because trip distance is not provided or the shift is not lower-emitting.`,
    qualitative:
      "A numeric CO2e estimate requires a trip distance and documented factors; both are withheld rather than guessed.",
  };
}

function exposureImpact(minutesMoved: number, why: string): ActionImpact {
  return {
    type: "outdoor_exposure",
    display: `Roughly ${minutesMoved} minutes of optional outdoor time can move to a cleaner period (${why}). No precise health benefit is claimed.`,
    qualitative:
      "Exposure-reduction action; benefit is qualitative and depends on actual activity timing.",
  };
}

function sourceControlImpact(display: string): ActionImpact {
  return {
    type: "indoor_source_control",
    display,
    qualitative:
      "Indoor source control reduces the source itself; no percentage reduction is claimed without a measurement in your home.",
  };
}

function filtrationImpact(display: string): ActionImpact {
  return {
    type: "filtration",
    display,
    qualitative:
      "Filtration may reduce particles in the treated room only; the app cannot claim a percentage for your room without measurements.",
  };
}

/* ------------------------------------------------------------------ */
/* Candidate generation per pillar                                     */
/* ------------------------------------------------------------------ */

function scoreBreatheActions(ctx: PlannerContext): {
  candidates: ScoredCandidate[];
  excluded: { actionId: string; reason: string }[];
} {
  const candidates: ScoredCandidate[] = [];
  const excluded: { actionId: string; reason: string }[] = [];
  const { profile, betterWindow } = ctx;
  const poorPlus = isPoorOrWorse(ctx.category);
  const veryPoorPlus = isVeryPoorOrWorse(ctx.category);
  const cat = categoryLabel(ctx);

  // Outdoor exercise gating
  const outdoorExercise =
    profile.routine === "outdoor_exercise" ||
    profile.commuteMode === "walk" ||
    profile.commuteMode === "cycle";

  if (poorPlus && outdoorExercise) {
    candidates.push({
      actionId: "breathe_limit_outdoor_exertion",
      relevance: 95,
      why: `The indicative category is ${cat} in ${ctx.locationLabel}. Outdoor exertion is limited today; this protects the household first and deliberately does not push cycling or running for emissions.`,
      impact: exposureImpact(
        60,
        "moving workout/play time away from the worst hours"
      ),
    });
  }

  if (betterWindow.found) {
    candidates.push({
      actionId: "breathe_shift_outdoor_window",
      relevance: poorPlus ? 92 : 80,
      why: `Hourly PM2.5 forecast for ${ctx.locationLabel} shows a potentially better window around ${windowText(betterWindow)}: forecast mean ~${betterWindow.windowMeanPm25} ug/m3 vs ~${betterWindow.comparisonMeanPm25} ug/m3 in the next hours (-${betterWindow.improvementPercent}%).`,
      impact: exposureImpact(
        45,
        "shifting outdoor time into the cleaner window"
      ),
    });
  }

  if (veryPoorPlus) {
    candidates.push({
      actionId: "breathe_keep_windows_closed_peak",
      relevance: 88,
      why: `With ${cat} levels in ${ctx.locationLabel} and ${betterWindow.found ? "only a short cleaner window" : "no clearly better window"} in the forecast, keeping windows closed during the worst hours limits outdoor PM entering your home.`,
      impact: sourceControlImpact(
        "Keeps the worst outdoor hours from raising indoor PM; qualitative benefit only."
      ),
    });
  }

  if (poorPlus) {
    const stillOutside =
      profile.commuteMode !== "none" && profile.routine !== "work_from_home";
    if (stillOutside) {
      candidates.push({
        actionId: "breathe_mask_outdoors",
        relevance: 70,
        why: `The household still has outdoor exposure (routine: ${profile.routine.replace(/_/g, " ")}) during ${cat} conditions in ${ctx.locationLabel}.`,
        impact: {
          type: "outdoor_exposure",
          display:
            "Reduces inhaled particles during unavoidable outdoor minutes; protection depends on fit and consistent wear, so no percentage is claimed.",
          qualitative: "Fit-dependent exposure reduction.",
        },
      });
    }
  }

  if (profile.commuteMode !== "none" || profile.routine !== "work_from_home") {
    candidates.push({
      actionId: "breathe_away_from_road",
      relevance: 58,
      why: `The household spends time at bus stops, school gates or stands in ${ctx.locationLabel}; waiting a few metres back from idling engines cuts the most concentrated roadside exposure minutes of the day.`,
      impact: exposureImpact(10, "waiting away from idling engines"),
    });
  }

  if (profile.sensitiveMember === "yes" && poorPlus) {
    candidates.push({
      actionId: "breathe_sensitive_indoor_play",
      relevance: 90,
      why: `The household includes a more sensitive member and the indicative category is ${cat}; shifting their outdoor activity today is the precaution the WHO advisory logic supports.`,
      impact: exposureImpact(
        90,
        "moving a sensitive member's outdoor time indoors for the day"
      ),
    });
  }

  if (candidates.length === 0) {
    // Default exposure-aware guidance for acceptable-air days.
    if (!betterWindow.found) {
      excluded.push({
        actionId: "breathe_shift_outdoor_window",
        reason: "No clearly better window found in the forecast.",
      });
    }
  }

  return { candidates, excluded };
}

function scoreIndoorActions(ctx: PlannerContext): {
  candidates: ScoredCandidate[];
  excluded: { actionId: string; reason: string }[];
} {
  const candidates: ScoredCandidate[] = [];
  const excluded: { actionId: string; reason: string }[] = [];
  const { profile, betterWindow } = ctx;
  const veryPoorPlus = isVeryPoorOrWorse(ctx.category);
  const cat = categoryLabel(ctx);

  const flags = new Set(profile.indoorSources);
  const hasSmokeSources =
    flags.has("smoking") || flags.has("incense") || flags.has("mosquito_coil");

  if (hasSmokeSources) {
    candidates.push({
      actionId: "indoor_no_smoke_sources",
      relevance: 96,
      why: `Your profile flags indoor smoke sources (smoking/incense/mosquito coils). Removing the source is the single most effective indoor step per EPA guidance, and today's ${cat} outdoor air makes indoor smoke worse, not better.`,
      impact: sourceControlImpact(
        "Removes the indoor PM source itself; benefit scales with how much the source was used. No percentage claimed."
      ),
    });
  }

  if (profile.cookingFuel === "biomass" || profile.cookingFuel === "mixed") {
    candidates.push({
      actionId: "indoor_biomass_cooking",
      relevance: 94,
      why: "The profile flags solid-fuel cooking. Keeping that smoke out of living and sleeping areas is the priority; switching fuel later is an option, not a precondition.",
      impact: sourceControlImpact(
        "Isolates cooking smoke from the household; no numeric reduction is claimed."
      ),
    });
  }

  if (flags.has("frequent_frying")) {
    candidates.push({
      actionId: "indoor_kitchen_exhaust",
      relevance: 90,
      why: "Frequent frying is flagged in your profile; venting cooking fumes outdoors while they are produced stops them spreading through the home.",
      impact: sourceControlImpact(
        "Keeps cooking PM out of the rest of the home; qualitative benefit only."
      ),
    });
  }

  if (flags.has("dusty_cleaning") || profile.routine === "mixed") {
    candidates.push({
      actionId: "indoor_damp_dusting",
      relevance: flags.has("dusty_cleaning") ? 78 : 55,
      why: flags.has("dusty_cleaning")
        ? "Your profile flags dust during cleaning; damp cleaning removes dust instead of resuspending it."
        : "Damp dusting is a zero-cost default that helps in every season.",
      impact: sourceControlImpact(
        "Avoids resuspending settled dust; no percentage claimed."
      ),
    });
  }

  if (profile.hasPurifier === "yes") {
    candidates.push({
      actionId: "indoor_purifier_filter_check",
      relevance: 82,
      why: "You already own a purifier; filter maintenance is the difference between rated performance and a quietly clogged device during smog season.",
      impact: filtrationImpact(
        "Maintains the device's rated clean-air delivery; no room-specific percentage is claimed."
      ),
    });
    candidates.push({
      actionId: "indoor_purifier_room_use",
      relevance: 76,
      why: "Placement matters: a purifier works in a closed room it is sized for, not in a hallway or across the whole flat.",
      impact: filtrationImpact(
        "Concentrates filtration where the family actually is; no percentage claimed."
      ),
    });
  } else if (profile.hasPurifier === "no") {
    if (ctx.profile.budget === "above_2000") {
      candidates.push({
        actionId: "indoor_purifier_buying_guidance",
        relevance: 66,
        why: `No purifier is present and your stated budget is above 2,000 INR, so CADR-based buying guidance is affordable for your household (no brand or price is listed).`,
        impact: filtrationImpact(
          "A correctly sized purifier may reduce particles in the treated room; no percentage claimed."
        ),
      });
    }
    candidates.push({
      actionId: "indoor_zero_cost_source_control",
      relevance: 84,
      why:
        profile.budget === "zero"
          ? "With a zero budget, source control is the honest first step: it is free and targets the actual pollution source."
          : "Source control comes before any device purchase in EPA guidance.",
      impact: sourceControlImpact(
        "Targets indoor sources directly; no percentage claimed."
      ),
    });
  } else {
    // unsure: give the zero-cost path without assuming ownership.
    candidates.push({
      actionId: "indoor_zero_cost_source_control",
      relevance: 74,
      why: "Source control is the first step regardless of whether a purifier ends up being part of your setup.",
      impact: sourceControlImpact(
        "Targets indoor sources directly; no percentage claimed."
      ),
    });
  }

  if (betterWindow.found && !veryPoorPlus) {
    candidates.push({
      actionId: "indoor_ventilate_cleaner_window",
      relevance: 80,
      why: `Outdoor forecast improves around ${windowText(betterWindow)} (mean ~${betterWindow.windowMeanPm25} ug/m3 vs ~${betterWindow.comparisonMeanPm25} ug/m3 now), so a short airing-out flushes indoor air without pulling in peak pollution.`,
      impact: sourceControlImpact(
        "Dilutes indoor-generated pollution during the cleaner hours; no percentage claimed."
      ),
    });
  } else {
    excluded.push({
      actionId: "indoor_ventilate_cleaner_window",
      reason: betterWindow.found
        ? "Outdoor category too poor to recommend opening windows."
        : "No clearly better window found, so no ventilation advice is forced.",
    });
  }

  candidates.push({
    actionId: "indoor_no_plants_as_filter",
    relevance: 48,
    why: "Prevents a common wasted purchase: plants and unverified gadgets are not certified filtration for PM2.5.",
    impact: {
      type: "cost",
      display:
        "Avoids spending on products that cannot deliver promised filtration.",
      qualitative: "Preventive money-saving action.",
    },
  });

  return { candidates, excluded };
}

function scoreEmissionActions(ctx: PlannerContext): {
  candidates: ScoredCandidate[];
  excluded: { actionId: string; reason: string }[];
} {
  const candidates: ScoredCandidate[] = [];
  const excluded: { actionId: string; reason: string }[] = [];
  const { profile, betterWindow } = ctx;

  const flexible = profile.scheduleFlexibility !== "fixed";
  const hasCommute = profile.commuteMode !== "none";
  const motorised =
    profile.commuteMode === "car" ||
    profile.commuteMode === "two_wheeler" ||
    profile.commuteMode === "carpool";

  if (hasCommute && motorised) {
    candidates.push({
      actionId: "emission_carpool_share",
      relevance: 74,
      why: `Your ${commuteModeLabel(profile.commuteMode)} commute can carry more people in the same vehicle; sharing splits the per-person emissions of the same trip.`,
      impact: modeShiftImpact(ctx, "carpool"),
    });
    candidates.push({
      actionId: "emission_trip_chain",
      relevance: profile.routine === "errands" ? 82 : 64,
      why: `Fewer cold starts and fewer kilometres for the same errands in ${ctx.locationLabel} - planning beats spreading trips across the day.`,
      impact: {
        type: "travel_emissions",
        display:
          "Avoids extra cold starts and km; no numeric estimate without trip distances, which the app will not fabricate.",
        qualitative: "Trip consolidation reduces km driven.",
      },
    });
    candidates.push({
      actionId: "emission_no_idle",
      relevance: 70,
      why: "Idling outside schools and shops burns fuel and emits at kerb height where children breathe; switching off is free.",
      impact: {
        type: "travel_emissions",
        display:
          "Eliminates idling emissions during waits; no numeric claim without knowing your idling minutes.",
        qualitative: "Zero-cost habit change.",
      },
    });
    candidates.push({
      actionId: "emission_metro_bus_shift",
      relevance: profile.commuteMode === "car" ? 68 : 60,
      why: `Where a metro/bus route exists for your trip, per-person emissions per km drop substantially versus ${commuteModeLabel(profile.commuteMode)}. Confirm the local route first; the app does not invent route data.`,
      impact: modeShiftImpact(ctx, "metro"),
    });
  }

  if (hasCommute && flexible && profile.routine !== "work_from_home") {
    candidates.push({
      actionId: "emission_remote_day",
      relevance: profile.routine === "commute" ? 72 : 58,
      why: "One remote day removes the commute trips entirely that day - the largest single-day cut available to a commuting household.",
      impact: modeShiftImpact(ctx, "none"),
    });
  } else {
    excluded.push({
      actionId: "emission_remote_day",
      reason: !flexible
        ? "Schedule is fixed, so remote days are not realistic."
        : "No regular commute to remove.",
    });
  }

  if (flexible && betterWindow.found && hasCommute) {
    candidates.push({
      actionId: "emission_stagger_trip_time",
      relevance: 62,
      why: `A flexible schedule plus a cleaner forecast window (${windowText(betterWindow)}) means flexible trips can move out of the peak-pollution hours.`,
      impact: exposureImpact(30, "moving flexible trips off the peak hours"),
    });
  } else if (!flexible) {
    excluded.push({
      actionId: "emission_stagger_trip_time",
      reason: "Schedule is fixed, so trip timing cannot change.",
    });
  }

  // Walking/cycling is ONLY offered when air makes it a reasonable choice.
  const airAllows =
    ctx.category && !isPoorOrWorse(ctx.category);
  if (airAllows && (motorised || profile.commuteMode === "none")) {
    candidates.push({
      actionId: "emission_walk_cycle_short",
      relevance: 58,
      why: `With the indicative category at ${categoryLabel(ctx)} in ${ctx.locationLabel}, short zero-emission trips are also a low-exposure choice today.`,
      impact: modeShiftImpact(ctx, "walk"),
    });
  } else {
    excluded.push({
      actionId: "emission_walk_cycle_short",
      reason: isPoorOrWorse(ctx.category)
        ? "Air category is Poor or worse: outdoor exertion is not promoted today, even for zero emissions."
        : "No car/two-wheeler short trips to replace.",
    });
  }

  candidates.push({
    actionId: "emission_no_waste_burning",
    relevance: 66,
    why: "Open waste burning is a direct, local PM source every household controls; municipal collection exists in most localities (confirm yours).",
    impact: sourceControlImpact(
      "Eliminates smoke at its source for your street; no city-level AQI claim."
    ),
  });

  return { candidates, excluded };
}

/* ------------------------------------------------------------------ */
/* Plan assembly                                                       */
/* ------------------------------------------------------------------ */

const MAX_PER_PILLAR = 3;

function assemblePillar(
  pillar: Pillar,
  candidates: ScoredCandidate[],
  ctx: PlannerContext,
  excluded: { actionId: string; reason: string }[]
): PlanAction[] {
  const { profile } = ctx;
  const notPractical = new Set(
    (ctx.feedback ?? [])
      .filter((f) => f.verdict === "not_practical")
      .map((f) => f.actionId)
  );

  const eligible: PlanAction[] = [];
  for (const candidate of candidates) {
    const action = actionById(candidate.actionId);
    if (!action) continue;
    if (action.pillar !== pillar) continue;

    if (notPractical.has(action.id)) {
      excluded.push({
        actionId: action.id,
        reason: "Marked not practical for this household.",
      });
      continue;
    }
    if (!budgetAllows(profile.budget, action.costBand)) {
      excluded.push({
        actionId: action.id,
        reason: `Cost band (${action.costBand}) exceeds the household budget.`,
      });
      continue;
    }

    const usedBoost =
      (ctx.feedback ?? []).some(
        (f) => f.actionId === action.id && f.verdict === "used"
      )
        ? 8
        : 0;

    eligible.push({
      ...action,
      relevance: Math.round((candidate.relevance + usedBoost) * 10) / 10,
      why: candidate.why,
      impact: candidate.impact,
    });
  }

  eligible.sort((a, b) => b.relevance - a.relevance);
  const top = eligible.slice(0, MAX_PER_PILLAR);
  const rest = eligible.slice(MAX_PER_PILLAR);
  for (const action of rest) {
    excluded.push({
      actionId: action.id,
      reason: "Ranked below the top actions for this pillar today.",
    });
  }
  return top;
}

export function generatePlan(ctx: PlannerContext): Plan {
  const breathe = scoreBreatheActions(ctx);
  const indoor = scoreIndoorActions(ctx);
  const emission = scoreEmissionActions(ctx);

  const excluded = [
    ...breathe.excluded,
    ...indoor.excluded,
    ...emission.excluded,
  ];

  const plan: Plan = {
    generatedAt: new Date().toISOString(),
    airSummary: {
      categoryLabel: ctx.category ? ctx.category.label : "Unavailable",
      categoryValue: ctx.air.derivedIndiaAqi.value ?? null,
      dataSourceType: ctx.air.source.dataType,
    },
    pillars: {
      breathe: assemblePillar("breathe", breathe.candidates, ctx, excluded),
      indoor: assemblePillar("indoor", indoor.candidates, ctx, excluded),
      emission: assemblePillar("emission", emission.candidates, ctx, excluded),
    },
    excluded,
    betterWindow: ctx.betterWindow,
  };

  return plan;
}
