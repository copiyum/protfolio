"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ArticleBlock,
  ArticleDocument,
  InteractiveBlock,
  OptimismLeaseData,
  ProofBoreholeData,
  RevisionRaceData,
} from "@/lib/blog/document";
import {
  createEmptyDocument,
  OptimismLeaseDataSchema,
  ProofBoreholeDataSchema,
  RevisionRaceDataSchema,
} from "@/lib/blog/document";
import type { BlogAsset, PostDraft, PostRevisionSummary } from "@/lib/admin/posts";
import { AssetLibrary } from "./AssetLibrary";

type EditorValues = {
  title: string;
  proposedSlug: string;
  date: string;
  summary: string;
  tags: string[];
  coverAssetId?: string;
  body: ArticleDocument;
};

type ActionResult = {
  ok: boolean;
  postId?: string;
  draftRevision?: number;
  publishedRevision?: number;
  url?: string;
  error?: string;
};

type Props = {
  draft?: PostDraft;
  assets?: BlogAsset[];
  revisions?: PostRevisionSummary[];
  onCreate?: (value: EditorValues) => Promise<ActionResult>;
  onSave?: (value: EditorValues & { postId: string; expectedDraftRevision: number }) => Promise<ActionResult>;
  onPublish?: (value: { postId: string; expectedDraftRevision: number }) => Promise<ActionResult>;
  onUnpublish?: (value: { postId: string; expectedPublishedRevision: number }) => Promise<ActionResult>;
  onRestore?: (value: { postId: string; revision: number; expectedDraftRevision: number }) => Promise<ActionResult>;
  onDelete?: (value: { postId: string; expectedDraftRevision: number }) => Promise<ActionResult>;
};

const inputClass = "mt-1 w-full rounded border border-[color:var(--foreground)]/20 bg-transparent px-2 py-1.5 text-sm";
const insertableTypes = ["paragraph", "heading", "callout", "quote", "code", "table", "divider", "interactive"] as const;
type InsertableType = typeof insertableTypes[number];

function initialValues(draft?: PostDraft): EditorValues {
  if (draft) {
    return {
      title: draft.title,
      proposedSlug: draft.proposedSlug,
      date: draft.date,
      summary: draft.summary,
      tags: draft.tags,
      coverAssetId: draft.coverAssetId,
      body: draft.body,
    };
  }
  return {
    title: "",
    proposedSlug: "",
    date: new Date().toISOString().slice(0, 10),
    summary: "",
    tags: [],
    body: createEmptyDocument(),
  };
}

function defaultInteractiveData(kind: InteractiveBlock["kind"]): unknown {
  if (kind === "proof-borehole") return ProofBoreholeDataSchema.parse({});
  if (kind === "revision-race") return RevisionRaceDataSchema.parse({});
  return OptimismLeaseDataSchema.parse({});
}

function newBlock(type: InsertableType): ArticleBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "paragraph": return { id, type, text: "New paragraph." };
    case "heading": return { id, type, level: 2, text: "New section" };
    case "callout": return { id, type, tone: "note", title: "Note", text: "Helpful context." };
    case "quote": return { id, type, text: "A useful observation." };
    case "code": return { id, type, language: "typescript", filename: "example.ts", code: "", highlightLines: [] };
    case "table": return { id, type, headers: ["Column"], rows: [["Value"]] };
    case "divider": return { id, type };
    case "interactive": return { id, type, kind: "proof-borehole", data: defaultInteractiveData("proof-borehole") };
  }
}

