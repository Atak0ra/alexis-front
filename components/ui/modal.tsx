"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible modal dialog.
 *
 * Features:
 * - role="dialog" + aria-modal + aria-labelledby
 * - Focus trap: Tab/Shift+Tab cycle within the modal
 * - Escape closes the modal
 * - Focus is restored to the trigger element on close
 * - Scroll lock on body while open
 */

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional id for the title element (auto-generated if omitted) */
  titleId?: string;
  children: ReactNode;
  className?: string;
  /** Max width class, defaults to max-w-lg */
  maxWidth?: string;
}

export function Modal({
  open,
  onClose,
  title,
  titleId = "modal-title",
  children,
  className,
  maxWidth = "max-w-lg",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save the element that had focus before opening
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the first focusable element inside the modal
      requestAnimationFrame(() => {
        const first = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)[0];
        first?.focus();
      });
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      // Restore focus to the trigger
      previousFocusRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Focus trap
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-modal",
          maxWidth,
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-2 text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * Convenience sub-component for modal footers.
 */
export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-t border-border px-6 py-4", className)}>
      {children}
    </div>
  );
}
