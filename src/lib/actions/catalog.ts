/**
 * HawaSathi action catalogue.
 *
 * Every action here is ORIGINAL content written for this project, grounded
 * in public-health guidance from the sources listed per action (US EPA
 * indoor air guidance, WHO personal interventions guidance, CPCB advisory
 * categories). No text was copied from other projects or repositories.
 *
 * The catalogue defines WHAT an action is; the deterministic planner
 * (lib/planner/rules.ts) decides WHEN each action is relevant and computes
 * its impact. Gemini never invents actions or numbers (brief section 8.3).
 */

import type { CatalogAction } from "@/lib/schemas";

export const ACTION_CATALOG: readonly CatalogAction[] = [
  /* ---------------- Breathe safer today ---------------- */

  {
    id: "breathe_shift_outdoor_window",
    pillar: "breathe",
    title: "Move outdoor time to the cleaner window",
    instruction:
      "Schedule today's outdoor errands, walks or play time inside the forecast cleaner window instead of the peak-pollution hours.",
    costBand: "zero",
    costNote: "No cost - timing change only.",
    effortMinutes: 0,
    confidence: "medium",
    assumptions: [
      "Model forecast timing is approximate and can shift during the day.",
      "Applies only to activities that can be rescheduled.",
    ],
    methodology:
      "Selected only when the hourly PM2.5 forecast shows a sufficiently cleaner contiguous window; see lib/planner/window.ts and docs/DATA_METHODOLOGY.md.",
    source: {
      name: "WHO - Air pollution, personal interventions and risk communication",
      url: "https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication",
    },
  },
  {
    id: "breathe_limit_outdoor_exertion",
    pillar: "breathe",
    title: "Limit outdoor exertion today",
    instruction:
      "Move jogging, cycling-for-fitness and outdoor sports indoors or postpone them; keep necessary outdoor trips short and brisk.",
    costBand: "zero",
    costNote: "No cost.",
    effortMinutes: 0,
    confidence: "high",
    assumptions: [
      "Exposure reduction is the goal; this does not offset indoor exposure.",
    ],
    methodology:
      "Triggered when the indicative air category is Poor or worse, following WHO/CPCB public advisory logic. Deliberately suppresses 'cycling is low-emission' advice during severe smog.",
    source: {
      name: "WHO - Air pollution, personal interventions and risk communication",
      url: "https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication",
    },
  },
  {
    id: "breathe_mask_outdoors",
    pillar: "breathe",
    title: "Wear a certified respirator mask outdoors",
    instruction:
      "For unavoidable outdoor time in peak hours, wear a well-fitting certified N95/FFP2 respirator; check the seal around nose and chin.",
    costBand: "under_500",
    costNote:
      "Indicative cost of a small pack of certified N95/FFP2 masks in India (estimate).",
    effortMinutes: 5,
    confidence: "medium",
    assumptions: [
      "Real-world protection depends heavily on fit and consistent wear.",
      "Not a substitute for reducing outdoor time in severe smog.",
    ],
    methodology:
      "Suggested for Poor-and-worse categories when the household still has outdoor exposure (commute/school). No specific brand or price is claimed.",
    source: {
      name: "WHO - Air pollution, personal interventions and risk communication",
      url: "https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication",
    },
  },
  {
    id: "breathe_away_from_road",
    pillar: "breathe",
    title: "Wait away from the kerb",
    instruction:
      "At bus stops, school gates and auto stands, wait a few metres back from the road instead of right beside idling engines.",
    costBand: "zero",
    costNote: "No cost.",
    effortMinutes: 0,
    confidence: "high",
    assumptions: ["Effect is qualitative; no exposure percentage is claimed."],
    methodology:
      "Standard exposure-reduction practice: concentrations are typically highest directly beside traffic. No numeric reduction is claimed.",
    source: {
      name: "US EPA - Indoor air quality basics (exposure reduction principles)",
      url: "https://www.epa.gov/air-quality/indoor-air-quality",
    },
  },
  {
    id: "breathe_sensitive_indoor_play",
    pillar: "breathe",
    title: "Keep sensitive members' activity indoors today",
    instruction:
      "Shift children's outdoor play and older family members' outdoor exertion to indoor alternatives during the polluted hours.",
    costBand: "zero",
    costNote: "No cost.",
    effortMinutes: 0,
    confidence: "high",
    assumptions: [
      "General public-health information; not personalised medical advice.",
    ],
    methodology:
      "Boosted when the household flags a more sensitive member and the category is Poor or worse. Never states a diagnosis or a health percentage.",
    source: {
      name: "WHO - Air pollution, personal interventions and risk communication",
      url: "https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication",
    },
  },
  {
    id: "breathe_keep_windows_closed_peak",
    pillar: "breathe",
    title: "Keep windows shut during peak hours",
    instruction:
      "Keep windows and doors closed during the highest-pollution hours today, then air the home out only when the forecast improves.",
    costBand: "zero",
    costNote: "No cost.",
    effortMinutes: 0,
    confidence: "medium",
    assumptions: [
      "Indoor sources still need ventilation later; this is a peak-hours measure only.",
      "If your home has strong indoor smoke sources, closing windows alone will not fix air quality.",
    ],
    methodology:
      "Triggered when outdoor category is Very Poor or Severe AND no sufficiently cleaner ventilation window exists in the forecast.",
    source: {
      name: "US EPA - Air cleaners and air filters for the home",
      url: "https://www.epa.gov/indoor-air-quality-iaq/air-cleaners-and-air-filters-home",
    },
  },

  /* ---------------- Cleaner indoor air ---------------- */

  {
    id: "indoor_no_smoke_sources",
    pillar: "indoor",
    title: "Stop indoor smoke sources",
    instruction:
      "Do not smoke, burn incense/dhoop, or use mosquito coils indoors today; find smoke-free alternatives for the rest of the season.",
    costBand: "zero",
    costNote:
      "No cost; substitutes (mosquito repellent lotions, electric vaporisers) cost about the same or less than coils over a season (estimate).",
    effortMinutes: 10,
    confidence: "high",
    assumptions: [
      "Applies only to sources the household actually uses.",
      "No percentage reduction is claimed; benefit depends on how much the source is used.",
    ],
    methodology:
      "Source control is the highest-priority indoor measure in EPA guidance: removing the source beats diluting it. Boosted when the profile flags smoking, incense or coils.",
    source: {
      name: "US EPA - Indoor air quality basics",
      url: "https://www.epa.gov/air-quality/indoor-air-quality",
    },
  },
  {
    id: "indoor_damp_dusting",
    pillar: "indoor",
    title: "Dust with a damp cloth, not a dry broom",
    instruction:
      "Switch today's dusting/mopping to damp cloths and mops so dust is picked up instead of being resuspended into the air.",
    costBand: "zero",
    costNote: "No cost.",
    effortMinutes: 20,
    confidence: "high",
    assumptions: ["Qualitative benefit; no reduction percentage is claimed."],
    methodology:
      "Dry sweeping resuspends settled particles; damp cleaning is standard low-cost guidance in EPA consumer materials.",
    source: {
      name: "US EPA - Indoor air quality basics",
      url: "https://www.epa.gov/air-quality/indoor-air-quality",
    },
  },
  {
    id: "indoor_kitchen_exhaust",
    pillar: "indoor",
    title: "Run the kitchen exhaust while cooking",
    instruction:
      "Turn on the exhaust fan or chimney that vents outdoors before you start cooking, and leave it running a few minutes after; keep the kitchen door closed so fumes do not spread.",
    costBand: "zero",
    costNote: "No cost if an exhaust fan is already installed.",
    effortMinutes: 0,
    confidence: "high",
    assumptions: [
      "Only applies when the fan/chimney actually vents outdoors, not recirculating.",
      "Electricity cost is small but not zero.",
    ],
    methodology:
      "Cooking (especially frying) is a major indoor PM source; EPA guidance prioritises venting pollutants outdoors. Boosted when the profile flags frequent frying.",
    source: {
      name: "US EPA - Indoor air quality basics",
      url: "https://www.epa.gov/air-quality/indoor-air-quality",
    },
  },
  {
    id: "indoor_ventilate_cleaner_window",
    pillar: "indoor",
    title: "Air out the home in the cleaner window",
    instruction:
      "Open windows for 10-15 minutes during the forecast cleaner window to flush indoor air, then close again before pollution rises.",
    costBand: "zero",
    costNote: "No cost.",
    effortMinutes: 15,
    confidence: "medium",
    assumptions: [
      "Only offered when outdoor forecast is meaningfully cleaner than now.",
      "Opening windows is not recommended when outdoor air is worse than indoor air.",
    ],
    methodology:
      "Ventilation advice is condition-dependent (EPA): ventilate when outdoor air is cleaner. The planner only offers this when the hourly forecast shows a better window.",
    source: {
      name: "US EPA - Air cleaners and air filters for the home",
      url: "https://www.epa.gov/indoor-air-quality-iaq/air-cleaners-and-air-filters-home",
    },
  },
  {
    id: "indoor_purifier_filter_check",
    pillar: "indoor",
    title: "Check the purifier filter schedule",
    instruction:
      "Check your purifier's filter-change indicator or the manufacturer's interval today and note the replacement date; a clogged filter quietly loses performance.",
    costBand: "zero",
    costNote:
      "Checking costs nothing. Filter replacements are a recurring cost that varies by brand and size - no price is claimed here.",
    effortMinutes: 10,
    confidence: "high",
    assumptions: [
      "Follow the device manufacturer's instructions, not generic intervals.",
    ],
    methodology:
      "Offered only to households that already own a purifier. The app does not claim any specific removal percentage for the user's room.",
    source: {
      name: "US EPA - Air cleaners and air filters for the home",
      url: "https://www.epa.gov/indoor-air-quality-iaq/air-cleaners-and-air-filters-home",
    },
  },
  {
    id: "indoor_purifier_room_use",
    pillar: "indoor",
    title: "Run the purifier where the family actually is",
    instruction:
      "Run the purifier in the most-used closed room (bedroom at night, study/work room by day) rather than moving it around or leaving it in the hallway.",
    costBand: "zero",
    costNote: "No extra cost; electricity only.",
    effortMinutes: 5,
    confidence: "medium",
    assumptions: [
      "A purifier can reduce particles in the treated room; it does not clean the whole house or remove every pollutant.",
    ],
    methodology:
      "Placement and closed-room operation follow EPA guidance on air cleaner use. No removal percentage is claimed for the user's room.",
    source: {
      name: "US EPA - Air cleaners and air filters for the home",
      url: "https://www.epa.gov/indoor-air-quality-iaq/air-cleaners-and-air-filters-home",
    },
  },
  {
    id: "indoor_purifier_buying_guidance",
    pillar: "indoor",
    title: "If buying a purifier, size it to the room",
    instruction:
      "When choosing a purifier, match its clean-air delivery rate (CADR) to the room size, check filter replacement cost, and place it in the most-used room.",
    costBand: "above_2000",
    costNote:
      "Purifiers are a significant purchase; this action is shown only when the household budget allows it. No brands or prices are listed.",
    effortMinutes: 60,
    confidence: "medium",
    assumptions: [
      "General buying guidance, not a recommendation of any specific product.",
      "A purifier reduces particles in the treated room; it does not remove every pollutant.",
    ],
    methodology:
      "Offered only when no purifier is present and the stated budget exceeds ~2,000 INR, so the suggestion is affordable per the profile.",
    source: {
      name: "US EPA - Air cleaners and air filters for the home",
      url: "https://www.epa.gov/indoor-air-quality-iaq/air-cleaners-and-air-filters-home",
    },
  },
  {
    id: "indoor_zero_cost_source_control",
    pillar: "indoor",
    title: "Start with zero-cost source control",
    instruction:
      "Before spending on gadgets: remove smoke sources, damp-dust, cook with the exhaust on, and keep the most-used room closed and clean.",
    costBand: "zero",
    costNote: "No cost.",
    effortMinutes: 30,
    confidence: "high",
    assumptions: [
      "Source control is the first-line measure regardless of budget.",
    ],
    methodology:
      "Prioritised for households with zero or low budget and no purifier (EPA source-control hierarchy). No devices are promoted as certified protection.",
    source: {
      name: "US EPA - Indoor air quality basics",
      url: "https://www.epa.gov/air-quality/indoor-air-quality",
    },
  },
  {
    id: "indoor_biomass_cooking",
    pillar: "indoor",
    title: "Keep solid-fuel cooking smoke outdoors",
    instruction:
      "If any cooking happens on biomass/solid fuel, move it to a well-ventilated area outside the living space (or prefer LPG/electric) and never burn fuel in closed rooms.",
    costBand: "zero",
    costNote:
      "Switching fuel has cost implications; if switching is unaffordable, the zero-cost step is isolating the smoke away from living and sleeping areas.",
    effortMinutes: 0,
    confidence: "high",
    assumptions: [
      "Solid-fuel smoke indoors is a major health hazard; the app does not claim any specific reduction.",
      "Fuel choice is a household decision with real cost constraints.",
    ],
    methodology:
      "Offered only when the profile flags biomass/solid or mixed cooking fuel. Framed without shaming: switching is not always affordable.",
    source: {
      name: "WHO - Air pollution, personal interventions and risk communication",
      url: "https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication",
    },
  },
  {
    id: "indoor_no_plants_as_filter",
    pillar: "indoor",
    title: "Skip plants and gadgets as filtration",
    instruction:
      "Do not rely on houseplants, essential-oil diffusers or unverified 'air-cleaning' gadgets to remove pollution; they are not certified filtration.",
    costBand: "zero",
    costNote: "No cost - avoids wasted spending.",
    effortMinutes: 0,
    confidence: "high",
    assumptions: [
      "This action prevents a common wasted purchase rather than promising a measured benefit.",
    ],
    methodology:
      "EPA states that available evidence does not support plants as meaningful indoor PM control; ozone generators can be harmful. This action exists to prevent misleading purchases.",
    source: {
      name: "US EPA - Air cleaners and air filters for the home",
      url: "https://www.epa.gov/indoor-air-quality-iaq/air-cleaners-and-air-filters-home",
    },
  },

  /* ---------------- Lower-emission routine ---------------- */

  {
    id: "emission_metro_bus_shift",
    pillar: "emission",
    title: "Shift some trips to metro or bus",
    instruction:
      "Move one or two regular trips per week to metro/train or bus where that route exists for you; confirm the local option first.",
    costBand: "under_500",
    costNote:
      "Fare depends on your city; the app does not invent routes or fares and asks you to confirm availability.",
    effortMinutes: 0,
    confidence: "medium",
    assumptions: [
      "Numeric impact only when a trip distance is provided in the profile.",
      "No route, fare or timetable data is integrated.",
    ],
    methodology:
      "Per-km CO2e estimates use documented public emission factors in lib/impact/emissions.ts; the UI states factors are indicative.",
    source: {
      name: "UK DEFRA/BEIS GHG conversion factors 2024",
      url: "https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting",
    },
  },
  {
    id: "emission_carpool_share",
    pillar: "emission",
    title: "Share the car ride",
    instruction:
      "Carpool with colleagues or neighbours heading the same way, so the same trip carries more people in one vehicle.",
    costBand: "zero",
    costNote: "No cost; usually saves money per person.",
    effortMinutes: 15,
    confidence: "medium",
    assumptions: [
      "Impact assumes ~3 occupants sharing the car; adjust mentally if different.",
    ],
    methodology:
      "Vehicle emission factor divided by occupancy in lib/impact/emissions.ts, with the assumption documented on the card.",
    source: {
      name: "UK DEFRA/BEIS GHG conversion factors 2024",
      url: "https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting",
    },
  },
  {
    id: "emission_trip_chain",
    pillar: "emission",
    title: "Combine errands into one trip",
    instruction:
      "Plan errands as one round trip instead of separate cold starts; a warmed-up engine and fewer km mean less fuel burned.",
    costBand: "zero",
    costNote: "No cost; usually saves fuel money.",
    effortMinutes: 10,
    confidence: "medium",
    assumptions: [
      "No numeric claim is made unless you provide distances; multiple cold starts are disproportionally polluting, but the size of the effect varies.",
    ],
    methodology:
      "Qualitative unless distance data is supplied; the planner refuses to fabricate a number for unspecified trips (brief section 6.6).",
    source: {
      name: "UK DEFRA/BEIS GHG conversion factors 2024 (methodology notes on cold starts)",
      url: "https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting",
    },
  },
  {
    id: "emission_no_idle",
    pillar: "emission",
    title: "Switch off while waiting",
    instruction:
      "Turn the engine off when parked outside school, shops or gates; idling for more than ~10 seconds wastes more fuel than restarting.",
    costBand: "zero",
    costNote: "No cost; saves fuel.",
    effortMinutes: 0,
    confidence: "high",
    assumptions: [
      "No numeric CO2 claim; the benefit depends on idling time avoided.",
    ],
    methodology:
      "Anti-idling is a standard practical measure (also part of the community bulletin). No fabricated percentage is attached.",
    source: {
      name: "UK DEFRA/BEIS GHG conversion factors 2024 (cold-start/idling methodology notes)",
      url: "https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting",
    },
  },
  {
    id: "emission_remote_day",
    pillar: "emission",
    title: "Take a remote work/meeting day",
    instruction:
      "Move one commute day per week to remote work or virtual meetings if your school or employer allows it.",
    costBand: "zero",
    costNote: "No cost.",
    effortMinutes: 0,
    confidence: "medium",
    assumptions: [
      "Requires schedule flexibility; not offered to fixed-schedule households.",
      "Impact needs a trip distance to be computed numerically.",
    ],
    methodology:
      "Numeric impact uses the same documented mode-shift formula; without distance the card shows qualitative copy only.",
    source: {
      name: "UK DEFRA/BEIS GHG conversion factors 2024",
      url: "https://www.gov.uk/government/publications/government-conversion-factors-for-company-reporting",
    },
  },
  {
    id: "emission_walk_cycle_short",
    pillar: "emission",
    title: "Walk or cycle for short trips",
    instruction:
      "Use walking or cycling for short nearby trips instead of the car or two-wheeler - but only on days the air allows it.",
    costBand: "zero",
    costNote: "No cost.",
    effortMinutes: 0,
    confidence: "high",
    assumptions: [
      "Offered ONLY when the indicative category is Satisfactory or better, so the low-emission choice is also a low-exposure choice.",
    ],
    methodology:
      "Safety gate: this action is hard-blocked when the derived category is Poor or worse, per brief section 6.3 (never promote outdoor exercise in severe smog).",
    source: {
      name: "WHO - Air pollution, personal interventions and risk communication",
      url: "https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication",
    },
  },
  {
    id: "emission_stagger_trip_time",
    pillar: "emission",
    title: "Shift flexible trips off peak hours",
    instruction:
      "Move errands or flexible trips away from morning/evening peak pollution and traffic hours when the forecast supports it.",
    costBand: "zero",
    costNote: "No cost.",
    effortMinutes: 0,
    confidence: "low",
    assumptions: [
      "Peak timing is city-specific; the hourly forecast is the only timing signal used.",
    ],
    methodology:
      "Offered only to flexible/somewhat-flexible schedules when a better window exists; otherwise the card is excluded rather than guessed.",
    source: {
      name: "Open-Meteo Air Quality API (hourly forecast timing)",
      url: "https://open-meteo.com/en/docs/air-quality-api",
    },
  },
  {
    id: "emission_no_waste_burning",
    pillar: "emission",
    title: "Never burn waste or leaves",
    instruction:
      "Do not burn garbage, leaves or crop residue; hand separated waste to municipal collection instead.",
    costBand: "zero",
    costNote: "No cost.",
    effortMinutes: 0,
    confidence: "high",
    assumptions: [
      "Open burning is a significant local PM source; the app does not claim any city-level AQI impact.",
    ],
    methodology:
      "Included in household and community bulletins. The app does not claim to file complaints or contact authorities (brief section 6.8).",
    source: {
      name: "WHO - Air pollution, personal interventions and risk communication",
      url: "https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication",
    },
  },
];

export function actionById(id: string): CatalogAction | undefined {
  return ACTION_CATALOG.find((a) => a.id === id);
}
