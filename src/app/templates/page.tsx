"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, PageHeader } from "@/components/ui";
import { WORKFLOWS, TEMPLATES } from "@/lib/templates";
import { CheckCircle2, ArrowRight, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TemplatesPage() {
  const [openWorkflow, setOpenWorkflow] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Templates & Workflows" subtitle="Guided creative systems and one-click prompt recipes." />

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Creative workflows</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {WORKFLOWS.map((w) => {
            const open = openWorkflow === w.id;
            return (
              <div key={w.id} className={cn("rounded-2xl border transition-colors", open ? "border-accent/50 bg-accent/5" : "border-edge bg-panel/70")}>
                <button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpenWorkflow(open ? null : w.id)}>
                  <div>
                    <h3 className="font-medium">{w.name}</h3>
                    <p className="mt-0.5 text-xs text-muted">{w.tagline} · {w.duration}</p>
                  </div>
                  <ArrowRight className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-90 text-accent")} />
                </button>
                {open && (
                  <div className="animate-fade-up space-y-3 border-t border-edge px-4 py-4">
                    {w.steps.map((s) => (
                      <div key={s.title} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <div>
                          <p className="text-sm font-medium">{s.title}</p>
                          <p className="mt-0.5 text-xs text-muted">{s.body}</p>
                          {s.cta && (
                            <Link href={s.cta.href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                              {s.cta.label} <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Prompt templates</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => {
            const href = t.kind === "IMAGE"
              ? `/studio/image?tool=${t.tool}&prompt=${encodeURIComponent(t.prompt)}`
              : `/studio/video?tool=${t.tool}&prompt=${encodeURIComponent(t.prompt)}&camera=${t.camera ?? "dolly_in"}`;
            return (
              <Link key={t.id} href={href} className="group rounded-2xl border border-edge bg-panel/70 p-4 transition-all hover:border-accent/50 hover:bg-accent/5">
                <div className="mb-2 flex items-center justify-between">
                  <LayoutTemplate className="h-4 w-4 text-accent" />
                  <Badge tone={t.kind === "IMAGE" ? "accent" : "default"}>{t.kind} · {t.aspect}</Badge>
                </div>
                <h3 className="font-medium">{t.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{t.prompt}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
