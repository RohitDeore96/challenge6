"use client";

/**
 * Shared section heading with a numbered step chip.
 * Keeps the flow (1 -> 6) visually consistent across sections while
 * remaining a real heading element for screen readers.
 */

interface Props {
  step: number;
  title: string;
  /** Optional right-aligned status/action area. */
  aside?: React.ReactNode;
}

export function StepHeading({ step, title, aside }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2.5 text-lg font-semibold sm:text-xl">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-bold text-white shadow-sm"
        >
          {step}
        </span>
        <span className="sr-only">Step {step}: </span>
        {title}
      </h2>
      {aside}
    </div>
  );
}
