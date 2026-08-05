"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApiKey } from "@/lib/session";
import {
  getProject,
  getIssue,
  listIssueAssets,
  uploadIssueAsset,
  issueAssetContentUrl,
  AlexisApiError,
  friendlyError,
  type ProjectOut,
  type Issue,
  type IssueAsset,
} from "@/lib/api-client";
import { isLocalMode, getDemoIssueAssetDataUrl } from "@/lib/demo-data";
import { useNotificationsContext } from "@/lib/notifications-context";
import IssueTimeline from "@/components/issue-timeline";
import AssetUploadGrid from "@/components/asset-upload-grid";

export default function IssueDetailPage() {
  const params = useParams<{ id: string; issueId: string }>();
  const projectId = params.id;
  const issueId = params.issueId;

  const [project, setProject] = useState<ProjectOut | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<IssueAsset[]>([]);
  const [assetPreviewUrls, setAssetPreviewUrls] = useState<Record<string, string>>({});
  const [uploadingAsset, setUploadingAsset] = useState(false);

  const apiKey = getApiKey() ?? "";

  useEffect(() => {
    if (!apiKey) return;

    getProject(apiKey, projectId)
      .then(setProject)
      .catch((err) => setError(friendlyError(err)));

    // Utilise getIssue (GET /issues/{id}) plutôt que listIssues + find :
    // - 404 propre si l'issue n'existe pas
    // - pas de surcharge réseau (charge une seule issue, pas toutes)
    getIssue(apiKey, projectId, issueId)
      .then(setIssue)
      .catch((err) => {
        if (err instanceof AlexisApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(friendlyError(err));
        }
      });

    listIssueAssets(apiKey, projectId, issueId)
      .then((list) => {
        setAssets(list);

        // Le endpoint /content exige un Bearer token : une <img src> brute ne
        // peut pas attacher de header, donc on résout les previews en amont
        // (data: URL en démo, blob authentifié sinon) plutôt que de laisser
        // AssetUploadGrid pointer directement vers l'URL de contenu.
        if (isLocalMode()) {
          const urls: Record<string, string> = {};
          for (const a of list) {
            const dataUrl = getDemoIssueAssetDataUrl(issueId, a.id);
            if (dataUrl) urls[a.id] = dataUrl;
          }
          setAssetPreviewUrls((prev) => ({ ...prev, ...urls }));
        } else {
          Promise.all(
            list
              .filter((a) => a.content_type.startsWith("image/"))
              .map((a) =>
                fetch(issueAssetContentUrl(projectId, issueId, a.id), {
                  headers: { Authorization: `Bearer ${apiKey}` },
                })
                  .then((r) => r.blob())
                  .then((blob) => [a.id, URL.createObjectURL(blob)] as const)
                  .catch(() => null)
              )
          ).then((pairs) => {
            const urls: Record<string, string> = {};
            for (const pair of pairs) {
              if (pair) urls[pair[0]] = pair[1];
            }
            setAssetPreviewUrls((prev) => ({ ...prev, ...urls }));
          });
        }
      })
      .catch(() => setAssets([]));
  }, [projectId, issueId, apiKey]);

  // Applique en direct la transition d'état poussée par le backend (SSE) — sans
  // ça la page reste figée sur le snapshot du mount tant qu'elle n'est pas
  // rechargée manuellement (même bug que sur le Kanban projet).
  const { notifications } = useNotificationsContext();
  useEffect(() => {
    const latest = notifications.find((n) => n.project_id === projectId && n.issue_id === issueId);
    if (latest) {
      setIssue((prev) => (prev && prev.state !== latest.state ? { ...prev, state: latest.state } : prev));
    }
  }, [notifications, projectId, issueId]);

  async function handleUploadAsset(file: File) {
    setUploadingAsset(true);
    try {
      const asset = await uploadIssueAsset(apiKey, projectId, issueId, file);
      setAssets((prev) => [...prev, asset]);

      if (isLocalMode()) {
        const dataUrl = getDemoIssueAssetDataUrl(issueId, asset.id);
        if (dataUrl) {
          setAssetPreviewUrls((prev) => ({ ...prev, [asset.id]: dataUrl }));
        }
      } else if (asset.content_type.startsWith("image/")) {
        fetch(issueAssetContentUrl(projectId, issueId, asset.id), {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
          .then((r) => r.blob())
          .then((blob) => {
            setAssetPreviewUrls((prev) => ({ ...prev, [asset.id]: URL.createObjectURL(blob) }));
          })
          .catch((err) => console.error("[issue] asset preview failed", err));
      }
    } catch {
      // silencieux — pas de blocage du reste de la page pour un échec d'upload
    } finally {
      setUploadingAsset(false);
    }
  }

  function handleIssueUpdated() {
    // Recharge l'issue depuis l'API pour refléter le nouvel état et les
    // nouveaux commentaires (réponse agent, changement d'état, etc.).
    if (!apiKey) return;
    getIssue(apiKey, projectId, issueId)
      .then(setIssue)
      .catch((err) => console.error("[issue] reload failed", err));
  }

  if (error || notFound) {
    return (
      <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col bg-surface lg:min-h-screen">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <p className="text-base font-semibold text-foreground">
            {error ?? "Demande introuvable."}
          </p>
          <Link
            href={`/dashboard/${projectId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-sunken transition-colors"
          >
            ← Retour au projet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      {issue === null || project === null ? (
        <div className="mt-6 space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface-sunken" />
          <div className="h-40 animate-pulse rounded-xl bg-surface-sunken" />
        </div>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-bold text-foreground">{issue.title}</h1>
          <p className="mt-1 font-mono text-xs text-foreground-subtle">{issue.identifier}</p>

          <div className="mt-6">
            <AssetUploadGrid
              assets={assets}
              onUpload={handleUploadAsset}
              contentUrl={(assetId) => assetPreviewUrls[assetId] ?? ""}
              uploading={uploadingAsset}
            />
          </div>

          <div className="mt-8">
            <IssueTimeline
              issue={issue}
              states={project.states}
              projectId={projectId}
              apiKey={apiKey}
              onIssueUpdated={handleIssueUpdated}
            />
          </div>
        </>
      )}
    </div>
  );
}
