"use client";

/**
 * Household profile form (brief section 5.2).
 * Short, optional, privacy-minimal: no names, no addresses, no diagnoses.
 * Every field maps to a planner decision; nothing more is collected.
 */

import { useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  householdProfileSchema,
  type HouseholdProfile,
} from "@/lib/schemas";

interface Props {
  initial: HouseholdProfile | null;
  onSubmit: (profile: HouseholdProfile) => void;
  loading: boolean;
  hasPlan: boolean;
}

const ROUTINE_OPTIONS = [
  { value: "commute", label: "School / work commute" },
  { value: "work_from_home", label: "Work from home" },
  { value: "mixed", label: "Mixed routine" },
  { value: "errands", label: "Mostly errands" },
  { value: "outdoor_exercise", label: "Regular outdoor exercise" },
] as const;

const COMMUTE_OPTIONS = [
  { value: "walk", label: "Walking" },
  { value: "cycle", label: "Cycle" },
  { value: "two_wheeler", label: "Two-wheeler" },
  { value: "car", label: "Car" },
  { value: "carpool", label: "Carpool / shared car" },
  { value: "bus", label: "Bus" },
  { value: "metro", label: "Metro / train" },
  { value: "none", label: "No regular commute" },
] as const;

const BUDGET_OPTIONS = [
  { value: "zero", label: "₹0 - only free actions" },
  { value: "under_500", label: "Under ₹500" },
  { value: "500_2000", label: "₹500-₹2,000" },
  { value: "above_2000", label: "Above ₹2,000" },
] as const;

const FUEL_OPTIONS = [
  { value: "lpg", label: "LPG" },
  { value: "electric", label: "Electric / induction" },
  { value: "biomass", label: "Biomass / solid fuel" },
  { value: "mixed", label: "Mixed" },
  { value: "unspecified", label: "Prefer not to say" },
] as const;

const SOURCE_OPTIONS = [
  { value: "smoking", label: "Smoking indoors" },
  { value: "incense", label: "Incense / dhoop" },
  { value: "mosquito_coil", label: "Mosquito coils" },
  { value: "frequent_frying", label: "Frequent frying / cooking" },
  { value: "dusty_cleaning", label: "Dust while cleaning" },
  { value: "none_unsure", label: "None / not sure" },
] as const;

const FLEX_OPTIONS = [
  { value: "flexible", label: "Flexible" },
  { value: "somewhat", label: "Somewhat flexible" },
  { value: "fixed", label: "Fixed schedule" },
] as const;

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unspecified", label: "Prefer not to say" },
] as const;

