import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Visual language of the admin back-office — "instrument panel" identity,
 * deliberately distinct from the rest of the app (graphite + mono + amber,
 * vs. the consumer app's off-white + Inter + indigo). The signature device
 * — a 2px amber signal-bar on every panel's top edge — recurs everywhere:
 * cards, the active nav item, primary buttons, focus rings.
 */
export function AdminPanel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-admin-line bg-admin-panel",
        className
      )}
      {...props}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-admin-signal" />
      {children}
    </div>
  );
}

export const adminEyebrowClass =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-admin-mist";

export const adminHeadingClass = "font-mono text-xl font-semibold uppercase tracking-wide text-admin-ink";

export const adminInputClass =
  "w-full rounded border border-admin-line bg-admin-bg px-3 py-2.5 font-mono text-sm text-admin-ink placeholder:text-admin-mist/60 focus:border-admin-signal focus:outline-none focus:ring-1 focus:ring-admin-signal transition-colors";

export const adminButtonClass =
  "inline-flex items-center justify-center gap-2 rounded bg-admin-signal px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-admin-bg hover:bg-admin-signal-hover disabled:opacity-40 disabled:pointer-events-none transition-colors";

export const adminGhostButtonClass =
  "inline-flex items-center justify-center gap-2 rounded border border-admin-line px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-admin-mist hover:border-admin-signal hover:text-admin-ink transition-colors";
