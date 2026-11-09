"use client";

import { useRef, useState } from "react";
import type { BlogAsset } from "@/lib/admin/posts";

type Props = {
  postId?: string;
  assets: BlogAsset[];
  onChange: (assets: BlogAsset[]) => void;
  onInsert: (asset: BlogAsset) => void;
};

export function AssetLibrary({ postId, assets, onChange, onInsert }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [altText, setAltText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!postId || !file || !altText.trim()) {
      setError(postId ? "Choose an image and describe it first." : "Save the draft before uploading images.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("postId", postId);
      form.set("altText", altText.trim());
      form.set("file", file);
      const response = await fetch("/api/admin/blog-assets", { method: "POST", body: form });
      const payload = await response.json() as { asset?: BlogAsset; error?: string };
      if (!response.ok || !payload.asset) throw new Error(payload.error ?? "Upload failed");
      onChange([payload.asset, ...assets]);
      setAltText("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  async function remove(asset: BlogAsset) {
    if (!window.confirm(`Delete “${asset.altText}”?`)) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/blog-assets/${asset.id}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Delete failed");
      onChange(assets.filter((item) => item.id !== asset.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2 className="font-mono text-xs uppercase tracking-wide text-[color:var(--foreground)]/55">
        Images
      </h2>
      {!postId ? (
        <p className="mt-3 text-xs leading-5 text-[color:var(--foreground)]/55">
          Save the draft once to enable uploads.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="block w-full text-xs file:mr-2 file:rounded file:border file:border-[color:var(--foreground)]/15 file:bg-transparent file:px-2 file:py-1 file:text-xs"
          />
          <input
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="Describe the image"
            className="w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={pending}
            onClick={upload}
            className="rounded border border-[color:var(--foreground)]/18 px-2 py-1 text-xs disabled:opacity-50"
          >
            {pending ? "Working…" : "Upload image"}
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}

      <ul className="mt-4 space-y-3">
        {assets.map((asset) => (
          <li key={asset.id} className="border-t border-[color:var(--foreground)]/10 pt-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- Authenticated R2 asset preview. */}
            <img src={asset.url} alt="" className="mb-2 aspect-[16/9] w-full object-cover" />
            <p className="line-clamp-2 text-xs leading-4">{asset.altText}</p>
            <div className="mt-2 flex gap-2 font-mono text-[10px]">
              <button type="button" onClick={() => onInsert(asset)} className="text-[color:var(--accent)]">
                Insert
              </button>
              <button type="button" disabled={pending} onClick={() => remove(asset)} className="text-red-400 disabled:opacity-50">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
