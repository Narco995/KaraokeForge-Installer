"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, PageHeader } from "@/components/ui";
import { TEMPLATES } from "@/lib/templates";
import { Clapperboard, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TAGS = ["All", "Cinematic", "Product", "Portrait", "Fashion", "Anime", "Social", "UGC", "Advertising", "Nature", "Travel"];

export default function ExplorePage() {
  const [tag, setTag] = useState("All");
  const templates = TEMPLATES.filter((t) => tag === "All" || t.tags.includes(tag));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Explore"
        subtitle="Curated prompt recipes from the FREEFIELDER creative team. Open one in a studio to make it yours."
      />
      <div className="mb-6 overflow-x-auto pb-1">
        <div className="flex gap-2">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                tag === t ? "border-accent/70 bg-accent/15 text-text" : "border-edge text-muted hover:text-text"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const href = t.kind === "IMAGE"
            ? `/studio/image?tool=${t.tool}&prompt=${encodeURIComponent(t.prompt)}`
            : `/studio/video?tool=${t.tool}&prompt=${encodeURIComponent(t.prompt)}&camera=${t.camera ?? "dolly_in"}`;
          return (
            <Link key={t.id} href={href} className="group flex flex-col rounded-2xl border border-edge bg-panel/70 p-4 transition-all hover:border-accent/50 hover:bg-accent/5">
              <div className="mb-3 flex items-center gap-2">
                {t.kind === "IMAGE" ? <ImageIcon className="h-4 w-4 text-accent" /> : <Clapperboard className="h-4 w-4 text-accent-2" />}
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">{t.kind === "IMAGE" ? "Image" : "Video"} · {t.aspect}</span>
              </div>
              <h3 className="font-medium">{t.name}</h3>
              <p className="mt-1 line-clamp-3 flex-1 text-xs text-muted">{t.prompt}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.tags.map((x) => <Badge key={x}>{x}</Badge>)}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
