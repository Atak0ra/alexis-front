"use client";

import { useState } from "react";
import { AGENT_TEMPLATE } from "@/lib/agent-template";

export default function AgentTemplateHint() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(AGENT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-brand hover:underline"
      >
        {open ? "Masquer" : "Voir"} le template CLAUDE.md recommandé
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-border bg-surface-raised p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-foreground-muted">
              Alexis lit aussi CLAUDE.md/CONVENTIONS.md/AGENT.md à la racine de votre
              projet, s&apos;il existe, à chaque run. Gardez-le concis.
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
            >
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-surface-sunken p-3 text-xs text-foreground-muted whitespace-pre-wrap">
            {AGENT_TEMPLATE}
          </pre>
        </div>
      )}
    </div>
  );
}
