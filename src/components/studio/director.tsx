"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Field, Input, Select, Textarea, Badge, PageHeader } from "@/components/ui";
import { api } from "@/lib/client";
import type { DirectorPlan, DirectorShot } from "@/lib/director";

type ExecuteResult = {
  shotIndex: number;
  kind: string;
  tool: string;
  status: "QUEUED" | "BLOCKED";
  jobId?: string;
  blockedReason?: string;
  cost?: number;
};

const STYLE_LABELS: Record<string, string> = {
  cinematic: "Cinematic (35mm, graded)",
  product: "Product (studio backdrop)",
  ugc: "UGC (smartphone feel)",
  anime: "Anime (key visual)",
  documentary: "Documentary (natural light)",
  fashion: "Fashion (editorial strobes)",
};

export default function DirectorPanel() {
  const [brief, setBrief] = useState("");
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [priority, setPriority] = useState("quality");
  const [narration, setNarration] = useState(true);
  const [plan, setPlan] = useState<DirectorPlan | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [results, setResults] = useState<ExecuteResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planProduction = async () => {
    if (brief.trim().length < 10) {
      setError("Describe your production in at least a sentence.");
      return;
    }
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const res = await api<{ board: { id: string }; plan: DirectorPlan }>("/api/director/boards", {
        method: "POST",
        json: { title: title || undefined, brief: brief.trim(), style, priority, includeNarration: narration },
      });
      setPlan(res.plan);
      setBoardId(res.board.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Planning failed");
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    if (!boardId || !plan) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ executed: number; results: ExecuteResult[]; note?: string }>(
        `/api/director/boards/${boardId}/execute`,
        { method: "POST" }
      );
      setResults(res.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Director"
        subtitle="Describe your production once — get a shot-by-shot story plan with models, camera work and a credit budget."
      />
      <Card className="p-5 space-y-4">
        <Field label="Production brief">
          <Textarea
            rows={4}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={"e.g. A lone astronaut walks across a red desert at dusk. She approaches a monolith humming with light. The camera orbits as the sky ignites. End on her visor reflecting the explosion."}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Title (optional)">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Seminar" />
          </Field>
          <Field label="Style treatment">
            <Select value={style} onChange={(e) => setStyle(e.target.value)}>
              {Object.entries(STYLE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Routing priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="quality">Highest quality</option>
              <option value="speed">Fastest</option>
              <option value="cost">Cheapest</option>
            </Select>
          </Field>
          <Field label="Narration">
            <Select value={narration ? "yes" : "no"} onChange={(e) => setNarration(e.target.value === "yes")}>
              <option value="yes">Include voiceover shot</option>
              <option value="no">Video only</option>
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="accent" onClick={planProduction} loading={busy}>
            Plan production
          </Button>
          {plan && (
            <Button variant="outline" onClick={execute} loading={busy}>
              Execute {plan.shots.length} shots
            </Button>
          )}
          {plan && (
            <span className="text-sm text-muted">
              Budget: <strong className="text-text">{plan.totalCredits} credits</strong>
            </span>
          )}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </Card>

      {plan && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{plan.title}</h3>
            <div className="flex gap-2">
              <Badge tone="accent">{plan.style}</Badge>
              <Badge>{plan.aspect}</Badge>
              <Badge tone="amber">{plan.totalCredits} cr</Badge>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {plan.beats.map((b, i) => (
              <div key={i} className="rounded-xl border border-edge bg-ink/60 p-3 text-sm">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">{b.name}</span>
                <p className="mt-1 text-muted">{b.description}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-muted/70">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Kind</th>
                  <th className="py-2 pr-3">Model</th>
                  <th className="py-2 pr-3">Camera</th>
                  <th className="py-2 pr-3">Credits</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(plan as DirectorPlan & { shots: DirectorShot[] }).shots.map((s) => (
                  <tr key={s.index} className="border-t border-edge/60">
                    <td className="py-2 pr-3 text-muted">{s.index + 1}</td>
                    <td className="py-2 pr-3">{s.kind}</td>
                    <td className="py-2 pr-3">{s.modelName}</td>
                    <td className="py-2 pr-3 text-muted">{s.cameraPreset ? s.cameraPreset.replaceAll("_", " ") : "—"}</td>
                    <td className="py-2 pr-3">{s.estCredits}</td>
                    <td className="py-2">
                      {s.available ? <Badge tone="success">ready</Badge> : <Badge tone="danger">needs key</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {plan.warnings.length > 0 && (
            <div className="rounded-xl border border-amber/30 bg-amber/5 p-3 text-sm text-amber">
              {plan.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          {results && (
            <div className="rounded-xl border border-edge bg-ink/60 p-3 text-sm space-y-1">
              {results.map((r) => (
                <p key={r.shotIndex}>
                  Shot {r.shotIndex + 1} ({r.kind}):{" "}
                  {r.status === "QUEUED" ? (
                    <>
                      <Badge tone="success">queued</Badge>{" "}
                      <Link href="/creations" className="text-accent underline-offset-2 hover:underline">
                        track it in My Creations
                      </Link>
                    </>
                  ) : (
                    <>
                      <Badge tone="danger">blocked</Badge> <span className="text-muted">{r.blockedReason}</span>
                    </>
                  )}
                </p>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
