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
      <div className="min-h-screen bg-stone-50 text-stone-900">
        <header className="border-b bg-background">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700"
            >
              <svg viewBox="0 0 64 64" className="h-5 w-5" fill="none">
                <path
                  d="M12 26h20a6 6 0 1 0-6-6"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M12 36h26a6 6 0 1 1-6 6"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M14 46h14"
                  stroke="#a7f3d0"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-bold leading-tight">HawaSathi</h1>
              <p className="text-sm text-muted-foreground">
                Loading your air-aware daily planner…
              </p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
          <div className="rounded-xl border bg-card p-6" role="status">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-24 w-full animate-pulse rounded bg-muted" />
          </div>
        </main>
      </div>
    ),
  }
);

export default function Home() {
  return <HawaSathiApp />;
}
