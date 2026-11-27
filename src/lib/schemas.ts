import { z } from "zod";

/**
 * Shared domain schemas for HawaSathi.
 * Every API request and every AI response is validated with these schemas
 * before use (see docs/PROMPT_DESIGN.md and section 10 of the work brief).
 */

/* ------------------------------------------------------------------ */
/* Location                                                            */
/* ------------------------------------------------------------------ */

export const locationInputSchema = z.object({
  /** Decimal latitude, WGS84. Rounded to 2 decimals before use. */
  lat: z.number().min(-90).max(90),
  /** Decimal longitude, WGS84. Rounded to 2 decimals before use. */
  lon: z.number().min(-180).max(180),
  /** Human-readable city/locality label chosen in the UI. Never an address. */
  label: z.string().min(1).max(80),
});
export type LocationInput = z.infer<typeof locationInputSchema>;

/* ------------------------------------------------------------------ */
/* Household profile (privacy-minimal; see brief section 5)            */
/* ------------------------------------------------------------------ */

export const ROUTINES = [
  "commute",
  "work_from_home",
  "mixed",
  "errands",
  "outdoor_exercise",
] as const;
export type Routine = (typeof ROUTINES)[number];

export const COMMUTE_MODES = [
  "walk",
  "cycle",
  "two_wheeler",
  "car",
  "carpool",
  "bus",
  "metro",
  "none",
] as const;
export type CommuteMode = (typeof COMMUTE_MODES)[number];

export const BUDGETS = ["zero", "under_500", "500_2000", "above_2000"] as const;
export type Budget = (typeof BUDGETS)[number];

export const COOKING_FUELS = [
  "lpg",
  "electric",
  "biomass",
  "mixed",
  "unspecified",
] as const;
export type CookingFuel = (typeof COOKING_FUELS)[number];

export const INDOOR_SOURCES = [
  "smoking",
  "incense",
  "mosquito_coil",
  "frequent_frying",
  "dusty_cleaning",
  "none_unsure",
] as const;
export type IndoorSource = (typeof INDOOR_SOURCES)[number];

export const PURIFIER_STATUS = ["yes", "no", "unsure"] as const;
export type PurifierStatus = (typeof PURIFIER_STATUS)[number];

export const SENSITIVE_STATUS = ["yes", "no", "unspecified"] as const;
export type SensitiveStatus = (typeof SENSITIVE_STATUS)[number];

export const FLEXIBILITY = ["flexible", "somewhat", "fixed"] as const;
export type ScheduleFlexibility = (typeof FLEXIBILITY)[number];

export const householdProfileSchema = z.object({
  routine: z.enum(ROUTINES),
  commuteMode: z.enum(COMMUTE_MODES),
  /** Optional typical one-way distance in km, used only for impact estimates. */
  oneWayDistanceKm: z.number().min(0.2).max(150).optional().nullable(),
  budget: z.enum(BUDGETS),
  cookingFuel: z.enum(COOKING_FUELS),
  indoorSources: z.array(z.enum(INDOOR_SOURCES)).max(INDOOR_SOURCES.length),
  hasPurifier: z.enum(PURIFIER_STATUS),
  sensitiveMember: z.enum(SENSITIVE_STATUS),
  scheduleFlexibility: z.enum(FLEXIBILITY),
});
export type HouseholdProfile = z.infer<typeof householdProfileSchema>;

/* ------------------------------------------------------------------ */
/* Air-quality data (server-normalised provider payload)               */
/* ------------------------------------------------------------------ */

export const DATA_PROVIDER = "Open-Meteo Air Quality API";
export const DATA_MODEL =
  "CAMService global atmospheric composition forecast (area-level model data)";
export const DATA_DOCS_URL = "https://open-meteo.com/en/docs/air-quality-api";

export const derivedIndiaAqiSchema = z.object({
  status: z.enum(["available", "unavailable"]),
  /** Indicative index value. Present only when status is "available". */
  value: z.number().min(0).max(500).optional(),
  category: z.string().max(40).optional(),
  subIndices: z.record(z.string(), z.number()),
  pollutantsIncluded: z.array(z.string()),
  pollutantsExcluded: z.array(z.string()),
  label: z.literal("model-derived indicative India AQI estimate"),
  note: z.string(),
});
export type DerivedIndiaAqi = z.infer<typeof derivedIndiaAqiSchema>;

