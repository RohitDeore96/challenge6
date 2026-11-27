/**
 * India CPCB National AQI categories.
 *
 * Source: Central Pollution Control Board, "About the National Air Quality
 * Index" and the AQI/NAMP reference report (Sept 2017). Last reviewed when
 * this module was written (see docs/DATA_METHODOLOGY.md for the review log).
 *
 * IMPORTANT: These categories are used ONLY for the model-derived indicative
 * India AQI estimate in this app. They are never presented as an official
 * CPCB AQI, and never mixed with the US AQI that Open-Meteo also provides.
 */

export interface AqiCategory {
  key: string;
  label: string;
  minIndex: number;
  maxIndex: number;
  /** Text-based advisory so status never relies on colour alone. */
  advisory: string;
  /** Colour tokens used only as a secondary cue next to the text label. */
  colorToken: string;
}

export const AICI_CATEGORY_NOTE =
  "CPCB category scale: Good (0-50), Satisfactory (51-100), Moderately polluted (101-200), Poor (201-300), Very Poor (301-400), Severe (401-500).";

export const CPCB_CATEGORIES: AqiCategory[] = [
  {
    key: "good",
    label: "Good",
    minIndex: 0,
    maxIndex: 50,
    advisory: "Air quality is considered satisfactory for most people.",
    colorToken: "category-good",
  },
  {
    key: "satisfactory",
    label: "Satisfactory",
    minIndex: 51,
    maxIndex: 100,
    advisory:
      "Minor breathing discomfort possible for sensitive individuals.",
    colorToken: "category-satisfactory",
  },
  {
    key: "moderate",
    label: "Moderately polluted",
    minIndex: 101,
    maxIndex: 200,
    advisory:
      "Breathing discomfort for people with lung or heart conditions, children and older adults.",
    colorToken: "category-moderate",
  },
  {
    key: "poor",
    label: "Poor",
    minIndex: 201,
    maxIndex: 300,
    advisory:
      "Breathing discomfort for most people on prolonged exposure; limit outdoor exertion.",
    colorToken: "category-poor",
  },
  {
    key: "very_poor",
    label: "Very Poor",
    minIndex: 301,
    maxIndex: 400,
    advisory:
      "Respiratory illness on prolonged exposure; avoid outdoor physical activity.",
    colorToken: "category-very-poor",
  },
  {
    key: "severe",
    label: "Severe",
    minIndex: 401,
    maxIndex: 500,
    advisory:
      "Serious health impact even for healthy people; stay indoors when possible and avoid all outdoor exertion.",
    colorToken: "category-severe",
  },
];

export function categoryForIndex(index: number): AqiCategory | undefined {
  if (!Number.isFinite(index)) return undefined;
  const clamped = Math.min(500, Math.max(0, index));
  return CPCB_CATEGORIES.find(
    (c) => clamped >= c.minIndex && clamped <= c.maxIndex
  );
}

export function categoryByKey(key: string): AqiCategory | undefined {
  return CPCB_CATEGORIES.find((c) => c.key === key);
}
