"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, uploadFile, ApiError } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Badge, Button, Input, Select, Spinner } from "@/components/ui";
import { useAuth, useToast } from "@/components/providers";
import { getModel, type ModelCapabilities, type ModelKind } from "@/lib/models";
import { CloudOff, Download, Heart, ImagePlus, Zap } from "lucide-react";

export type CatalogModel = {
  id: string;
  name: string;
  provider: string;
  kind: ModelKind;
  available: boolean;
  reason?: string;
  description: string;
  strengths: string[];
  creditScore: number;
  avgSeconds: number;
  capabilities: ModelCapabilities;
};

export type JobAsset = { id: string; url: string; kind: string; mediaType?: string | null; favorite?: boolean };
export type JobView = {
  id: string;
  kind: string;
  tool: string;
  modelId: string;
  status: string;
  prompt: string;
  error?: string | null;
  costCredits: number;
  refunded?: boolean;
  createdAt: string;
  assets: JobAsset[];
};

export function useModelCatalog() {
  const [models, setModels] = useState<CatalogModel[]>([]);
  useEffect(() => {
    api<{ models: CatalogModel[] }>("/api/models").then((d) => setModels(d.models)).catch(() => setModels([]));
  }, []);
  return models;
}

export function useGenerationQueue() {
  const { user, setCredits, refresh } = useAuth();
  const toast = useToast();
  const [jobs, setJobs] = useState<JobView[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasActive = useMemo(() => jobs.some((j) => j.status === "QUEUED" || j.status === "RUNNING"), [jobs]);

  useEffect(() => {
    if (hasActive && !timer.current) {
      timer.current = setInterval(async () => {
        const activeIds = jobs.filter((j) => j.status === "QUEUED" || j.status === "RUNNING").map((j) => j.id);
        for (const id of activeIds) {
          try {
            const d = await api<{ job: JobView }>(`/api/jobs/${id}`);
            setJobs((prev) => prev.map((p) => (p.id === id ? d.job : p)));
            if (d.job.status === "SUCCEEDED") {
              toast(`Generation complete — ${d.job.assets.length} asset${d.job.assets.length > 1 ? "s" : ""}`, "success");
              void refresh();
            } else if (d.job.status === "FAILED") {
              toast(`Generation failed: ${d.job.error ?? "provider error"} — credits refunded`, "error");
              void refresh();
            } else if (d.job.status === "CANCELED") {
              void refresh();
            }
          } catch {
            /* transient */
          }
        }
      }, 3000);
    } else if (!hasActive && timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, [hasActive, jobs, toast, refresh]);

  const submit = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      try {
        const d = await api<{ job: JobView; cost: number }>("/api/generate", { method: "POST", json: payload });
        setJobs((prev) => [d.job, ...prev]);
        if (user) setCredits(Math.max(0, user.credits - d.cost));
        toast(`Queued — ${d.cost} credits held. Credits are refunded automatically if the job fails.`, "info");
        return true;
      } catch (err) {
        toast(err instanceof ApiError ? err.message : "Generation failed to start", "error");
        return false;
      }
    },
    [toast, user, setCredits]
  );

  const cancel = useCallback(
    async (id: string) => {
      try {
        await api(`/api/jobs/${id}`, { method: "DELETE" });
        setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: "CANCELED" } : j)));
        void refresh();
      } catch (err) {
        toast(err instanceof ApiError ? err.message : "Cancel failed", "error");
      }
    },
    [refresh, toast]
  );

  return { jobs, submit, cancel, hasActive };
}