function InteractiveFields({ block, onChange }: { block: InteractiveBlock; onChange: (block: InteractiveBlock) => void }) {
  function changeKind(kind: InteractiveBlock["kind"]) {
    onChange({ ...block, kind, data: defaultInteractiveData(kind) });
  }

  if (block.kind === "revision-race") {
    const data = block.data as RevisionRaceData;
    const setData = (patch: Partial<typeof data>) => onChange({ ...block, data: { ...data, ...patch } });
    return (
      <>
        <label className="block text-xs">Title<input className={inputClass} value={data.title} onChange={(event) => setData({ title: event.target.value })} /></label>
        <label className="mt-3 block text-xs">Starting revision<input type="number" min="0" className={inputClass} value={data.initialRevision} onChange={(event) => setData({ initialRevision: Number(event.target.value) })} /></label>
        <label className="mt-3 block text-xs">Caption<textarea className={inputClass} value={data.caption} onChange={(event) => setData({ caption: event.target.value })} /></label>
        <label className="mt-3 block text-xs">Diagram<select className={inputClass} value={block.kind} onChange={(event) => changeKind(event.target.value as InteractiveBlock["kind"])}><option value="proof-borehole">Proof borehole</option><option value="revision-race">Revision race</option><option value="optimism-lease">Optimism lease</option></select></label>
      </>
    );
  }

  if (block.kind === "optimism-lease") {
    const data = block.data as OptimismLeaseData;
    const setData = (patch: Partial<typeof data>) => onChange({ ...block, data: { ...data, ...patch } });
    return (
      <>
        <label className="block text-xs">Title<input className={inputClass} value={data.title} onChange={(event) => setData({ title: event.target.value })} /></label>
        <label className="mt-3 block text-xs">Freshness window (seconds)<input type="number" min="1" className={inputClass} value={data.ttlSeconds} onChange={(event) => setData({ ttlSeconds: Number(event.target.value) })} /></label>
        <label className="mt-3 block text-xs">Caption<textarea className={inputClass} value={data.caption} onChange={(event) => setData({ caption: event.target.value })} /></label>
        <label className="mt-3 block text-xs">Diagram<select className={inputClass} value={block.kind} onChange={(event) => changeKind(event.target.value as InteractiveBlock["kind"])}><option value="proof-borehole">Proof borehole</option><option value="revision-race">Revision race</option><option value="optimism-lease">Optimism lease</option></select></label>
      </>
    );
  }

  const data = block.data as ProofBoreholeData;
  const setData = (patch: Partial<typeof data>) => onChange({ ...block, data: { ...data, ...patch } });
  const updateScenario = (scenarioIndex: number, patch: Partial<typeof data.scenarios[number]>) => {
    const scenarios = data.scenarios.map((scenario, index) => index === scenarioIndex ? { ...scenario, ...patch } : scenario);
    setData({ scenarios });
  };
  const updateStage = (scenarioIndex: number, stageIndex: number, patch: Partial<typeof data.scenarios[number]["stages"][number]>) => {
    const scenario = data.scenarios[scenarioIndex];
    const stages = scenario.stages.map((stage, index) => index === stageIndex ? { ...stage, ...patch } : stage);
    updateScenario(scenarioIndex, { stages });
  };

  return (
    <>
      <label className="block text-xs">Diagram<select className={inputClass} value={block.kind} onChange={(event) => changeKind(event.target.value as InteractiveBlock["kind"])}><option value="proof-borehole">Proof borehole</option><option value="revision-race">Revision race</option><option value="optimism-lease">Optimism lease</option></select></label>
      <label className="mt-3 block text-xs">Caption<textarea className={inputClass} value={data.caption} onChange={(event) => setData({ caption: event.target.value })} /></label>
      <div className="mt-4 space-y-4">
        {data.scenarios.map((scenario, scenarioIndex) => (
          <fieldset key={`${scenarioIndex}-${scenario.label}`} className="border border-[color:var(--foreground)]/12 p-3">
            <legend className="px-1 font-mono text-[10px] uppercase tracking-wide">Scenario {scenarioIndex + 1}</legend>
            <label className="block text-xs">Label<input className={inputClass} value={scenario.label} onChange={(event) => updateScenario(scenarioIndex, { label: event.target.value })} /></label>
            <label className="mt-2 block text-xs">Verdict<textarea className={inputClass} value={scenario.verdict} onChange={(event) => updateScenario(scenarioIndex, { verdict: event.target.value })} /></label>
            <div className="mt-3 space-y-3">
              {scenario.stages.map((stage, stageIndex) => (
                <div key={`${stageIndex}-${stage.name}`} className="border-t border-[color:var(--foreground)]/10 pt-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
                    <label className="text-xs">Stage<input className={inputClass} value={stage.name} onChange={(event) => updateStage(scenarioIndex, stageIndex, { name: event.target.value })} /></label>
                    <label className="text-xs">Depth<input className={inputClass} value={stage.depth ?? ""} onChange={(event) => updateStage(scenarioIndex, stageIndex, { depth: event.target.value || undefined })} /></label>
                  </div>
                  <label className="mt-2 block text-xs">Detail<textarea className={inputClass} value={stage.detail} onChange={(event) => updateStage(scenarioIndex, stageIndex, { detail: event.target.value })} /></label>
                  <button type="button" disabled={scenario.stages.length <= 2} onClick={() => updateScenario(scenarioIndex, { stages: scenario.stages.filter((_, index) => index !== stageIndex) })} className="mt-2 font-mono text-[10px] text-red-400 disabled:opacity-35">Remove stage</button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-3 font-mono text-[10px]">
              <button type="button" disabled={scenario.stages.length >= 8} onClick={() => updateScenario(scenarioIndex, { stages: [...scenario.stages, { name: "Next stage", detail: "Describe the next boundary." }] })} className="text-[color:var(--accent)] disabled:opacity-35">Add stage</button>
              <button type="button" disabled={data.scenarios.length <= 1} onClick={() => setData({ scenarios: data.scenarios.filter((_, index) => index !== scenarioIndex) })} className="text-red-400 disabled:opacity-35">Remove scenario</button>
            </div>
          </fieldset>
        ))}
      </div>
      <button type="button" disabled={data.scenarios.length >= 8} onClick={() => setData({ scenarios: [...data.scenarios, { label: "New path", verdict: "Describe this route.", stages: [{ name: "Intent", detail: "The route begins." }, { name: "Result", detail: "The route completes." }] }] })} className="mt-3 font-mono text-[10px] text-[color:var(--accent)] disabled:opacity-35">Add scenario</button>
    </>
  );
}

function BlockFields({ block, assets, onChange }: { block: ArticleBlock; assets: BlogAsset[]; onChange: (block: ArticleBlock) => void }) {
  const set = (key: string, value: unknown) => onChange({ ...block, [key]: value } as ArticleBlock);

  if (block.type === "divider") return <p className="text-sm text-[color:var(--foreground)]/55">A quiet section divider.</p>;
  if (block.type === "heading") return (
    <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
      <label className="text-xs">Level<select className={inputClass} value={block.level} onChange={(event) => set("level", Number(event.target.value))}><option value="2">H2</option><option value="3">H3</option><option value="4">H4</option></select></label>
      <label className="text-xs">Heading<input className={inputClass} value={block.text} onChange={(event) => set("text", event.target.value)} /></label>
      <label className="text-xs sm:col-span-2">Depth marker<input className={inputClass} value={block.marker ?? ""} placeholder="Layer III · 15m" onChange={(event) => set("marker", event.target.value || undefined)} /></label>
    </div>
  );
  if (block.type === "code") return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Filename<input className={inputClass} value={block.filename ?? ""} onChange={(event) => set("filename", event.target.value || undefined)} /></label>
        <label className="text-xs">Language<input className={inputClass} value={block.language} onChange={(event) => set("language", event.target.value)} /></label>
      </div>
      <label className="mt-3 block text-xs">Highlighted lines<input className={inputClass} value={block.highlightLines.join(", ")} onChange={(event) => set("highlightLines", event.target.value.split(",").map(Number).filter((line) => Number.isInteger(line) && line > 0))} /></label>
      <label className="mt-3 block text-xs">Code<textarea className={`${inputClass} min-h-56 font-mono text-xs`} value={block.code} onChange={(event) => set("code", event.target.value)} /></label>
    </>
  );
  if (block.type === "image") return (
    <>
      <label className="block text-xs">Image<select className={inputClass} value={block.assetId} onChange={(event) => set("assetId", event.target.value)}>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.altText}</option>)}</select></label>
      <label className="mt-3 block text-xs">Alt text<input className={inputClass} value={block.alt} onChange={(event) => set("alt", event.target.value)} /></label>
      <label className="mt-3 block text-xs">Caption<input className={inputClass} value={block.caption ?? ""} onChange={(event) => set("caption", event.target.value || undefined)} /></label>
      <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={block.wide} onChange={(event) => set("wide", event.target.checked)} />Use the wide visual canvas</label>
    </>
  );
  if (block.type === "table") return (
    <>
      <label className="block text-xs">Headers, one per line<textarea className={inputClass} value={block.headers.join("\n")} onChange={(event) => set("headers", event.target.value.split("\n").filter(Boolean))} /></label>
      <label className="mt-3 block text-xs">Rows, cells separated by |<textarea className={`${inputClass} min-h-32`} value={block.rows.map((row) => row.join(" | ")).join("\n")} onChange={(event) => set("rows", event.target.value.split("\n").filter(Boolean).map((row) => row.split("|").map((cell) => cell.trim())))} /></label>
      <label className="mt-3 block text-xs">Caption<input className={inputClass} value={block.caption ?? ""} onChange={(event) => set("caption", event.target.value || undefined)} /></label>
    </>
  );
  if (block.type === "interactive") return <InteractiveFields block={block} onChange={onChange} />;
  if (block.type === "callout") return (
    <>
      <div className="grid gap-3 sm:grid-cols-[130px_1fr]">
        <label className="text-xs">Tone<select className={inputClass} value={block.tone} onChange={(event) => set("tone", event.target.value)}><option value="note">Note</option><option value="warning">Warning</option><option value="success">Success</option><option value="critical">Critical</option></select></label>
        <label className="text-xs">Title<input className={inputClass} value={block.title ?? ""} onChange={(event) => set("title", event.target.value || undefined)} /></label>
      </div>
      <label className="mt-3 block text-xs">Text<textarea className={inputClass} value={block.text} onChange={(event) => set("text", event.target.value)} /></label>
    </>
  );
  if (block.type === "quote") return (
    <>
      <label className="block text-xs">Quote<textarea className={`${inputClass} min-h-28`} value={block.text} onChange={(event) => set("text", event.target.value)} /></label>
      <label className="mt-3 block text-xs">Attribution<input className={inputClass} value={block.attribution ?? ""} onChange={(event) => set("attribution", event.target.value || undefined)} /></label>
    </>
  );
  return <label className="block text-xs">Text<textarea className={`${inputClass} min-h-36`} value={block.text} onChange={(event) => set("text", event.target.value)} /></label>;
}

