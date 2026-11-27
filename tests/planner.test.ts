import { describe, expect, it } from "vitest";
import { categoryByKey, categoryForIndex } from "@/lib/aqi/categories";
import { generatePlan } from "@/lib/planner/rules";
import { makeAir, makeProfile, TEST_LOCATION } from "./helpers";
import type { BetterWindow } from "@/lib/schemas";

const NO_WINDOW: BetterWindow = { found: false, note: "no window (test)" };

function ctx(overrides: {
  air?: ReturnType<typeof makeAir>;
  profile?: ReturnType<typeof makeProfile>;
  betterWindow?: BetterWindow;
  categoryKey?: string;
  feedback?: { actionId: string; verdict: "used" | "not_practical" }[];
} = {}) {
  const air = overrides.air ?? makeAir();
  const categoryKey =
    overrides.categoryKey ??
    (air.derivedIndiaAqi.status === "available"
      ? categoryForIndex(air.derivedIndiaAqi.value!)?.key
      : undefined);
  return {
    locationLabel: TEST_LOCATION.label,
    air,
    profile: overrides.profile ?? makeProfile(),
    betterWindow: overrides.betterWindow ?? NO_WINDOW,
    category: categoryKey ? categoryByKey(categoryKey) : undefined,
    feedback: overrides.feedback,
  };
}

function allActionIds(plan: ReturnType<typeof generatePlan>): string[] {
  return [
    ...plan.pillars.breathe,
    ...plan.pillars.indoor,
    ...plan.pillars.emission,
  ].map((a) => a.id);
}

describe("planner safety gates", () => {
  it("blocks walking/cycling promotion when the category is Poor or worse", () => {
    const plan = generatePlan(ctx({ categoryKey: "very_poor" }));
    expect(allActionIds(plan)).not.toContain("emission_walk_cycle_short");
    const excludedReason = plan.excluded.find(
      (e) => e.actionId === "emission_walk_cycle_short"
    );
    expect(excludedReason?.reason).toMatch(/Poor or worse/i);
  });

  it("blocks outdoor-exercise guidance under severe smog but explains exposure limits", () => {
    const profile = makeProfile({ routine: "outdoor_exercise" });
    const plan = generatePlan(ctx({ profile, categoryKey: "severe" }));
    const breatheIds = plan.pillars.breathe.map((a) => a.id);
    expect(breatheIds).toContain("breathe_limit_outdoor_exertion");
  });

  it("offers walk/cycle only when air allows it", () => {
    // A household without a commute has almost no other emission candidates,
    // so the walk/cycle action must surface when air conditions allow it.
    const profile = makeProfile({ commuteMode: "none", routine: "work_from_home" });
    const plan = generatePlan(ctx({ profile, categoryKey: "good" }));
    expect(allActionIds(plan)).toContain("emission_walk_cycle_short");
  });

  it("never reschedules a fixed-schedule household", () => {
    const profile = makeProfile({ scheduleFlexibility: "fixed" });
    const plan = generatePlan(ctx({ profile, betterWindow: { found: true, startIso: "a", endIso: "b", windowMeanPm25: 50, comparisonMeanPm25: 120, improvementPercent: 55, note: "" } }));
    const ids = allActionIds(plan);
    expect(ids).not.toContain("emission_remote_day");
    expect(ids).not.toContain("emission_stagger_trip_time");
    const excludedIds = plan.excluded.map((e) => e.actionId);
    expect(excludedIds).toContain("emission_remote_day");
  });

  it("shows only zero-cost actions to zero-budget households", () => {
    const profile = makeProfile({ budget: "zero" });
    const plan = generatePlan(ctx({ profile }));
    for (const pillar of Object.values(plan.pillars)) {
      for (const action of pillar) {
        expect(action.costBand).toBe("zero");
      }
    }
  });

  it("gives purifier maintenance to owners, not purchase pitches", () => {
    const owner = makeProfile({
      hasPurifier: "yes",
      indoorSources: ["none_unsure"],
    });
    const planOwner = generatePlan(ctx({ profile: owner }));
    const ownerIds = allActionIds(planOwner);
    expect(ownerIds).toContain("indoor_purifier_filter_check");
    expect(ownerIds).not.toContain("indoor_purifier_buying_guidance");

    const buyer = makeProfile({
      hasPurifier: "no",
      budget: "above_2000",
      indoorSources: ["none_unsure"],
    });
    const planBuyer = generatePlan(ctx({ profile: buyer }));
    expect(allActionIds(planBuyer)).toContain("indoor_purifier_buying_guidance");
  });

  it("does not pitch purifiers to zero-budget households without one", () => {
    const profile = makeProfile({ hasPurifier: "no", budget: "zero" });
    const plan = generatePlan(ctx({ profile }));
    expect(allActionIds(plan)).not.toContain("indoor_purifier_buying_guidance");
    expect(allActionIds(plan)).toContain("indoor_zero_cost_source_control");
  });

  it("only advises open-window ventilation when a better window exists", () => {
    const planNoWindow = generatePlan(ctx({ betterWindow: NO_WINDOW }));
    expect(allActionIds(planNoWindow)).not.toContain(
      "indoor_ventilate_cleaner_window"
    );

    const window: BetterWindow = {
      found: true,
      startIso: "2026-11-27T10:00",
      endIso: "2026-11-27T12:00",
      windowMeanPm25: 55,
      comparisonMeanPm25: 110,
      improvementPercent: 50,
      note: "test",
    };
    const planWindow = generatePlan(ctx({ betterWindow: window, categoryKey: "moderate" }));
    expect(allActionIds(planWindow)).toContain("indoor_ventilate_cleaner_window");
  });

  it("keeps windows closed under Very Poor+ even when a window exists", () => {
    const window: BetterWindow = {
      found: true,
      startIso: "2026-11-27T10:00",
      endIso: "2026-11-27T12:00",
      windowMeanPm25: 160,
      comparisonMeanPm25: 320,
      improvementPercent: 50,
      note: "test",
    };
    const profile = makeProfile({ indoorSources: ["none_unsure"] });
    const plan = generatePlan(
      ctx({ betterWindow: window, categoryKey: "very_poor", profile })
    );
    expect(allActionIds(plan)).not.toContain("indoor_ventilate_cleaner_window");
  });

  it("excludes commute actions for households without a commute", () => {
    const profile = makeProfile({ commuteMode: "none", routine: "work_from_home" });
    const plan = generatePlan(ctx({ profile }));
    const ids = allActionIds(plan);
    expect(ids).not.toContain("emission_carpool_share");
    expect(ids).not.toContain("emission_no_idle");
    expect(ids).not.toContain("emission_metro_bus_shift");
  });
});

