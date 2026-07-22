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

export const AIDER_DEFAULT_MODELS: Record<string, string> = {
  spec: "gpt-4o",
  plan: "gpt-4o",
  dev: "gpt-4o",
};

/** Modèles par défaut cohérents avec l'agent choisi — un projet "aider" avec une
 * clé OpenAI ne peut pas utiliser des noms de modèle Claude (agent_api_key est
 * injecté comme OPENAI_API_KEY, pas ANTHROPIC_API_KEY). */
export function getDefaultModels(agentChoice: string): Record<string, string> {
  return agentChoice === "aider" ? AIDER_DEFAULT_MODELS : DEFAULT_MODELS;
}
