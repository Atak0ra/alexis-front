"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listDemoModeProjects, type ProjectOut } from "@/lib/api-client";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectOut[] | null>(null);

  useEffect(() => {
    listDemoModeProjects().then(setProjects);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-16">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Mes projets</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-rule">
            {(projects ?? []).map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-ink">{project.name}</p>
                  <p className="mt-1 font-mono text-xs text-ink-muted">{project.repo_url}</p>
                </div>
                <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                  {project.forge_provider}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