export function PostEditor({
  draft,
  assets: initialAssets = [],
  revisions = [],
  onCreate,
  onSave,
  onPublish,
  onUnpublish,
  onRestore,
  onDelete,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState(() => initialValues(draft));
  const [draftRevision, setDraftRevision] = useState(draft?.revision ?? 0);
  const [publishedDraftRevision, setPublishedDraftRevision] = useState(draft?.baseRevision ?? 0);
  const [publishedRevision, setPublishedRevision] = useState(draft?.publishedRevision ?? 0);
  const [published, setPublished] = useState(draft?.published ?? false);
  const [publishedUrl, setPublishedUrl] = useState(
    draft?.publishedSlug ? `/blog/${draft.publishedSlug}` : undefined,
  );
  const [assets, setAssets] = useState(initialAssets);
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(draft ? "Draft saved" : "New draft");
  const [pending, startTransition] = useTransition();

  const blocks = values.body.blocks;
  const selectedBlock = blocks[selected];
  const titleSlug = useMemo(
    () => values.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    [values.title],
  );
  const hasUnpublishedChanges = dirty || draftRevision !== publishedDraftRevision;
  const canPublish = !dirty && (!published || hasUnpublishedChanges);

  function changeValues(update: (current: EditorValues) => EditorValues) {
    setValues(update);
    setDirty(true);
    setStatus("Unsaved changes");
  }

  function updateBlocks(next: ArticleBlock[]) {
    changeValues((current) => ({ ...current, body: { ...current.body, blocks: next } }));
  }

  function insertBlock(block: ArticleBlock) {
    const insertionIndex = selectedBlock ? selected + 1 : blocks.length;
    const next = [...blocks];
    next.splice(insertionIndex, 0, block);
    updateBlocks(next);
    setSelected(insertionIndex);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const payload = { ...values, proposedSlug: values.proposedSlug || titleSlug };
      const result = draft
        ? await onSave?.({ ...payload, postId: draft.postId, expectedDraftRevision: draftRevision })
        : await onCreate?.(payload);
      if (!result?.ok) {
        setError(result?.error ?? "Unable to save draft");
        return;
      }
      if (result.draftRevision !== undefined) setDraftRevision(result.draftRevision);
      setDirty(false);
      setStatus("Draft saved");
      if (!draft && result.postId) router.push(`/admin/posts/${result.postId}`);
    });
  }

  function publish() {
    if (!draft || !onPublish) return;
    if (dirty) {
      setError("Save the draft before publishing it.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onPublish({ postId: draft.postId, expectedDraftRevision: draftRevision });
      if (!result.ok) {
        setError(result.error ?? "Unable to publish");
        return;
      }
      setPublished(true);
      setPublishedDraftRevision(draftRevision);
      if (result.publishedRevision !== undefined) setPublishedRevision(result.publishedRevision);
      if (result.url) setPublishedUrl(result.url);
      setStatus("Published");
      router.refresh();
    });
  }

  function unpublish() {
    if (!draft || !onUnpublish) return;
    setError(null);
    startTransition(async () => {
      const result = await onUnpublish({ postId: draft.postId, expectedPublishedRevision: publishedRevision });
      if (!result.ok) {
        setError(result.error ?? "Unable to unpublish");
        return;
      }
      setPublished(false);
      setStatus("Unpublished");
      router.refresh();
    });
  }

  function restore(revision: number) {
    if (!draft || !onRestore) return;
    if (dirty && !window.confirm("Discard unsaved changes and restore this revision?")) return;
    setError(null);
    startTransition(async () => {
      const result = await onRestore({
        postId: draft.postId,
        revision,
        expectedDraftRevision: draftRevision,
      });
      if (!result.ok) {
        setError(result.error ?? "Unable to restore revision");
        return;
      }
      setStatus(`Restored revision ${revision}`);
      router.refresh();
    });
  }

  function remove() {
    if (!draft || !onDelete) return;
    if (!window.confirm("Delete this post, its revisions, and all uploaded images?")) return;
    setError(null);
    startTransition(async () => {
      const result = await onDelete({
        postId: draft.postId,
        expectedDraftRevision: draftRevision,
      });
      if (!result.ok) {
        setError(result.error ?? "Unable to delete post");
        return;
      }
      router.push("/admin/posts");
    });
  }

  return (
    <div className="space-y-5">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--foreground)]/10 bg-[color:var(--background)]/95 py-3 backdrop-blur">
        <div>
          <h1 className="text-xl font-semibold">{draft ? "Edit post" : "New post"}</h1>
          <p className="text-xs text-[color:var(--foreground)]/55" aria-live="polite">
            {status}{draft ? ` · draft ${draftRevision}${published ? ` · published ${publishedRevision}` : ""}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending || Boolean(draft && !dirty)} onClick={save} className="rounded bg-[color:var(--foreground)] px-3 py-1.5 text-sm text-[color:var(--background)] disabled:opacity-40">
            {pending ? "Working…" : "Save draft"}
          </button>
          {draft && (
            <>
              <Link href={`/admin/posts/${draft.postId}/preview`} target="_blank" rel="noreferrer" className="rounded border border-[color:var(--foreground)]/20 px-3 py-1.5 text-sm">
                Preview saved draft
              </Link>
              {published && publishedUrl && (
                <Link href={publishedUrl} target="_blank" rel="noreferrer" className="rounded border border-[color:var(--foreground)]/20 px-3 py-1.5 text-sm">
                  View live
                </Link>
              )}
              <button type="button" disabled={pending || !canPublish} onClick={publish} className="rounded border border-[color:var(--accent)]/50 px-3 py-1.5 text-sm text-[color:var(--accent)] disabled:opacity-40">
                Publish
              </button>
              {published && <button type="button" disabled={pending} onClick={unpublish} className="rounded border border-red-400/40 px-3 py-1.5 text-sm text-red-400 disabled:opacity-40">Unpublish</button>}
            </>
          )}
        </div>
      </header>

      {error && <p role="alert" className="border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <main className="space-y-4">
          <section className="grid gap-3 border border-[color:var(--foreground)]/12 p-4 md:grid-cols-2">
            <label className="text-xs">Title<input className={inputClass} value={values.title} onChange={(event) => changeValues((current) => ({ ...current, title: event.target.value }))} /></label>
            <label className="text-xs">Slug<input className={inputClass} value={values.proposedSlug} placeholder={titleSlug} onChange={(event) => changeValues((current) => ({ ...current, proposedSlug: event.target.value }))} /></label>
            <label className="text-xs">Date<input type="date" className={inputClass} value={values.date} onChange={(event) => changeValues((current) => ({ ...current, date: event.target.value }))} /></label>
            <label className="text-xs">Tags, comma-separated<input className={inputClass} value={values.tags.join(", ")} onChange={(event) => changeValues((current) => ({ ...current, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }))} /></label>
            <label className="text-xs md:col-span-2">Summary<textarea className={inputClass} value={values.summary} onChange={(event) => changeValues((current) => ({ ...current, summary: event.target.value }))} /></label>
          </section>

          <section className="space-y-2" aria-label="Article blocks">
            {blocks.map((block, index) => (
              <article key={block.id} className={`border p-3 ${selected === index ? "border-[color:var(--accent)]" : "border-[color:var(--foreground)]/12"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button type="button" onClick={() => setSelected(index)} className="font-mono text-xs uppercase tracking-wide">{index + 1}. {block.type}</button>
                  <div className="flex gap-2 font-mono text-[10px]">
                    <button type="button" disabled={index === 0} onClick={() => { const next = [...blocks]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; updateBlocks(next); setSelected(index - 1); }}>Up</button>
                    <button type="button" disabled={index === blocks.length - 1} onClick={() => { const next = [...blocks]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; updateBlocks(next); setSelected(index + 1); }}>Down</button>
                    <button type="button" onClick={() => insertBlock({ ...block, id: crypto.randomUUID() })}>Duplicate</button>
                    <button type="button" className="text-red-400" onClick={() => { if (!window.confirm("Delete this block?")) return; updateBlocks(blocks.filter((_, blockIndex) => blockIndex !== index)); setSelected(Math.max(0, index - 1)); }}>Delete</button>
                  </div>
                </div>
                {selected === index && <div className="mt-4 border-t border-[color:var(--foreground)]/10 pt-4"><BlockFields block={block} assets={assets} onChange={(nextBlock) => { const next = [...blocks]; next[index] = nextBlock; updateBlocks(next); }} /></div>}
              </article>
            ))}
          </section>

          <div className="flex flex-wrap gap-2 border-t border-[color:var(--foreground)]/12 pt-3" aria-label="Add block">
            {insertableTypes.map((type) => <button key={type} type="button" onClick={() => insertBlock(newBlock(type))} className="border border-[color:var(--foreground)]/16 px-2 py-1 font-mono text-[10px] hover:border-[color:var(--accent)]">+ {type}</button>)}
          </div>
        </main>

        <aside className="h-fit space-y-6 border border-[color:var(--foreground)]/12 p-4 xl:sticky xl:top-20">
          <AssetLibrary
            postId={draft?.postId}
            assets={assets}
            onChange={setAssets}
            onInsert={(asset) => insertBlock({ id: crypto.randomUUID(), type: "image", assetId: asset.id, alt: asset.altText, wide: true })}
          />
          {draft && (
            <section className="border-t border-[color:var(--foreground)]/10 pt-5">
              <h2 className="font-mono text-xs uppercase tracking-wide text-[color:var(--foreground)]/55">Published revisions</h2>
              {revisions.length === 0 ? <p className="mt-3 text-xs text-[color:var(--foreground)]/50">No published revisions yet.</p> : (
                <ul className="mt-3 space-y-2">
                  {revisions.map((revision) => <li key={revision.revision} className="flex items-center justify-between gap-3 text-xs"><span>Revision {revision.revision}</span><button type="button" disabled={pending} onClick={() => restore(revision.revision)} className="font-mono text-[10px] text-[color:var(--accent)] disabled:opacity-40">Restore</button></li>)}
                </ul>
              )}
            </section>
          )}
          {draft && onDelete && (
            <section className="border-t border-[color:var(--foreground)]/10 pt-5">
              <button
                type="button"
                disabled={pending}
                onClick={remove}
                className="font-mono text-[10px] text-red-400 disabled:opacity-40"
              >
                Delete post and assets
              </button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
