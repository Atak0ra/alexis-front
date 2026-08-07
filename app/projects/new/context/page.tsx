"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProjectContextStep from "@/components/project-context-step";

export default function ContextPage() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("projectId");
  // new=true → repo vide (5 étapes au total) → on enchaîne sur l'étape backlog
  // absent   → repo avec code (4 étapes au total) → on va au dashboard
  const isNew = params.get("new") === "true";

  useEffect(() => {
    if (!projectId) router.replace("/dashboard");
  }, [projectId, router]);

  if (!projectId) return null;

  function handleContextDone() {
    if (isNew) {
      router.push(`/projects/new/backlog?projectId=${projectId}`);
    } else {
      router.push("/dashboard");
    }
  }

  // "Passer cette étape" suit la même logique que "Continuer" :
  // repo vide → backlog, repo avec code → dashboard.
  function handleContextSkip() {
    if (isNew) {
      router.push(`/projects/new/backlog?projectId=${projectId}`);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <ProjectContextStep
      projectId={projectId}
      onDone={handleContextDone}
      onSkip={handleContextSkip}
      // Repo vide : étape 4 sur 5 (backlog suit). Repo avec code : 4 sur 4.
      stepLabel={isNew ? "4 sur 5" : "4 sur 4"}
    />
  );
}
