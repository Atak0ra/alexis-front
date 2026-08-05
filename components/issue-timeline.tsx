"use client";

import { useState } from "react";
import { getIssueSteps, type StepId } from "@/lib/issue-steps";
import type { Issue } from "@/lib/api-client";
import IssueTimelineRail from "@/components/issue-timeline-rail";
import IssueStepPanel from "@/components/issue-step-panel";

interface IssueTimelineProps {
  issue: Issue;
  states: Record<string, string>;
  projectId: string;
  apiKey: string;
  onIssueUpdated: (issue: Issue) => void;
}

export default function IssueTimeline({
  issue,
  states,
  projectId,
  apiKey,
  onIssueUpdated,
}: IssueTimelineProps) {
  const steps = getIssueSteps(issue, states);
  const activeStep = steps.find((s) => s.status === "current" || s.status === "attention") ?? steps[steps.length - 1];
  const [selectedStepId, setSelectedStepId] = useState<StepId>(activeStep.id);

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? activeStep;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <IssueTimelineRail steps={steps} selectedStepId={selectedStep.id} onSelect={setSelectedStepId} />
      <div className="min-w-0 flex-1">
        <IssueStepPanel
          key={selectedStep.id}
          step={selectedStep}
          issue={issue}
          states={states}
          projectId={projectId}
          apiKey={apiKey}
          onIssueUpdated={onIssueUpdated}
        />
      </div>
    </div>
  );
}
