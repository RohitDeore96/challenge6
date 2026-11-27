/**
 * Small pure formatting helpers shared by UI components.
 * All are deterministic and unit-testable.
 */

export function formatUgM3(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "not available";
  }
  return `${Math.round(value)} µg/m³`;
}

export function formatAqiValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "unavailable";
  }
  return String(Math.round(value));
}

export function formatTimeIso(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "3 min ago" style, for freshness lines. */
export function formatAge(minutes: number): string {
  if (minutes <= 0) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) {
    return rem > 0 ? `${hours} h ${rem} min ago` : `${hours} hours ago`;
  }
  return `${Math.floor(hours / 24)} days ago`;
}

export function effortLabel(minutes: number | null): string {
  if (minutes === null) return "effort varies";
  if (minutes === 0) return "no extra time";
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h} h ${m} min` : `~${h} h`;
}

export function costBandLabel(band: string): string {
  const labels: Record<string, string> = {
    zero: "Free",
    under_500: "Under ₹500",
    "500_2000": "₹500–₹2,000",
    above_2000: "Above ₹2,000",
  };
  return labels[band] ?? band;
}
