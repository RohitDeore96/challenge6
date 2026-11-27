"use client";

/**
 * Pollutant detail table + hourly PM2.5/PM10 forecast chart.
 * Only plots what the provider actually returned; missing hours are gaps,
 * never interpolated fakes.
 */

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTimeIso } from "@/lib/format";
import type { AirQualitySuccess } from "@/lib/schemas";

interface Props {
  air: AirQualitySuccess;
}

const POLLUTANT_ROWS: {
  key: string;
  label: string;
  unit: string;
  note: string;
  getValue: (air: AirQualitySuccess) => number | null;
}[] = [
  {
    key: "pm25",
    label: "PM2.5 (fine particles)",
    unit: "µg/m³",
    note: "Main winter-smog pollutant; drives the indicative index most often.",
    getValue: (a) => a.current.pm25,
  },
  {
    key: "pm10",
    label: "PM10 (coarse particles)",
    unit: "µg/m³",
    note: "Includes dust and larger particles.",
    getValue: (a) => a.current.pm10,
  },
  {
    key: "usAqi",
    label: "US AQI",
    unit: "index",
    note: "US EPA index computed by Open-Meteo; a different system from the indicative India estimate.",
    getValue: (a) => a.current.usAqi,
  },
];

export function PollutantDetails({ air }: Props) {
  // Next 24 hours starting from the current provider hour.
  const chartData = air.hourly
    .filter((p) => Date.parse(p.time) >= Date.parse(air.current.time))
    .slice(0, 24)
    .map((p) => ({
      time: formatTimeIso(p.time),
      pm25: p.pm25,
      pm10: p.pm10,
    }));

  const hasChartData = chartData.some(
    (d) => d.pm25 !== null || d.pm10 !== null
  );

  return (
    <section
      aria-labelledby="pollutants-heading"
      className="rounded-xl border bg-card p-4 sm:p-6"
    >
      <h2 id="pollutants-heading" className="text-lg font-semibold">
        Pollutant details and hourly trend
      </h2>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <caption className="sr-only">
            Current pollutant values with units and notes
          </caption>
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="py-2 pr-4 font-medium">Value</th>
              <th scope="col" className="py-2 pr-4 font-medium">Now</th>
              <th scope="col" className="py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {POLLUTANT_ROWS.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{row.label}</td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {row.getValue(air) === null
                    ? "not available"
                    : `${Math.round(row.getValue(air)!)} ${row.unit}`}
                </td>
                <td className="py-2 text-muted-foreground">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Next 24 hours (model forecast)</h3>
        {hasChartData ? (
          <div
            className="mt-2 h-56 w-full"
            role="img"
            aria-label="Line chart of the next 24 hours of forecast PM2.5 and PM10 concentrations in micrograms per cubic metre. Exact values are in the data table and in the plan's timing advice."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  interval={3}
                  tickMargin={6}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={36}
                  unit=" µg"
                />
                <ReTooltip
                  formatter={(value) =>
                    typeof value === "number" && Number.isFinite(value)
                      ? `${Math.round(value)} µg/m³`
                      : "no data"
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="pm25"
                  name="PM2.5"
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="pm10"
                  name="PM10"
                  stroke="#b45309"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            The provider did not return hourly PM data for this area, so no
            trend is plotted.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Modelled forecast from {air.source.provider}; values can differ from
          street-level reality.
        </p>
      </div>
    </section>
  );
}
