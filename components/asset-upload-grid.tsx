"use client";

import { useId } from "react";

interface AssetLike {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

interface AssetUploadGridProps {
  assets: AssetLike[];
  onUpload: (file: File) => void;
  contentUrl: (assetId: string) => string;
  uploading: boolean;
}

export default function AssetUploadGrid({ assets, onUpload, contentUrl, uploading }: AssetUploadGridProps) {
  const inputId = useId();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      onUpload(file);
    }
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      {assets.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface-raised p-2"
            >
              {asset.content_type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL d'API dynamique, next/image non applicable ici
                <img
                  src={contentUrl(asset.id)}
                  alt={asset.filename}
                  className="h-24 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-24 w-full items-center justify-center rounded-lg bg-surface-sunken text-xs text-foreground-subtle">
                  PDF
                </div>
              )}
              <p className="w-full truncate text-center text-xs text-foreground-muted" title={asset.filename}>
                {asset.filename}
              </p>
            </div>
          ))}
        </div>
      )}
      <div>
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-sunken transition-colors aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          {uploading ? "Envoi…" : "Ajouter un fichier"}
        </label>
        <input
          id={inputId}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          onChange={handleChange}
          disabled={uploading}
          aria-label="Ajouter un fichier"
          className="sr-only"
        />
      </div>
    </div>
  );
}