export function HouseholdProfile({
  initial,
  onSubmit,
  loading,
  hasPlan,
}: Props) {
  const [routine, setRoutine] = useState<string>(initial?.routine ?? "mixed");
  const [commuteMode, setCommuteMode] = useState<string>(
    initial?.commuteMode ?? "none"
  );
  const [distance, setDistance] = useState<string>(
    initial?.oneWayDistanceKm != null ? String(initial.oneWayDistanceKm) : ""
  );
  const [budget, setBudget] = useState<string>(initial?.budget ?? "zero");
  const [cookingFuel, setCookingFuel] = useState<string>(
    initial?.cookingFuel ?? "unspecified"
  );
  const [sources, setSources] = useState<string[]>(
    initial?.indoorSources ?? ["none_unsure"]
  );
  const [hasPurifier, setHasPurifier] = useState<string>(
    initial?.hasPurifier ?? "unsure"
  );
  const [sensitiveMember, setSensitiveMember] = useState<string>(
    initial?.sensitiveMember ?? "unspecified"
  );
  const [flexibility, setFlexibility] = useState<string>(
    initial?.scheduleFlexibility ?? "somewhat"
  );
  const [error, setError] = useState<string | null>(null);

  function toggleSource(value: string) {
    setSources((prev) => {
      if (value === "none_unsure") return ["none_unsure"];
      const withoutNone = prev.filter((v) => v !== "none_unsure");
      if (withoutNone.includes(value)) {
        const next = withoutNone.filter((v) => v !== value);
        return next.length === 0 ? ["none_unsure"] : next;
      }
      return [...withoutNone, value];
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedDistance =
      distance.trim() === "" ? null : Number(distance.trim());
    if (distance.trim() !== "") {
      if (
        parsedDistance === null ||
        !Number.isFinite(parsedDistance) ||
        parsedDistance < 0.2 ||
        parsedDistance > 150
      ) {
        setError(
          "Typical one-way distance must be between 0.2 and 150 km, or leave it empty."
        );
        return;
      }
    }

    const candidate = {
      routine,
      commuteMode,
      oneWayDistanceKm: parsedDistance,
      budget,
      cookingFuel,
      indoorSources: sources,
      hasPurifier,
      sensitiveMember,
      scheduleFlexibility: flexibility,
    } as unknown as HouseholdProfile;

    const result = householdProfileSchema.safeParse(candidate);
    if (!result.success) {
      setError(
        result.error.issues[0]?.message ??
          "Please check the highlighted profile fields."
      );
      return;
    }

    onSubmit(result.data);
  }

  return (
    <section
      aria-labelledby="profile-heading"
      className="rounded-xl border bg-card p-4 sm:p-6"
    >
      <h2 id="profile-heading" className="text-lg font-semibold">
        3. Tell us about your household
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Only fields that change your recommendations. Nothing here is sent to
        an account or server database - it stays in this session and your
        browser storage. No names, addresses or medical details.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-5">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">Daily routine and commute</legend>

          <div className="space-y-1.5">
            <Label htmlFor="routine">Main routine</Label>
            <Select value={routine} onValueChange={setRoutine} required>
              <SelectTrigger id="routine" className="min-h-11 w-full">
                <SelectValue placeholder="Select routine" />
              </SelectTrigger>
              <SelectContent>
                {ROUTINE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="commute">Main commute mode</Label>
            <Select value={commuteMode} onValueChange={setCommuteMode} required>
              <SelectTrigger id="commute" className="min-h-11 w-full">
                <SelectValue placeholder="Select commute mode" />
              </SelectTrigger>
              <SelectContent>
                {COMMUTE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="distance">
              Typical one-way distance (optional)
            </Label>
            <Input
              id="distance"
              type="number"
              inputMode="decimal"
              min={0.2}
              max={150}
              step={0.5}
              placeholder="e.g. 8 (km)"
              className="min-h-11"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used only for emission estimates. Without it, travel impacts
              stay qualitative instead of guessed.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget">Budget for improvements</Label>
            <Select value={budget} onValueChange={setBudget} required>
              <SelectTrigger id="budget" className="min-h-11 w-full">
                <SelectValue placeholder="Select budget" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </fieldset>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Indoor sources present</legend>
          <div className="flex flex-wrap gap-2 pt-1">
            {SOURCE_OPTIONS.map((o) => {
              const active = sources.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSource(o.value)}
                  className={`min-h-11 rounded-full border px-4 text-sm transition-colors ${
                    active
                      ? "border-emerald-700 bg-emerald-50 font-medium text-emerald-800"
                      : "bg-background hover:bg-accent"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="sr-only">Household equipment and flexibility</legend>
          <div className="space-y-1.5">
            <Label htmlFor="purifier">Air purifier at home</Label>
            <Select value={hasPurifier} onValueChange={setHasPurifier} required>
              <SelectTrigger id="purifier" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="unsure">Not sure</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sensitive">
              More-sensitive member present
            </Label>
            <Select
              value={sensitiveMember}
              onValueChange={setSensitiveMember}
              required
            >
              <SelectTrigger id="sensitive" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YES_NO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              e.g. older adult, young child - no names or diagnoses needed.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fuel">Cooking fuel</Label>
            <Select value={cookingFuel} onValueChange={setCookingFuel} required>
              <SelectTrigger id="fuel" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-3 lg:col-span-1">
            <Label htmlFor="flexibility">Can your schedule change?</Label>
            <Select
              value={flexibility}
              onValueChange={setFlexibility}
              required
            >
              <SelectTrigger id="flexibility" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FLEX_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            className="h-11 px-6"
            disabled={loading}
            aria-busy={loading}
          >
            <UserRound aria-hidden="true" className="mr-2 h-4 w-4" />
            {loading
              ? "Building plan…"
              : hasPlan
                ? "Update today's plan"
                : "Generate today's plan"}
          </Button>
          {hasPlan ? (
            <p className="text-xs text-muted-foreground">
              Updating the profile rebuilds the plan with the same air data.
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
