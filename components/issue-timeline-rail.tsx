"use client";

import { AlertTriangle, CheckCircle2, Code2, Inbox, Search, type LucideIcon } from "lucide-react";
import type { StepId, StepState } from "@/lib/issue-steps";
import { cn } from "@/lib/utils";

const STEP_ICONS: Record<StepId, LucideIcon> = {
  requested: Inbox,
  analysis: Search,
  development: Code2,
  done: CheckCircle2,
};

interface IssueTimelineRailProps {
  steps: StepState[];
  selectedStepId: StepId;
  onSelect: (id: StepId) => void;
}

export default function IssueTimelineRail({ steps, selectedStepId, onSelect }: IssueTimelineRailProps) {
  return (
    <nav
      aria-label="Étapes du ticket"
      className="flex shrink-0 gap-2 overflow-x-auto rounded-xl border border-border bg-surface-raised p-2 lg:sticky lg:top-6 lg:w-60 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-3"
    >
      {steps.map((step) => {
        const Icon = step.status === "attention" ? AlertTriangle : STEP_ICONS[step.id];
        const isUpcoming = step.status === "upcoming";
        const isSelected = step.id === selectedStepId;
        const isPulsing = step.status === "current" || step.status === "attention";

        const dotCls = cn(
          "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
          step.status === "done" && "border-brand bg-brand text-white",
          step.status === "current" && "border-brand bg-brand text-white",
          step.status === "attention" && "border-warning bg-warning text-white",
          isUpcoming && "border-border-strong bg-surface-sunken text-foreground-subtle"
        );

        return (
          <button
            key={step.id}
            type="button"
            data-testid={`issue-step-${step.id}`}
            data-status={step.status}
            disabled={isUpcoming}
            aria-current={isSelected ? "step" : undefined}
            onClick={() => onSelect(step.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              isSelected ? "bg-brand-light text-brand" : "text-foreground-muted hover:bg-surface-sunken",
              isUpcoming && "cursor-not-allowed opacity-50 hover:bg-transparent"
            )}
          >
            <span className={dotCls}>
              <Icon className="h-3.5 w-3.5" />
              {isPulsing && (
                <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                      step.status === "attention" ? "bg-warning" : "bg-brand"
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex h-2 w-2 rounded-full ring-2 ring-surface",
                      step.status === "attention" ? "bg-warning" : "bg-brand"
                    )}
                  />
                </span>
              )}
            </span>
            <span className="whitespace-nowrap">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
