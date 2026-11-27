"use client";

/**
 * HawaSathi entry page.
 *
 * The interactive app renders client-side only so persisted household
 * preferences can be read from localStorage without hydration mismatches.
 * The server-rendered shell below is a lightweight, accessible placeholder
 * while the app module loads.
 */

import dynamic from "next/dynamic";

const HawaSathiApp = dynamic(
  () => import("@/components/HawaSathiApp").then((m) => m.HawaSathiApp),
  {
    ssr: false,
    loading: () => (
      <div className="page-shell min-h-screen text-stone-900">
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 text-white">
          <div aria-hidden="true" className="hero-grid absolute inset-0" />
          <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 animate-pulse items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/40"
              />
              <div>
                <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                  HawaSathi
                </h1>
                <p className="mt-1 text-sm text-emerald-50/90 sm:text-base">
                  Loading your air-aware daily planner…
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
          <div
            className="card-shadow h-40 animate-pulse rounded-2xl border bg-card"
            role="status"
            aria-label="Loading HawaSathi"
          />
        </main>
      </div>
    ),
  }
);

export default function Home() {
  return <HawaSathiApp />;
}