export function RefUploader({
  refIds,
  onChange,
  accept = "image/png,image/jpeg,image/webp",
  max = 1,
  label = "Reference image",
}: {
  refIds: string[];
  onChange: (ids: string[]) => void;
  accept?: string;
  max?: number;
  label?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [urls]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const ids: string[] = [];
      for (const f of Array.from(files).slice(0, max - refIds.length)) {
        const { asset } = await uploadFile(f);
        ids.push(asset.id);
        setUrls((u) => ({ ...u, [asset.id]: URL.createObjectURL(f) }));
      }
      onChange([...refIds, ...ids]);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Upload failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className="flex flex-wrap gap-2">
        {refIds.map((id) => (
          <button
            key={id}
            onClick={() => onChange(refIds.filter((r) => r !== id))}
            className="group relative h-16 w-16 overflow-hidden rounded-lg border border-edge-2"
            title="Click to remove"
          >
            {urls[id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[id]} alt="reference" className="h-full w-full object-cover" />
            ) : (
              <span className="px-1 text-[9px] text-muted">{id.slice(0, 8)}</span>
            )}
            <span className="absolute inset-0 hidden items-center justify-center bg-danger/60 text-xs font-semibold text-white group-hover:flex">Remove</span>
          </button>
        ))}
        {refIds.length < max && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-edge-2 text-muted transition-colors hover:border-accent/60 hover:text-text disabled:opacity-50"
          >
            {busy ? <Spinner className="h-4 w-4" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-[10px]">Upload</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} multiple={max > 1} hidden onChange={(e) => void handleFiles(e.target.files)} />
    </div>
  );
}

export function RefAssetLibrary({
  open,
  assetIds,
  onChange,
}: {
  open: boolean;
  assetIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<JobAsset[]>([]);

  useEffect(() => {
    if (!open) return;
    api<{ assets: JobAsset[] }>("/api/assets?limit=100")
      .then((d) => setItems(d.assets))
      .catch(() => {
        toast("Could not load the asset library", "error");
        setItems([]);
      });
  }, [open, toast]);

  if (!open) return null;

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.length === 0 && <p className="col-span-full py-4 text-center text-xs text-muted">No assets in your library yet.</p>}
      {items.map((a) => {
        const picked = assetIds.includes(a.id);
        return (
          <button
            key={a.id}
            onClick={() => onChange(picked ? assetIds.filter((i) => i !== a.id) : [...assetIds, a.id])}
            className={cn(
              "relative h-16 overflow-hidden rounded-lg border transition",
              picked ? "border-accent ring-1 ring-accent" : "border-edge-2 hover:border-accent/60"
            )}
          >
            {a.kind === "VIDEO" ? (
              <video src={a.url} className="h-full w-full object-cover" preload="metadata" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt="asset" className="h-full w-full object-cover" />
            )}
            {picked && <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">&#10003;</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ModelGrid({
  models,
  kind,
  selected,
  onSelect,
}: {
  models: CatalogModel[];
  kind: ModelKind;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const ofKind = models.filter((m) => m.kind === kind);
  return (
    <div className="grid gap-2">
      {ofKind.map((m) => (
        <button
          key={m.id}
          onClick={() => m.available && onSelect(m.id)}
          disabled={!m.available}
          className={cn(
            "rounded-xl border p-3 text-left transition-all",
            selected === m.id ? "border-accent/70 bg-accent/10" : "border-edge bg-ink-2 hover:border-edge-2",
            !m.available && "cursor-not-allowed opacity-45"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{m.name}</span>
            {m.available ? (
              <Badge tone="accent">{m.creditScore} cr</Badge>
            ) : (
              <Badge tone="default"><CloudOff className="mr-1 h-3 w-3" />Not connected</Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted">{m.description}</p>
          {!m.available && m.reason && <p className="mt-1 text-[11px] text-amber/80">{m.reason}</p>}
        </button>
      ))}
      {ofKind.length === 0 && (
        <p className="rounded-xl border border-dashed border-edge px-4 py-8 text-center text-sm text-muted">
          No {kind.toLowerCase()} models in this deployment yet.
        </p>
      )}
    </div>
  );
}

export function JobResultCard({ job, onCancel }: { job: JobView; onCancel?: (id: string) => void }) {
  const model = getModel(job.modelId);
  const pending = job.status === "QUEUED" || job.status === "RUNNING";
  const failed = job.status === "FAILED";

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-edge bg-panel/70">
      <div className="flex items-center justify-between gap-2 border-b border-edge px-4 py-2.5 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <Badge tone={pending ? "accent" : failed ? "danger" : job.status === "CANCELED" ? "default" : "success"}>
            {pending ? "Generating…" : job.status}
          </Badge>
          <span className="truncate text-muted">
            {model?.name ?? job.modelId} · {job.tool.replaceAll("_", " ")} · {job.costCredits} cr{job.refunded ? " (refunded)" : ""}
          </span>
        </div>
        {pending && onCancel && <Button size="sm" variant="ghost" onClick={() => onCancel(job.id)}>Cancel</Button>}
      </div>

      <p className="px-4 pt-3 text-xs text-muted">{job.prompt.length > 220 ? `${job.prompt.slice(0, 220)}…` : job.prompt}</p>

      <div className="p-4">
        {pending && (
          <div className="shimmer flex h-44 items-center justify-center rounded-xl">
            <div className="text-center">
              <Spinner className="mx-auto h-6 w-6" />
              <p className="mt-2 text-xs text-muted">Real provider job — typically {model?.avgSeconds ?? 15}s</p>
            </div>
          </div>
        )}
        {failed && (
          <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {job.error ?? "Generation failed"} — you were not charged.
          </div>
        )}
        {job.status === "CANCELED" && <div className="rounded-xl border border-edge px-4 py-3 text-sm text-muted">Canceled — credits refunded.</div>}
        {job.assets.length > 0 && (
          <div className={cn("grid gap-2", job.assets.length > 1 && "grid-cols-2 sm:grid-cols-4")}>
            {job.assets.map((a) => (
              <AssetTile key={a.id} asset={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AssetTile({ asset, onToggleFavorite }: { asset: JobAsset; onToggleFavorite?: (id: string, fav: boolean) => void }) {
  const toast = useToast();
  const isVideo = asset.kind === "VIDEO";

  const doDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    void fetch(asset.url)
      .then((r) => r.blob())
      .then((b) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `freefielder-${asset.id}${isVideo ? ".mp4" : ".png"}`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast("Download failed", "error"));
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-edge bg-ink">
      {isVideo ? (
        <video src={asset.url} controls playsInline className="aspect-square h-full w-full object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.url} alt="generation result" loading="lazy" className="aspect-square h-full w-full object-cover" />
      )}
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(asset.id, !asset.favorite)}
            className={cn("rounded-lg bg-black/60 p-1.5 backdrop-blur", asset.favorite ? "text-amber" : "text-white/80 hover:text-amber")}
            aria-label="Toggle favorite"
          >
            <Heart className="h-4 w-4" fill={asset.favorite ? "currentColor" : "none"} />
          </button>
        )}
        <a href={asset.url} download onClick={doDownload} className="rounded-lg bg-black/60 p-1.5 text-white/80 backdrop-blur hover:text-white" aria-label="Download">
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export function unavailableNotice(models: CatalogModel[], kind: string) {
  const anyAvailable = models.some((m) => m.kind === kind && m.available);
  if (anyAvailable) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/5 px-4 py-3 text-sm">
      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
      <div>
        <p className="font-medium text-amber">No connected {kind.toLowerCase()} provider</p>
        <p className="mt-0.5 text-muted">
          Generation runs on real provider APIs. Configure REPLICATE_API_TOKEN or FAL_KEY in the server environment — these tools activate automatically once a key is present.
        </p>
      </div>
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function SeedField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Input inputMode="numeric" placeholder="Random" value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))} />;
}