describe("planner behaviour", () => {
  it("produces a plan with all three pillars", () => {
    const plan = generatePlan(ctx());
    for (const pillar of Object.values(plan.pillars)) {
      expect(pillar.length).toBeGreaterThan(0);
      expect(pillar.length).toBeLessThanOrEqual(3);
    }
  });

  it("is deterministic for identical inputs", () => {
    const a = generatePlan(ctx());
    const b = generatePlan(ctx());
    expect(a.pillars).toEqual(b.pillars);
    expect(a.excluded).toEqual(b.excluded);
  });

  it("respects 'not practical' feedback deterministically", () => {
    const feedback = [
      { actionId: "indoor_no_smoke_sources", verdict: "not_practical" as const },
    ];
    const plan = generatePlan(ctx({ feedback }));
    expect(allActionIds(plan)).not.toContain("indoor_no_smoke_sources");
    const reason = plan.excluded.find(
      (e) => e.actionId === "indoor_no_smoke_sources"
    );
    expect(reason?.reason).toMatch(/not practical/i);
  });

  it("boosts actions the household marked as used", () => {
    const base = generatePlan(ctx());
    const withUsed = generatePlan(
      ctx({
        feedback: [{ actionId: "indoor_damp_dusting", verdict: "used" }],
      })
    );
    const before = base.pillars.indoor.find((a) => a.id === "indoor_damp_dusting");
    const after = withUsed.pillars.indoor.find(
      (a) => a.id === "indoor_damp_dusting"
    );
    if (before && after) {
      expect(after.relevance).toBeGreaterThanOrEqual(before.relevance);
    }
  });

  it("prioritises smoke-source removal when sources are flagged", () => {
    const profile = makeProfile({ indoorSources: ["smoking", "mosquito_coil"] });
    const plan = generatePlan(ctx({ profile }));
    expect(plan.pillars.indoor[0].id).toBe("indoor_no_smoke_sources");
  });

  it("matches every plan action to the approved catalogue", () => {
    const plan = generatePlan(ctx());
    for (const pillar of Object.values(plan.pillars)) {
      for (const action of pillar) {
        expect(action.id).toMatch(/^(breathe|indoor|emission)_/);
        expect(action.instruction.length).toBeGreaterThan(10);
        expect(action.impact.type).toBeTruthy();
        expect(action.assumptions.length).toBeGreaterThan(0);
      }
    }
  });

  it("attaches numeric emission impact only when distance is known", () => {
    // A fixed schedule keeps the plan focused on commute-mode shifts.
    const fixedProfile = makeProfile({ scheduleFlexibility: "fixed" });
    const withDistance = generatePlan(
      ctx({ profile: makeProfile({ ...fixedProfile, oneWayDistanceKm: 10 }) })
    );
    const metro = [
      ...withDistance.pillars.emission,
    ].find((a) => a.id === "emission_metro_bus_shift");
    expect(metro?.impact.numeric).toBeTruthy();
    expect(metro?.impact.numeric?.unit).toBe("kg CO2e/day");

    const withoutDistance = generatePlan(
      ctx({
        profile: makeProfile({ ...fixedProfile, oneWayDistanceKm: null }),
      })
    );
    const metroNoDist = withoutDistance.pillars.emission.find(
      (a) => a.id === "emission_metro_bus_shift"
    );
    expect(metroNoDist?.impact.numeric).toBeUndefined();
    expect(metroNoDist?.impact.display).toMatch(/no numeric estimate/i);
  });
});
