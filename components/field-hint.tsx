"use client";

import { useState, useRef, useEffect } from "react";

interface FieldHintProps {
  /** Short label shown in the tooltip header */
  title: string;
  /** Explanation text */
  description: string;
  /** Optional direct link to create/find the token */
  href?: string;
  /** Link label */
  hrefLabel?: string;
}

export default function FieldHint({ title, description, href, hrefLabel }: FieldHintProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={`Aide : ${title}`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-raised text-xs font-semibold text-foreground-muted hover:border-brand hover:text-brand transition-colors"
      >
        ?
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute left-7 top-0 z-50 w-72 rounded-xl border border-border bg-surface-raised p-4 shadow-modal"
        >
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground-muted">{description}</p>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              {hrefLabel ?? "Ouvrir →"}
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
