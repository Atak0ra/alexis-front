"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface NewProjectDraft {
  // Step 1 — Repo & Forge
  name: string;
  hosted: boolean;
  repoUrl: string;
  forgeProvider: string;
  forgeToken: string;
  githubUsername: string;
  issuePrefix: string;
  // Step 2 — Agent (BYOK uniquement)
  agentChoice: string;
  agentApiKey: string;
  agentBaseUrl: string;
  codeReviewEnabled: boolean;
  // Plan info — chargé depuis getMe() dans le layout
  isByok: boolean;
}

interface NewProjectState extends NewProjectDraft {
  setName: (v: string) => void;
  setHosted: (v: boolean) => void;
  setRepoUrl: (v: string) => void;
  setForgeProvider: (v: string) => void;
  setForgeToken: (v: string) => void;
  setGithubUsername: (v: string) => void;
  setIssuePrefix: (v: string) => void;
  setAgentChoice: (v: string) => void;
  setAgentApiKey: (v: string) => void;
  setAgentBaseUrl: (v: string) => void;
  setCodeReviewEnabled: (v: boolean) => void;
  setIsByok: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_DRAFT: NewProjectDraft = {
  name: "",
  hosted: false,
  repoUrl: "",
  forgeProvider: "github",
  forgeToken: "",
  githubUsername: "",
  issuePrefix: "",
  agentChoice: "claude",
  agentApiKey: "",
  agentBaseUrl: "",
  codeReviewEnabled: true,
  isByok: false,
};

const NewProjectContext = createContext<NewProjectState | null>(null);

export function NewProjectProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<NewProjectDraft>(INITIAL_DRAFT);

  const setName = useCallback((v: string) => setDraft((d) => ({ ...d, name: v })), []);
  const setHosted = useCallback((v: boolean) => setDraft((d) => ({ ...d, hosted: v })), []);
  const setRepoUrl = useCallback((v: string) => setDraft((d) => ({ ...d, repoUrl: v })), []);
  const setForgeProvider = useCallback((v: string) => setDraft((d) => ({ ...d, forgeProvider: v })), []);
  const setForgeToken = useCallback((v: string) => setDraft((d) => ({ ...d, forgeToken: v })), []);
  const setGithubUsername = useCallback((v: string) => setDraft((d) => ({ ...d, githubUsername: v })), []);
  const setIssuePrefix = useCallback((v: string) => setDraft((d) => ({ ...d, issuePrefix: v })), []);
  const setAgentChoice = useCallback((v: string) => setDraft((d) => ({ ...d, agentChoice: v })), []);
  const setAgentApiKey = useCallback((v: string) => setDraft((d) => ({ ...d, agentApiKey: v })), []);
  const setAgentBaseUrl = useCallback((v: string) => setDraft((d) => ({ ...d, agentBaseUrl: v })), []);
  const setCodeReviewEnabled = useCallback((v: boolean) => setDraft((d) => ({ ...d, codeReviewEnabled: v })), []);
  const setIsByok = useCallback((v: boolean) => setDraft((d) => ({ ...d, isByok: v })), []);
  const reset = useCallback(() => setDraft(INITIAL_DRAFT), []);

  return (
    <NewProjectContext.Provider
      value={{
        ...draft,
        setName,
        setHosted,
        setRepoUrl,
        setForgeProvider,
        setForgeToken,
        setGithubUsername,
        setIssuePrefix,
        setAgentChoice,
        setAgentApiKey,
        setAgentBaseUrl,
        setCodeReviewEnabled,
        setIsByok,
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
