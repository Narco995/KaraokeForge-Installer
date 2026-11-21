"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { EmptyState, PageHeader } from "@/components/ui";
import { AssetTile, type JobAsset } from "@/components/studio/shared";
import { useToast } from "@/components/providers";
import { Heart } from "lucide-react";

export default function FavoritesPage() {
  const toast = useToast();
  const [assets, setAssets] = useState<JobAsset[]>([]);

  useEffect(() => {
    api<{ assets: JobAsset[] }>("/api/assets?favorites=1&limit=120").then((d) => setAssets(d.assets)).catch(() => setAssets([]));
  }, []);

  const toggleFavorite = async (id: string, fav: boolean) => {
    setAssets((a) => a.filter((x) => x.id !== id || fav));
    if (!fav) setAssets((a) => a.filter((x) => x.id !== id));
    await api(`/api/assets/${id}`, { method: "PATCH", json: { favorite: fav } }).catch(() => toast("Could not update favorite", "error"));
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Favorites" subtitle="Your starred creative assets." />
      {assets.length === 0 ? (
        <EmptyState icon={<Heart className="h-10 w-10" />} title="No favorites yet" body="Star any asset from My Creations or a generation result to pin it here." action={<Link href="/creations" className="btn-accent rounded-xl px-5 py-2.5 text-sm font-medium">Browse creations</Link>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => <AssetTile key={a.id} asset={a} onToggleFavorite={(id, fav) => void toggleFavorite(id, fav)} />)}
        </div>
      )}
    </div>
  );
}
