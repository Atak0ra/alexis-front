"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { importProjectZip, getImportStatus, friendlyError } from "@/lib/api-client";
import { FileArchive, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Bouton + modale d'import d'un ZIP de code existant dans un projet hébergé.
 *
 * Cas d'usage : un solopreneur a fait générer son front ailleurs (ex : Lovable)
 * et veut le pousser dans Alexis sans manipuler git. L'archive est validée côté
 * serveur (zip-slip, zip-bomb, symlinks) puis poussée ; le contexte est généré
 * dans la foulée.
 */
export default function ImportCodeButton({
  apiKey,
  projectId,
  onImported,
}: {
  apiKey: string;
  projectId: string;
  onImported?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"form" | "uploading" | "importing" | "done" | "failed">("form");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Nettoyage du polling à la fermeture / au démontage — évite les fuites.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setFile(null);
    setPhase("form");
    setWarnings([]);
    setError(null);
  }

  function handleClose() {
    // On empêche la fermeture pendant l'upload pour ne pas perdre le fil.
    if (phase === "uploading") return;
    setOpen(false);
    reset();
  }

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setPhase("uploading");
    try {
      const { warnings: w } = await importProjectZip(apiKey, projectId, file);
      setWarnings(w ?? []);
      setPhase("importing");
      // Poll du statut jusqu'à done | failed.
      pollRef.current = setInterval(async () => {
        try {
          const { status, error: statusError } = await getImportStatus(apiKey, projectId);
          if (status === "done") {
            if (pollRef.current) clearInterval(pollRef.current);
            setPhase("done");
            onImported?.();
          } else if (status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setError(statusError || "L'import a échoué.");
            setPhase("failed");
          }
        } catch {
          // Erreur réseau transitoire — on laisse le polling continuer.
        }
      }, 2500);
    } catch (err) {
      setError(friendlyError(err));
      setPhase("failed");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-hover"
      >
        <FileArchive className="h-4 w-4" aria-hidden="true" />
        Importer du code (ZIP)
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Importer du code existant"
        titleId="import-code-title"
        maxWidth="max-w-lg"
      >
        {phase === "done" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
            <p className="text-base font-semibold text-foreground">Code importé ✓</p>
            <p className="text-sm text-foreground-muted">
              Alexis analyse ton code et génère le contexte du projet. Tu peux fermer cette fenêtre.
            </p>
            {warnings.length > 0 && (
              <ul className="mt-2 w-full space-y-1 rounded-lg border border-warning-border bg-warning-bg p-3 text-left text-xs text-warning">
                {warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-foreground-muted">
              Uploade une archive ZIP contenant ton code source (ex : un export Lovable ou GitHub).
              Alexis la pousse dans le dépôt du projet et documente le contexte automatiquement.
            </p>
            <p className="mt-2 text-xs text-foreground-subtle">
              Exclus <code>node_modules</code> et les fichiers de build. Ne mets pas de secrets
              (<code>.env</code>) dans l'archive.
            </p>

            <div className="mt-4">
              <label
                htmlFor="import-zip-input"
                className="block text-sm font-medium text-foreground"
              >
                Fichier ZIP
              </label>
              <input
                id="import-zip-input"
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                disabled={phase === "uploading" || phase === "importing"}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1.5 block w-full text-sm text-foreground-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface-raised file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-hover"
              />
              {file && (
                <p className="mt-1.5 text-xs text-foreground-subtle">
                  {file.name} — {(file.size / (1024 * 1024)).toFixed(2)} Mo
                </p>
              )}
            </div>

            {(phase === "uploading" || phase === "importing") && (
              <p
                className="mt-4 flex items-center gap-2 text-sm text-foreground-muted"
                aria-live="polite"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {phase === "uploading" ? "Envoi de l'archive…" : "Import et analyse en cours…"}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger"
              >
                {error}
              </p>
            )}

            <ModalFooter>
              <button
                type="button"
                onClick={handleClose}
                disabled={phase === "uploading"}
                className="rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-hover disabled:opacity-50"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || phase === "uploading" || phase === "importing"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                <FileArchive className="h-4 w-4" aria-hidden="true" />
                Importer
              </button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
}
