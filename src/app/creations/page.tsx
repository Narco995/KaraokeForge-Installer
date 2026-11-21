"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { AssetTile, type JobAsset } from "@/components/studio/shared";
import { useToast } from "@/components/providers";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTERS = ["ALL", "IMAGE", "VIDEO"] as const;

export default function CreationsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [assets, setAssets] = useState<(JobAsset & { jobId?: string | null; createdAt: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ assets: (JobAsset & { jobId?: string | null; createdAt: string })[] }>(`/api/assets?limit=120${filter === "ALL" ? "" : `&kind=${filter}`}`)
      .then((d) => setAssets(d.assets))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const toggleFavorite = async (id: string, fav: boolean) => {
    setAssets((a) => a.map((x) => (x.id === id ? { ...x, favorite: fav } : x)));
    await api(`/api/assets/${id}`, { method: "PATCH", json: { favorite: fav } }).catch(() => toast("Could not save favorite", "error"));
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="My Creations" subtitle="Every asset generated in your workspace, newest first." />
      <div className="mb-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              filter === f ? "border-accent/70 bg-accent/15 text-text" : "border-edge text-muted hover:text-text"
            )}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted">Loading…</p>
      ) : assets.length === 0 ? (
        <EmptyState icon={<History className="h-10 w-10" />} title="Nothing here yet" body="Generate something in the studios and it lands here instantly." action={<Link href="/create" className="btn-accent rounded-xl px-5 py-2.5 text-sm font-medium">Open Create</Link>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => (
            <div key={a.id}>
              <AssetTile asset={a} onToggleFavorite={(id, fav) => void toggleFavorite(id, fav)} />
              <p className="mt-1 px-1 text-[10px] text-muted">{new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
