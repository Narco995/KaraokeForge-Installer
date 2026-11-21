"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/client";
import { Button, EmptyState, Field, Input, Modal, PageHeader, Textarea } from "@/components/ui";
import { RefAssetLibrary } from "@/components/studio/shared";
import { useToast } from "@/components/providers";
import { FolderOpen, Plus } from "lucide-react";

type ProjectView = {
  id: string;
  name: string;
  description?: string | null;
  assets: { id: string; url: string; kind: string }[];
  updatedAt: string;
};

export default function ProjectsPage() {
  const toast = useToast();
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [assetIds, setAssetIds] = useState<string[]>([]);

  const load = () => api<{ projects: ProjectView[] }>("/api/projects").then((d) => setProjects(d.projects)).catch(() => {});
  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  const create = async () => {
    try {
      await api("/api/projects", { method: "POST", json: { ...form, assetIds } });
      setOpen(false);
      setPickerOpen(false);
      setForm({ name: "", description: "" });
      setAssetIds([]);
      await load();
      toast("Project created", "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not create project", "error");
    }
  };

  const remove = async (id: string) => {
    await api(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {});
    await load();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Projects"
        subtitle="Group assets into campaigns, episodes or client work."
        action={<Button variant="accent" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New project</Button>}
      />
      {loading ? (
        <p className="py-16 text-center text-sm text-muted">Loading…</p>
      ) : projects.length === 0 ? (
        <EmptyState icon={<FolderOpen className="h-10 w-10" />} title="No projects" body="Projects organize your assets into collections you can revisit." action={<Button variant="accent" onClick={() => setOpen(true)}>Create a project</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded-2xl border border-edge bg-panel/70 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{p.name}</h3>
                  {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{p.description}</p>}
                </div>
                <button onClick={() => void remove(p.id)} className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-danger/10 hover:text-danger">Delete</button>
              </div>
              {p.assets.length > 0 && (
                <div className="mt-3 flex gap-1.5 overflow-hidden">
                  {p.assets.slice(0, 4).map((a) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={a.id} src={a.url} alt="" className="h-14 w-14 rounded-lg border border-edge-2 object-cover" />
                  ))}
                  {p.assets.length > 4 && <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-edge-2 text-xs text-muted">+{p.assets.length - 4}</div>}
                </div>
              )}
              <p className="mt-3 text-[11px] text-muted">Updated {new Date(p.updatedAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New project">
        <div className="space-y-4">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Fall campaign" /></Field>
          <Field label="Description" hint="optional"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Assets</p>
            {pickerOpen || assetIds.length > 0 ? (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-edge p-2">
                <RefAssetLibrary open assetIds={assetIds} onChange={setAssetIds} onClose={() => {}} />
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setPickerOpen(true)}>Pick assets from library</Button>
            )}
          </div>
          <Button variant="accent" className="w-full" disabled={!form.name.trim()} onClick={create}>Create project</Button>
        </div>
      </Modal>
    </div>
  );
}