export const hourlyPointSchema = z.object({
  time: z.string(),
  pm25: z.number().nullable(),
  pm10: z.number().nullable(),
});
export type HourlyPoint = z.infer<typeof hourlyPointSchema>;

export const airQualitySuccessSchema = z.object({
  ok: z.literal(true),
  location: z.object({
    lat: z.number(),
    lon: z.number(),
    label: z.string(),
    gridNote: z.string(),
  }),
  source: z.object({
    provider: z.literal(DATA_PROVIDER),
    model: z.literal(DATA_MODEL),
    dataType: z.literal("modelled area-level forecast"),
    docsUrl: z.literal(DATA_DOCS_URL),
  }),
  fetchedAt: z.string(),
  freshness: z.object({
    status: z.enum(["fresh", "stale"]),
    ageMinutes: z.number().min(0),
    stalenessNote: z.string(),
  }),
  current: z.object({
    time: z.string(),
    pm25: z.number().nullable(),
    pm10: z.number().nullable(),
    usAqi: z.number().nullable(),
  }),
  derivedIndiaAqi: derivedIndiaAqiSchema,
  hourly: z.array(hourlyPointSchema),
  caveats: z.array(z.string()),
});
export type AirQualitySuccess = z.infer<typeof airQualitySuccessSchema>;

export const airQualityFailureSchema = z.object({
  ok: z.literal(false),
  location: z.object({
    lat: z.number(),
    lon: z.number(),
    label: z.string(),
  }),
  fetchedAt: z.string(),
  error: z.object({
    code: z.enum([
      "provider_timeout",
      "provider_error",
      "invalid_response",
      "invalid_input",
    ]),
    message: z.string(),
  }),
});
export type AirQualityFailure = z.infer<typeof airQualityFailureSchema>;

export const airQualityResponseSchema = z.discriminatedUnion("ok", [
  airQualitySuccessSchema,
  airQualityFailureSchema,
]);
export type AirQualityResponse =
  | AirQualitySuccess
  | AirQualityFailure;

/* ------------------------------------------------------------------ */
/* Better-window analysis (brief section 6.7)                          */
/* ------------------------------------------------------------------ */

export const betterWindowSchema = z.object({
  found: z.boolean(),
  startIso: z.string().optional(),
  endIso: z.string().optional(),
  windowMeanPm25: z.number().optional(),
  comparisonMeanPm25: z.number().optional(),
  improvementPercent: z.number().optional(),
  note: z.string(),
});
export type BetterWindow = z.infer<typeof betterWindowSchema>;

/* ------------------------------------------------------------------ */
/* Actions, impact and plan (brief sections 6.2-6.6)                   */
/* ------------------------------------------------------------------ */

export const PILLARS = ["breathe", "indoor", "emission"] as const;
export type Pillar = (typeof PILLARS)[number];

export const COST_BANDS = ["zero", "under_500", "500_2000", "above_2000"] as const;
export type CostBand = (typeof COST_BANDS)[number];

export const IMPACT_TYPES = [
  "travel_emissions",
  "outdoor_exposure",
  "indoor_source_control",
  "filtration",
  "cost",
  "time",
] as const;
export type ImpactType = (typeof IMPACT_TYPES)[number];

export const impactNumericSchema = z.object({
  value: z.number(),
  unit: z.string().max(30),
  formula: z.string().max(300),
  assumptions: z.array(z.string()).max(6),
  source: z.object({
    name: z.string().max(120),
    url: z.string().url(),
    year: z.number().int().min(2015).max(2100),
  }),
});
export type ImpactNumeric = z.infer<typeof impactNumericSchema>;

export const actionImpactSchema = z.object({
  type: z.enum(IMPACT_TYPES),
  /** Short human-readable summary, deterministic (never AI-generated). */
  display: z.string().max(220),
  numeric: impactNumericSchema.optional(),
  qualitative: z.string().max(220).optional(),
});
export type ActionImpact = z.infer<typeof actionImpactSchema>;

export const actionSourceSchema = z.object({
  name: z.string().max(120),
  url: z.string().url(),
});

