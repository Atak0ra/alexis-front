"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProjectContextStep from "@/components/project-context-step";

export default function ContextPage() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("projectId");
  // new=true → projet tout neuf (repo vide) → on enchaîne sur l'étape backlog
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

  return (
    <ProjectContextStep
      projectId={projectId}
      onDone={handleContextDone}
      onSkip={() => router.push("/dashboard")}
    />
  );
}
