import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared admin building blocks — deliberately the same visual language as
 * the rest of the app (surface/brand/border tokens, rounded-xl cards), not
 * a separate admin theme. Consistency with the client-facing app matters
 * more here than a distinct identity.
 */
export function AdminCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-surface-raised shadow-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export const adminInputClass =
  "w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors";

export const adminButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-50 disabled:pointer-events-none transition-colors";

export const adminGhostButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-sunken transition-colors";
