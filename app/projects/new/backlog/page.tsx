"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProjectBacklogStep from "@/components/project-backlog-step";

export default function BacklogPage() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("projectId");

  useEffect(() => {
    if (!projectId) router.replace("/dashboard");
  }, [projectId, router]);

  if (!projectId) return null;

  return (
    <ProjectBacklogStep
      projectId={projectId}
      onDone={() => router.push("/dashboard")}
      onSkip={() => router.push("/dashboard")}
    />
  );
}
