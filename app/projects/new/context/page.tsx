"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProjectContextStep from "@/components/project-context-step";

export default function ContextPage() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("projectId");

  useEffect(() => {
    if (!projectId) router.replace("/dashboard");
  }, [projectId, router]);

  if (!projectId) return null;

  return <ProjectContextStep projectId={projectId} />;
}
