"use client";

/**
 * Location selection (brief section 5.1):
 * - searchable manual city list (always available, no permission needed);
 * - optional "use my location" with explicit browser consent; denial is
 *   handled gracefully and manual selection keeps working;
 * - shows the approximate grid area, never an exact address.
 */

import { useMemo, useState } from "react";
import { MapPin, Navigation, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepHeading } from "@/components/StepHeading";
import { searchCities } from "@/lib/data/cities";
import type { LocationInput } from "@/lib/schemas";

const CITY_LIST_ID = "hawasathi-city-list";

interface Props {
  selected: LocationInput | null;
  onSelect: (location: LocationInput) => void;
  disabled?: boolean;
}

export function LocationPicker({ selected, onSelect, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [geoStatus, setGeoStatus] = useState<
    "idle" | "locating" | "denied" | "error"
  >("idle");

  const results = useMemo(() => searchCities(query, 6), [query]);

  function selectCity(name: string, state: string, lat: number, lon: number) {
    onSelect({ lat, lon, label: `${name} (${state})` });
    setQuery("");
    setGeoStatus("idle");
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lon = Math.round(pos.coords.longitude * 100) / 100;
        // Deliberately coarse label; no address is stored or displayed.
        onSelect({
          lat,
          lon,
          label: `My area (~${lat.toFixed(1)}, ~${lon.toFixed(1)})`,
        });
        setGeoStatus("idle");
      },
      () => setGeoStatus("denied"),
      { timeout: 10_000, maximumAge: 600_000 }
    );
  }

  return (
    <section
      aria-labelledby="location-heading"
      className="card-shadow rounded-2xl border bg-card p-4 sm:p-6"
    >
      <StepHeading
        step={1}
        title="Choose your area"
        aside={
          selected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-900 ring-1 ring-emerald-600/30">
              <MapPin aria-hidden="true" className="h-4 w-4 text-emerald-700" />
              {selected.label}
            </span>
          ) : undefined
        }
      />
      <p className="mt-1 text-sm text-muted-foreground">
        Manual city selection always works. &quot;Use my location&quot; is
        optional and needs your browser permission.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            role="combobox"
            aria-expanded={results.length > 0 && query.length > 0}
            aria-controls={CITY_LIST_ID}
            aria-label="Search for your city or locality"
            className="h-11 pl-9"
            placeholder="Search city (e.g. Delhi, Patna, Kochi)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={useMyLocation}
          disabled={disabled || geoStatus === "locating"}
        >
          <Navigation aria-hidden="true" className="mr-2 h-4 w-4" />
          {geoStatus === "locating" ? "Locating…" : "Use my location"}
        </Button>
      </div>

      {results.length > 0 && query.length > 0 ? (
        <ul
          id={CITY_LIST_ID}
          className="mt-3 max-h-56 overflow-y-auto rounded-xl border shadow-sm"
        >
          {results.map((city) => (
            <li key={`${city.name}-${city.lat}`} className="border-b last:border-0">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-emerald-50 focus-visible:bg-emerald-50 focus-visible:outline-none"
                onClick={() =>
                  selectCity(city.name, city.state, city.lat, city.lon)
                }
              >
                <span>
                  {city.name}
                  <span className="ml-2 text-muted-foreground">
                    {city.state}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  ≈ {city.lat.toFixed(1)}, {city.lon.toFixed(1)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {geoStatus === "denied" ? (
        <p role="status" className="mt-3 text-sm text-amber-700">
          Location permission was denied. No problem - search and pick your
          city manually above.
        </p>
      ) : null}
      {geoStatus === "error" ? (
        <p role="status" className="mt-3 text-sm text-amber-700">
          Your browser does not support geolocation. Please pick the city
          manually.
        </p>
      ) : null}
    </section>
  );
}
