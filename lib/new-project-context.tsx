"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface NewProjectDraft {
  // Step 1 — Repo & Forge
  name: string;
  repoUrl: string;
  forgeProvider: string;
  forgeToken: string;
  issuePrefix: string;
  // Step 2 — Agent
  agentChoice: string;
  agentApiKey: string;
  agentBaseUrl: string;
}

interface NewProjectState extends NewProjectDraft {
  setName: (v: string) => void;
  setRepoUrl: (v: string) => void;
  setForgeProvider: (v: string) => void;
  setForgeToken: (v: string) => void;
  setIssuePrefix: (v: string) => void;
  setAgentChoice: (v: string) => void;
  setAgentApiKey: (v: string) => void;
  setAgentBaseUrl: (v: string) => void;
  reset: () => void;
}

const INITIAL_DRAFT: NewProjectDraft = {
  name: "",
  repoUrl: "",
  forgeProvider: "github",
  forgeToken: "",
  issuePrefix: "",
  agentChoice: "claude",
  agentApiKey: "",
  agentBaseUrl: "",
};

const NewProjectContext = createContext<NewProjectState | null>(null);

export function NewProjectProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<NewProjectDraft>(INITIAL_DRAFT);

  const setName = useCallback((v: string) => setDraft((d) => ({ ...d, name: v })), []);
  const setRepoUrl = useCallback((v: string) => setDraft((d) => ({ ...d, repoUrl: v })), []);
  const setForgeProvider = useCallback((v: string) => setDraft((d) => ({ ...d, forgeProvider: v })), []);
  const setForgeToken = useCallback((v: string) => setDraft((d) => ({ ...d, forgeToken: v })), []);
  const setIssuePrefix = useCallback((v: string) => setDraft((d) => ({ ...d, issuePrefix: v })), []);
  const setAgentChoice = useCallback((v: string) => setDraft((d) => ({ ...d, agentChoice: v })), []);
  const setAgentApiKey = useCallback((v: string) => setDraft((d) => ({ ...d, agentApiKey: v })), []);
  const setAgentBaseUrl = useCallback((v: string) => setDraft((d) => ({ ...d, agentBaseUrl: v })), []);
  const reset = useCallback(() => setDraft(INITIAL_DRAFT), []);

  return (
    <NewProjectContext.Provider
      value={{
        ...draft,
        setName,
        setRepoUrl,
        setForgeProvider,
        setForgeToken,
        setIssuePrefix,
        setAgentChoice,
        setAgentApiKey,
        setAgentBaseUrl,
        reset,
      }}
    >
      {children}
    </NewProjectContext.Provider>
  );
}

export function useNewProject(): NewProjectState {
  const ctx = useContext(NewProjectContext);
  if (!ctx) throw new Error("useNewProject must be used within NewProjectProvider");
  return ctx;
}
