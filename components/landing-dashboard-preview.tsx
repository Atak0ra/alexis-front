/**
 * LandingDashboardPreview — aperçu statique du vrai dashboard Alexis.
 *
 * Reproduit fidèlement l'interface réelle :
 * - Colonnes et labels exacts du TicketKanban
 * - Icônes lucide identiques
 * - Badges de type avec les mêmes couleurs
 * - Design system exact
 *
 * Statique pur — aucun fetch, aucune logique runtime.
 */
import {
  Bug, CheckCircle2, Code2, FileText, ListTodo, Sparkles, Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoTicket {
  id: string;
  type: "bug" | "feature" | "improvement";
  title: string;
  cost?: string;
  verified?: boolean;
}

interface DemoColumn {
  key: string;
  label: string;
  Icon: LucideIcon;
  tickets: DemoTicket[];
}

const TYPE_CONFIG = {
  bug:         { label: "Bug",       Icon: Bug,      cls: "bg-danger/10 text-danger" },
  feature:     { label: "Évolution", Icon: Sparkles, cls: "bg-brand/10 text-brand" },
  improvement: { label: "Amélior.",  Icon: Wrench,   cls: "bg-warning/15 text-warning" },
} as const;

function TypeBadge({ type }: { type: DemoTicket["type"] }) {
  const { label, Icon, cls } = TYPE_CONFIG[type];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", cls)}>
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {label}
    </span>
  );
}

const DEMO_COLUMNS: DemoColumn[] = [
  {
    key: "todo", label: "A faire", Icon: ListTodo,
    tickets: [
      { id: "PROJ-17", type: "bug",     title: "Erreur sur le formulaire de contact mobile" },
      { id: "PROJ-16", type: "feature", title: "Ajouter l'export PDF des factures" },
    ],
  },
  {
    key: "spec", label: "Cadrage", Icon: FileText,
    tickets: [
      { id: "PROJ-15", type: "feature", title: "Tableau de bord des ventes mensuel" },
    ],
  },
  {
    key: "dev", label: "Développement", Icon: Code2,
    tickets: [
      { id: "PROJ-12", type: "feature",     title: "Intégration paiement Wave", cost: "\$0.38", verified: true },
      { id: "PROJ-11", type: "improvement", title: "Optimisation chargement liste clients" },
    ],
  },
  {
    key: "done", label: "Terminé", Icon: CheckCircle2,
    tickets: [
      { id: "PROJ-9", type: "feature",     title: "Authentification par code SMS", cost: "\$0.54", verified: true },
      { id: "PROJ-8", type: "improvement", title: "Mode sombre sur l'interface",   cost: "\$0.21", verified: true },
    ],
  },
];

export default function LandingDashboardPreview() {
  return (
    <div className="w-full max-w-5xl mx-auto select-none" aria-hidden="true">

      {/* Chrome navigateur */}
      <div className="rounded-t-xl border border-border bg-surface-raised px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
          <div className="ml-3 flex-1 rounded-md bg-surface px-3 py-1 text-xs text-foreground-subtle font-mono">
            alexis.compeel.com/dashboard/mon-saas
          </div>
        </div>
      </div>

      {/* Corps */}
      <div className="border-x border-b border-border rounded-b-xl bg-surface overflow-hidden">

        {/* Header projet */}
        <div className="border-b border-border bg-surface-raised px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold font-mono">
              MS
            </div>
            <span className="text-sm font-semibold text-foreground">Mon SaaS de facturation</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-foreground-muted">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span><span className="font-semibold text-foreground">8</span> résolus</span>
            </span>
            <span className="flex items-center gap-1">
              <Code2 className="h-3.5 w-3.5 text-brand" />
              <span><span className="font-semibold text-foreground">3</span> en cours</span>
            </span>
            <span className="font-mono text-foreground-subtle">\$12,40 ce mois</span>
          </div>
        </div>

        {/* Kanban */}
        <div className="flex gap-0 overflow-x-auto">
          {DEMO_COLUMNS.map((col, ci) => (
            <div
              key={col.key}
              className={cn(
                "flex min-w-[155px] flex-1 flex-col border-border",
                ci < DEMO_COLUMNS.length - 1 && "border-r",
              )}
            >
              {/* En-tête colonne */}
              <div className="flex items-center gap-1.5 border-b border-border bg-surface-raised/60 px-3 py-2">
                <col.Icon className="h-3.5 w-3.5 shrink-0 text-foreground-muted" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted truncate">
                  {col.label}
                </span>
                <span className="ml-auto shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-foreground-subtle">
                  {col.tickets.length}
                </span>
              </div>

              {/* Cartes */}
              <div className="flex flex-col gap-1.5 p-2">
                {col.tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border border-border bg-surface-raised px-2.5 py-2 shadow-card">
                    <div className="mb-1.5">
                      <TypeBadge type={ticket.type} />
                    </div>
                    <p className="text-[11px] font-medium text-foreground leading-snug line-clamp-2">
                      {ticket.title}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-foreground-subtle">{ticket.id}</p>
                    {(ticket.verified || ticket.cost) && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {ticket.verified && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            testé
                          </span>
                        )}
                        {ticket.cost && (
                          <span className="font-mono text-[10px] text-foreground-subtle">{ticket.cost}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
