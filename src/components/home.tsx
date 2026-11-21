"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useAuth } from "@/components/providers";
import { Logo, Tagline } from "@/components/brand";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";
import { AssetTile, JobResultCard, useModelCatalog } from "@/components/studio/shared";
import { formatCredits, timeAgo, cn } from "@/lib/utils";
import { WORKFLOWS, TEMPLATES } from "@/lib/templates";
import {
  Image as ImageIcon, Clapperboard, UserRound, Scissors, Compass, LayoutTemplate,
  Sparkles, Coins, Zap, ArrowRight, Check,
} from "lucide-react";

export function Home() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  return user ? <Dashboard /> : <Landing />;
}

function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  const catalog = useModelCatalog();
  const [jobs, setJobs] = useState<unknown[]>([]);
  const [assets, setAssets] = useState<{ id: string; url: string; kind: string; favorite?: boolean }[]>([]);

  useEffect(() => {
    api<{ jobs: unknown[] }>("/api/jobs?limit=6").then((d) => setJobs(d.jobs)).catch(() => {});
    api<{ assets: { id: string; url: string; kind: string; favorite?: boolean }[] }>("/api/assets?limit=8").then((d) => setAssets(d.assets)).catch(() => {});
  }, []);

  const availableModels = catalog.filter((m) => m.available);
  const quickActions = [
    { href: "/studio/image?tool=text_to_image", label: "Generate an image", icon: ImageIcon },
    { href: "/studio/video?tool=text_to_video", label: "Generate a video", icon: Clapperboard },
    { href: "/studio/character", label: "Build a character", icon: UserRound },
    { href: "/studio/edit", label: "Cut a video", icon: Scissors },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <section className="aurora-bg animate-fade-up mb-8 rounded-3xl border border-edge p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Welcome back</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{user?.name ?? "Creator"}, what are we creating today?</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-2.5 rounded-xl border border-edge-2 bg-panel/80 px-4 py-3 text-sm font-medium transition-all hover:border-accent/60 hover:bg-accent/10"
            >
              <a.icon className="h-4 w-4 text-accent" />
              {a.label}
              <ArrowRight className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted"><Coins className="h-4 w-4 text-amber" /> Credits</div>
          <p className="mt-2 text-3xl font-bold text-amber">{formatCredits(user?.credits ?? 0)}</p>
          <Link href="/pricing" className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-accent">Get more <ArrowRight className="h-3 w-3" /></Link>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted"><Zap className="h-4 w-4 text-accent" /> Connected models</div>
          <p className="mt-2 text-3xl font-bold">{availableModels.length}<span className="text-base font-normal text-muted">/{catalog.length}</span></p>
          <p className="mt-2 text-xs text-muted">{availableModels.length ? "Examples: " + availableModels.slice(0, 2).map((m) => m.name).join(", ") : "Add a provider key to activate models"}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted"><Sparkles className="h-4 w-4 text-accent-2" /> Plan</div>
          <p className="mt-2 text-3xl font-bold capitalize">{user.plan.toLowerCase()}</p>
          <Link href="/settings" className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-accent">Manage <ArrowRight className="h-3 w-3" /></Link>
        </Card>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent generations</h2>
          <Link href="/creations" className="text-sm text-muted hover:text-accent">View all</Link>
        </div>
        {jobs.length === 0 ? (
          <EmptyState
            title="No generations yet"
            body="Your provider-backed creations will appear here."
            action={<Button variant="accent" onClick={() => (window.location.href = "/studio/image?tool=text_to_image")}>Open Image Studio</Button>}
          />
        ) : (
          <div className="space-y-3">{jobs.slice(0, 4).map((j) => <JobResultCard key={(j as { id: string }).id} job={j as never} />)}</div>
        )}
      </section>

      {assets.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest assets</h2>
            <Link href="/creations" className="text-sm text-muted hover:text-accent">View library</Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {assets.map((a) => <AssetTile key={a.id} asset={a} />)}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Start from a workflow</h2>
          <Link href="/templates" className="text-sm text-muted hover:text-accent">All templates</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOWS.slice(0, 4).map((w) => (
            <Link key={w.id} href={`/templates?workflow=${w.id}`} className="group rounded-2xl border border-edge bg-panel/70 p-4 transition-all hover:border-accent/50 hover:bg-accent/5">
              <Badge tone="accent">{w.duration}</Badge>
              <h3 className="mt-2 font-medium">{w.name}</h3>
              <p className="mt-1 text-xs text-muted">{w.tagline}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const FEATURES = [
  { icon: ImageIcon, title: "Image Studio", body: "Text-to-image, image-to-image, upscaling and background removal across multiple models." },
  { icon: Clapperboard, title: "Video Studio", body: "13 camera presets, start-frame conditioning and duration control on real video models." },
  { icon: UserRound, title: "Character Studio", body: "Reference-photo character libraries reused across images and video." },
  { icon: Scissors, title: "AI Editing", body: "Multi-track browser timeline with trim, split, text and audio — export real files." },
];

function Landing() {
  const catalog = useModelCatalog();
  const available = catalog.filter((m) => m.available);
  const engineReady = available.length > 0;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/pricing" className="rounded-xl px-4 py-2 text-sm text-muted hover:text-text">Pricing</Link>
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm text-muted hover:text-text">Log in</Link>
          <Link href="/signup" className="btn-accent rounded-xl px-4 py-2 text-sm font-medium">Start free</Link>
        </nav>
      </header>

      <section className="aurora-bg mx-auto max-w-6xl px-6 pb-16 pt-14 text-center sm:pt-20">
        <Badge tone="accent" className="animate-fade-up mb-5">
          {engineReady ? `${available.length} live models connected` : "Deployable with your provider keys"}
        </Badge>
        <h1 className="animate-fade-up text-4xl font-bold tracking-tight sm:text-6xl">
          Your Imagination.
          <br />
          <span className="gradient-text">No Limits.</span>
        </h1>
        <p className="animate-fade-up mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
          FREEFIELDER is a unified AI creative platform — images, video, consistent characters, cinematic
          workflows and a real editing suite, all in one workspace.
        </p>
        <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="btn-accent rounded-xl px-6 py-3 text-sm font-semibold shadow-[0_8px_40px_-8px_rgba(124,92,255,0.7)]">Create free account</Link>
          <Link href="/login" className="rounded-xl border border-edge-2 px-6 py-3 text-sm font-medium text-muted hover:text-text">Log in</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-5 transition-colors hover:border-accent/40">
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-4 text-lg font-semibold">Guided creative workflows</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOWS.map((w) => (
            <Link key={w.id} href={`/templates?workflow=${w.id}`} className="group rounded-2xl border border-edge bg-panel/70 p-4 transition-all hover:border-accent/50">
              <Badge tone="accent">{w.duration}</Badge>
              <h3 className="mt-2 font-medium">{w.name}</h3>
              <p className="mt-1 text-xs text-muted">{w.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-edge">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-8 text-center">
          <Tagline />
          <p className="text-xs text-muted/60">© {new Date().getFullYear()} FREEFIELDER AI. An independent AI creation platform.</p>
        </div>
      </footer>
    </div>
  );
}
