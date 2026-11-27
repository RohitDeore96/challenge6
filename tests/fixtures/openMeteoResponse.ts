/**
 * Shared Open-Meteo response fixture used by provider and API tests.
 * Shape mirrors the real API (observed 2026-11); values are synthetic.
 */

export function makeOpenMeteoResponse() {
  // 24 past hours + 24 future hours, hourly PM2.5 around 100-140.
  const hours: string[] = [];
  const pm25: (number | null)[] = [];
  const pm10: (number | null)[] = [];
  const no2: (number | null)[] = [];
  const so2: (number | null)[] = [];
  const co: (number | null)[] = [];
  const o3: (number | null)[] = [];
  const nh3: (number | null)[] = [];

  const base = Date.parse("2026-11-27T09:00:00");
  for (let i = -23; i <= 24; i++) {
    const t = new Date(base + i * 3600_000);
    hours.push(t.toISOString().slice(0, 16));
    const isFuture = i > 0;
    // Future hours 10:00-11:00 (i=1,2) are much cleaner: 55 ug/m3.
    pm25.push(isFuture && (i === 1 || i === 2) ? 55 : 110 + (i % 7));
    pm10.push(120 + (i % 5));
    no2.push(30 + (i % 4));
    so2.push(10 + (i % 3));
    co.push(500 + (i % 100)); // ug/m3
    o3.push(40 + (i % 6));
    nh3.push(15 + (i % 8));
  }

  return {
    latitude: 28.6,
    longitude: 77.2,
    timezone: "Asia/Kolkata",
    current: {
      time: "2026-11-27T09:00",
      pm2_5: 112 as number | null,
      pm10: 121 as number | null,
      us_aqi: 190 as number | null,
    },
    hourly: {
      time: hours,
      pm2_5: pm25,
      pm10,
      nitrogen_dioxide: no2,
      sulphur_dioxide: so2,
      carbon_monoxide: co,
      ozone: o3,
      ammonia: nh3,
    },
  };
}
