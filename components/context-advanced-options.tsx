"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ARCHITECTURE_OPTIONS,
  BACKEND_STACK_OPTIONS,
  FRONTEND_STACK_OPTIONS,
  DATABASE_OPTIONS,
  compileAdvancedBrief,
  type ArchitecturePattern,
  type SelectOption,
} from "@/lib/context-advanced-options";

interface Props {
  onChange: (compiledText: string) => void;
}

function resolveLabel(choice: string, other: string, options: SelectOption[]): string {
  if (!choice) return "";
  if (choice === "other") return other.trim();
  return options.find((o) => o.value === choice)?.label ?? "";
}

const selectClass =
  "w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

function StackSelect({
  id, label, options, choice, onChoiceChange, other, onOtherChange, otherPlaceholder,
}: {
  id: string;
  label: string;
  options: SelectOption[];
  choice: string;
  onChoiceChange: (v: string) => void;
  other: string;
  onOtherChange: (v: string) => void;
  otherPlaceholder: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} value={choice} onChange={(e) => onChoiceChange(e.target.value)} className={selectClass}>
        <option value="">Non spécifié</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {choice === "other" && (
        <Input
          className="mt-2"
          placeholder={otherPlaceholder}
          value={other}
          onChange={(e) => onOtherChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function ContextAdvancedOptions({ onChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [architecture, setArchitecture] = useState<ArchitecturePattern | "">("");

  const [monolithChoice, setMonolithChoice] = useState("");
  const [monolithOther, setMonolithOther] = useState("");
  const [frontendChoice, setFrontendChoice] = useState("");
  const [frontendOther, setFrontendOther] = useState("");
  const [backendChoice, setBackendChoice] = useState("");
  const [backendOther, setBackendOther] = useState("");
  const [bffChoice, setBffChoice] = useState("");
  const [bffOther, setBffOther] = useState("");
  const [databaseChoice, setDatabaseChoice] = useState("");
  const [databaseOther, setDatabaseOther] = useState("");

  const architectureLabel = enabled
    ? ARCHITECTURE_OPTIONS.find((o) => o.value === architecture)?.label ?? ""
    : "";

  const showFrontBack = architecture === "front_back" || architecture === "front_back_bff";

  const compiled = enabled
    ? compileAdvancedBrief({
        stackMonolith:
          architecture === "monolith" ? resolveLabel(monolithChoice, monolithOther, BACKEND_STACK_OPTIONS) : "",
        stackFrontend: showFrontBack ? resolveLabel(frontendChoice, frontendOther, FRONTEND_STACK_OPTIONS) : "",
        stackBackend: showFrontBack ? resolveLabel(backendChoice, backendOther, BACKEND_STACK_OPTIONS) : "",
        stackBff:
          architecture === "front_back_bff" ? resolveLabel(bffChoice, bffOther, BACKEND_STACK_OPTIONS) : "",
        architectureLabel,
        databaseLabel: resolveLabel(databaseChoice, databaseOther, DATABASE_OPTIONS),
      })
    : "";

  useEffect(() => {
    onChange(compiled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compiled]);

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-brand"
        />
        Option avancée
      </label>

      {enabled && (
        <div className="mt-3 space-y-3 rounded-xl border border-border bg-surface-raised p-4">
          <div>
            <Label htmlFor="adv-architecture">Architecture</Label>
            <select
              id="adv-architecture"
              value={architecture}
              onChange={(e) => setArchitecture(e.target.value as ArchitecturePattern | "")}
              className={selectClass}
            >
              <option value="">Non spécifié</option>
              {ARCHITECTURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {architecture === "monolith" && (
            <StackSelect
              id="adv-stack-monolith"
              label="Stack"
              options={BACKEND_STACK_OPTIONS}
              choice={monolithChoice}
              onChoiceChange={setMonolithChoice}
              other={monolithOther}
              onOtherChange={setMonolithOther}
              otherPlaceholder="Précise ta stack"
            />
          )}

          {showFrontBack && (
            <>
              <StackSelect
                id="adv-stack-frontend"
                label="Stack Frontend"
                options={FRONTEND_STACK_OPTIONS}
                choice={frontendChoice}
                onChoiceChange={setFrontendChoice}
                other={frontendOther}
                onOtherChange={setFrontendOther}
                otherPlaceholder="Précise ta stack frontend"
              />
              <StackSelect
                id="adv-stack-backend"
                label="Stack Backend"
                options={BACKEND_STACK_OPTIONS}
                choice={backendChoice}
                onChoiceChange={setBackendChoice}
                other={backendOther}
                onOtherChange={setBackendOther}
                otherPlaceholder="Précise ta stack backend"
              />
            </>
          )}

          {architecture === "front_back_bff" && (
            <StackSelect
              id="adv-stack-bff"
              label="Stack BFF"
              options={BACKEND_STACK_OPTIONS}
              choice={bffChoice}
              onChoiceChange={setBffChoice}
              other={bffOther}
              onOtherChange={setBffOther}
              otherPlaceholder="Précise ta stack BFF"
            />
          )}

          <StackSelect
            id="adv-database"
            label="Base de données"
            options={DATABASE_OPTIONS}
            choice={databaseChoice}
            onChoiceChange={setDatabaseChoice}
            other={databaseOther}
            onOtherChange={setDatabaseOther}
            otherPlaceholder="Précise la base de données"
          />
        </div>
      )}
    </div>
  );
}
