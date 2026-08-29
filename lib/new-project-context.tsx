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
  // Option avancée scaffolding — null = l'agent décide (cas 3)
  stack: "nextjs" | "fastapi" | "django" | null;
  architecture: "monolith" | "front_back" | "front_back_bff" | null;
  // Décidé à l'étape repo (hosted uniquement) : le client a déjà du code à importer
  // (ex: export Lovable) → masque le choix de stack (inutile, sera écrasé par
  // l'import) et affiche l'upload ZIP à l'étape description.
  hasOwnCode: boolean;
  // Brief métier — saisi à l'étape «Décris ton projet», avant la création.
  // Propagé dans context_content côté backend → alimente decide_stack,
  // generate_context et generate_backlog avec l'intention réelle du client.
  brief: string;
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
  setStack: (v: "nextjs" | "fastapi" | "django" | null) => void;
  setArchitecture: (v: "monolith" | "front_back" | "front_back_bff" | null) => void;
  setHasOwnCode: (v: boolean) => void;
  setBrief: (v: string) => void;
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
  stack: null,
  architecture: null,
  hasOwnCode: false,
  brief: "",
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
  const setStack = useCallback((v: "nextjs" | "fastapi" | "django" | null) => setDraft((d) => ({ ...d, stack: v })), []);
  const setArchitecture = useCallback((v: "monolith" | "front_back" | "front_back_bff" | null) => setDraft((d) => ({ ...d, architecture: v })), []);
  const setHasOwnCode = useCallback((v: boolean) => setDraft((d) => ({ ...d, hasOwnCode: v })), []);
  const setBrief = useCallback((v: string) => setDraft((d) => ({ ...d, brief: v })), []);
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
        setStack,
        setArchitecture,
        setHasOwnCode,
        setBrief,
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
