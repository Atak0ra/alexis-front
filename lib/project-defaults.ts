export const DEFAULT_STATES: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  spec: "Spec",
  spec_review: "Spec Review",
  spec_failed: "Spec Failed",
  plan: "Plan",
  plan_review: "Plan Review",
  plan_failed: "Plan Failed",
  dev: "Dev",
  dev_review: "Dev Review",
  dev_failed: "Dev Failed",
  to_merge: "To Merge",
  to_merge_failed: "To Merge Failed",
  done: "Done",
};

export const DEFAULT_TRIGGER_STATES: string[] = ["Todo", "Plan", "Dev", "To Merge"];

export const DEFAULT_MODELS: Record<string, string> = {
  spec: "claude-sonnet-4-5",
  plan: "claude-opus-4-5",
  dev: "claude-sonnet-4-5",
};
