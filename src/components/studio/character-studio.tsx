"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, uploadFile } from "@/lib/client";
import { Button, EmptyState, Field, Input, Modal, PageHeader, Textarea, Badge } from "@/components/ui";
import { useModelCatalog, useGenerationQueue, JobResultCard, unavailableNotice, SelectField } from "./shared";
import { useToast } from "@/components/providers";
import { UserRoundIcon, Users, Video, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type CharacterView = {
  id: string;
  name: string;
  description?: string | null;
  coverAssetId?: string | null;
  references: { id: string; url: string }[];
};

type GenerationFlavor = "portrait" | "full_body" | "posed";

const FLAVORS: { id: GenerationFlavor; label: string; prompt: string }[] = [
  { id: "portrait", label: "Portrait", prompt: "professional portrait of {name}, head and shoulders, sharp focus" },
  { id: "full_body", label: "Full Body", prompt: "full-body studio shot of {name}, neutral pose, even lighting" },
  { id: "posed", label: "Action / Posed", prompt: "{name} in a dynamic pose, editorial lighting, full figure in frame" },
];

export function CharacterStudio() {
  const toast = useToast();
  const catalog = useModelCatalog();
  const { jobs, submit, cancel } = useGenerationQueue();

  const [characters, setCharacters] = useState<CharacterView[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [flavor, setFlavor] = useState<GenerationFlavor>("portrait");
  const [customPrompt, setCustomPrompt] = useState("");
  const [aspect, setAspect] = useState("1:1");

  const imageModels = catalog.filter((m) => m.kind === "IMAGE" && m.available);
  const [modelId, setModelId] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api<{ characters: CharacterView[] }>("/api/characters");
      setCharacters(d.characters);
    } catch {
      /* handled by empty state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modelId && imageModels.length) setModelId(imageModels[0].id);
  }, [imageModels, modelId]);

  const createCharacter = async () => {
    try {
      const d = await api<{ character: { id: string } }>("/api/characters", { method: "POST", json: form });
      setModalOpen(false);
      setForm({ name: "", description: "" });
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not create character", "error");
    }
  };

  const uploadRefs = async (characterId: string, files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const character = characters.find((c) => c.id === characterId);
      const ids = character ? character.references.map((r) => r.id) : [];
      for (const f of Array.from(files)) {
        const { asset } = await uploadFile(f);
        ids.push(asset.id);
      }
      await api(`/api/characters/${characterId}`, { method: "PATCH", json: { referenceAssetIds: ids } });
      await load();
      toast("Reference photos added", "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const removeCharacter = async (id: string) => {
    await api(`/api/characters/${id}`, { method: "DELETE" }).catch(() => {});
    if (selected === id) setSelected(null);
    await load();
  };

  const generate = async () => {
    const character = characters.find((c) => c.id === selected);
    const model = imageModels.find((m) => m.id === modelId);
    if (!character || !model) return;
    if (character.references.length === 0) {
      toast("Upload at least one reference photo first — generation uses real reference-image conditioning", "error");
      return;
    }
    const flavorDef = FLAVORS.find((f) => f.id === flavor)!;
    const prompt = (customPrompt.trim() || flavorDef.prompt.replace("{name}", character.name)) +
      (character.description ? `, ${character.name}: ${character.description}` : "");

    await submit({
      kind: "IMAGE",
      tool: "image_to_image",
      modelId: model.id,
      prompt,
      refAssetIds: character.references.slice(0, model.capabilities.maxRefImages || 1).map((r) => r.id),
      params: { aspectRatio: aspect, count: 2 },
    });
  };

  const current = characters.find((c) => c.id === selected);

  return (
    <div>
      <PageHeader
        title="Character Studio"
        subtitle="Build character libraries from reference photos, then reuse them across portraits, poses and video."
        action={
          <Button variant="accent" onClick={() => setModalOpen(true)}>
            <Users className="h-4 w-4" /> New character
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-edge bg-panel/60 px-4 py-3 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>
          Character references are sent to the provider as real conditioning images. Identity fidelity depends entirely on the
          model you select — FREEFIELDER does not fabricate identity preservation guarantees.
          {imageModels.length === 0 && " No image provider is connected yet, so generation is disabled."}
        </p>
      </div>
      {unavailableNotice(catalog, "IMAGE")}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted">Loading characters…</p>
      ) : characters.length === 0 ? (
        <EmptyState
          icon={<UserRoundIcon className="h-10 w-10" />}
          title="No characters yet"
          body="Create a character profile and upload a few reference photos to get started."
          action={<Button variant="accent" onClick={() => setModalOpen(true)}>Create your first character</Button>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Library ({characters.length})</p>
            <div className="space-y-2">
              {characters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                    selected === c.id ? "border-accent/70 bg-accent/10" : "border-edge bg-panel/60 hover:border-edge-2"
                  )}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-panel-2">
                    {c.references[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.references[0].url} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserRoundIcon className="h-5 w-5 text-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.references.length} reference{c.references.length === 1 ? "" : "s"}</p>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeCharacter(c.id);
                    }}
                    className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    Delete
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {current && (
              <>
                <div className="rounded-2xl border border-edge bg-panel/70 p-5">
                  <h3 className="font-semibold">{current.name}</h3>
                  {current.description && <p className="mt-1 text-sm text-muted">{current.description}</p>}

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Reference photos</p>
                    <div className="flex flex-wrap gap-2">
                      {current.references.map((r) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={r.id} src={r.url} alt="reference" className="h-20 w-20 rounded-lg border border-edge-2 object-cover" />
                      ))}
                      <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-edge-2 text-muted hover:border-accent/60 hover:text-text">
                        {uploading ? "Uploading…" : "+ Add"}
                        <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => void uploadRefs(current.id, e.target.files)} />
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-muted">Upload 3–8 photos of the same person for the strongest conditioning.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-edge bg-panel/70 p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Generate from this character</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {FLAVORS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFlavor(f.id)}
                        className={cn("rounded-xl border px-3 py-2.5 text-sm transition-all", flavor === f.id ? "border-accent/70 bg-accent/10" : "border-edge bg-ink-2 text-muted hover:text-text")}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Extra direction" hint="optional">
                      <Input placeholder="e.g. wearing a leather jacket, neon city backdrop" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
                    </Field>
                    <SelectField label="Aspect" value={aspect} onChange={setAspect} options={[{ value: "1:1", label: "1:1" }, { value: "4:3", label: "4:3" }, { value: "9:16", label: "9:16" }]} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {imageModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setModelId(m.id)}
                        className={cn("rounded-lg border px-3 py-1.5 text-xs", modelId === m.id ? "border-accent/70 bg-accent/10" : "border-edge text-muted hover:text-text")}
                      >
                        {m.name} · {m.creditScore * 2} cr
                      </button>
                    ))}
                  </div>
                  <Button variant="accent" className="mt-4 w-full" disabled={!modelId} onClick={generate}>
                    Generate with {characters.find((c) => c.id === selected)?.name}
                  </Button>
                  <Link
                    href={`/studio/video?prompt=${encodeURIComponent(`${current.name}, ${current.description ?? "cinematic scene"}`)}`}
                    className="mt-3 flex items-center justify-center gap-2 text-sm text-muted transition-colors hover:text-accent"
                  >
                    <Video className="h-4 w-4" /> Use this character in Video Studio
                  </Link>
                </div>
              </>
            )}

            {jobs.map((j) => (
              <JobResultCard key={j.id} job={j} onCancel={cancel} />
            ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New character">
        <div className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nova" />
          </Field>
          <Field label="Description" hint="used in every prompt">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="short dark hair, strong jawline, amber eyes…" />
          </Field>
          <Button variant="accent" className="w-full" disabled={!form.name.trim()} onClick={createCharacter}>
            Create character
          </Button>
        </div>
      </Modal>
    </div>
  );
}