export const catalogActionSchema = z.object({
  id: z.string().min(3).max(60),
  pillar: z.enum(PILLARS),
  title: z.string().max(80),
  /** Verb-led instruction (brief section 6.2). */
  instruction: z.string().max(220),
  costBand: z.enum(COST_BANDS),
  costNote: z.string().max(120),
  /** Estimated time the action itself takes, in minutes; null when not known. */
  effortMinutes: z.number().int().min(0).max(600).nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  assumptions: z.array(z.string()).max(5),
  methodology: z.string().max(300),
  source: actionSourceSchema.optional(),
});
export type CatalogAction = z.infer<typeof catalogActionSchema>;

export const planActionSchema = catalogActionSchema.extend({
  relevance: z.number().min(0),
  /** Deterministic, profile+data-specific explanation ("Why this today?"). */
  why: z.string().max(320),
  impact: actionImpactSchema,
});
export type PlanAction = z.infer<typeof planActionSchema>;

export const excludedActionSchema = z.object({
  actionId: z.string(),
  reason: z.string().max(160),
});
export type ExcludedAction = z.infer<typeof excludedActionSchema>;

export const planSchema = z.object({
  generatedAt: z.string(),
  airSummary: z.object({
    categoryLabel: z.string(),
    categoryValue: z.number().nullable(),
    dataSourceType: z.string(),
  }),
  pillars: z.object({
    breathe: z.array(planActionSchema).max(4),
    indoor: z.array(planActionSchema).max(4),
    emission: z.array(planActionSchema).max(4),
  }),
  excluded: z.array(excludedActionSchema).max(20),
  betterWindow: betterWindowSchema,
});
export type Plan = z.infer<typeof planSchema>;

/* ------------------------------------------------------------------ */
/* Assistant API contracts                                             */
/* ------------------------------------------------------------------ */

export const assistantRequestSchema = z.object({
  location: locationInputSchema,
  profile: householdProfileSchema,
  /** Optional untrusted user question (length-limited). */
  question: z.string().max(400).optional(),
  /** Actions the user marked as used / not practical (ids + verdict). */
  feedback: z
    .array(
      z.object({
        actionId: z.string().max(60),
        verdict: z.enum(["used", "not_practical"]),
      })
    )
    .max(40)
    .optional(),
});
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

export const queriedLocationSchema = z.object({
  label: z.string().max(100),
  /** ok = live data fetched; failed = geocoded but fetch failed; home = covered by the plan data. */
  status: z.enum(["ok", "failed", "home"]),
});
export type QueriedLocation = z.infer<typeof queriedLocationSchema>;

export const aiExplanationSchema = z.object({
  status: z.enum(["ok"]),
  /** Exact model id reported by the server (AI_MODEL, default gemini-3.5-flash-lite). */
  model: z.string().min(1).max(80),
  explanation: z.string().min(1).max(1200),
  actionNotes: z
    .array(
      z.object({
        actionId: z.string().max(60),
        note: z.string().min(1).max(300),
      })
    )
    .max(6),
  disclaimer: z.string(),
});
export type AiExplanation = z.infer<typeof aiExplanationSchema>;

export const aiUnavailableSchema = z.object({
  status: z.literal("unavailable"),
  reason: z.enum([
    "key_not_configured",
    "rate_limited",
    "timeout",
    "provider_error",
    "invalid_response",
    "request_too_large",
  ]),
  message: z.string(),
  model: z.string().min(1).max(80),
});
export type AiUnavailable = z.infer<typeof aiUnavailableSchema>;

export const assistantResponseSchema = z.object({
  air: airQualityResponseSchema,
  plan: planSchema.optional(),
  ai: z.union([aiExplanationSchema, aiUnavailableSchema]).optional(),
  /** Places resolved from the user's question (shown in the UI as live-data chips). */
  queriedLocations: z.array(queriedLocationSchema).max(4).optional(),
});
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;

/* ------------------------------------------------------------------ */
/* Community bulletin                                                  */
/* ------------------------------------------------------------------ */

export const communityBulletinSchema = z.object({
  generatedAt: z.string(),
  localityLabel: z.string(),
  dataLine: z.string(),
  actions: z.array(z.string().max(160)).max(3),
  footer: z.string(),
});
export type CommunityBulletin = z.infer<typeof communityBulletinSchema>;
