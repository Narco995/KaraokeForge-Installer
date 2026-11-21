"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/ui";
import { useModelCatalog, useGenerationQueue, ModelGrid, RefUploader, JobResultCard, unavailableNotice, SeedField, SelectField, type CatalogModel } from "./shared";
import { MODELS } from "@/lib/models";
import { Wand2, Scissors, Scaling, Eraser, Type } from "lucide-react";
import { cn } from "@/lib/utils";

const IMAGE_TOOLS = [
  { id: "text_to_image", label: "Text → Image", icon: Type, cap: "textToImage" as const },
  { id: "image_to_image", label: "Image → Image", icon: Wand2, cap: "imageToImage" as const },
  { id: "upscale", label: "Upscale / Enhance", icon: Scaling, cap: "upscale" as const },
  { id: "background_removal", label: "Remove Background", icon: Eraser, cap: "backgroundRemoval" as const },
];

const LENSES = [
  { value: "", label: "Auto lens" },
  { value: "wide", label: "24mm wide-angle" },
  { value: "standard", label: "50mm natural" },
  { value: "portrait", label: "85mm portrait" },
  { value: "macro", label: "100mm macro" },
  { value: "anamorphic", label: "Anamorphic" },
];

const LIGHTING = ["", "cinematic", "golden", "studio", "noir", "neon", "natural"].map((v) => ({
  value: v,
  label: v ? v.charAt(0).toUpperCase() + v.slice(1) : "Auto lighting",
}));

const STYLES = [
  { value: "", label: "No style preset" },
  { value: "photoreal", label: "Hyper-photoreal" },
  { value: "film", label: "35mm film" },
  { value: "anime", label: "Anime" },
  { value: "render3d", label: "3D render" },
  { value: "watercolor", label: "Watercolor" },
  { value: "ugc", label: "UGC smartphone" },
];

export function ImageStudio() {
  const catalog = useModelCatalog();
  const { jobs, submit, cancel } = useGenerationQueue();
  const search = useSearchParams();

  const [tool, setTool] = useState("text_to_image");
  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [aspect, setAspect] = useState("1:1");
  const [count, setCount] = useState(1);
  const [seed, setSeed] = useState("");
  const [strength, setStrength] = useState("0.7");
  const [scale, setScale] = useState("2");
  const [faceEnhance, setFaceEnhance] = useState(false);
  const [lens, setLens] = useState("");
  const [lighting, setLighting] = useState("");
  const [style, setStyle] = useState("");
  const [hasRefs, setHasRefs] = useState(false);
  const [refIds, setRefIds] = useState<string[]>([]);
  const [enhanced, setEnhanced] = useState(false);
  const [busy, setBusy] = useState(false);

  const imageModels = useMemo(() => catalog.filter((m) => m.kind === "IMAGE" || m.kind === "UPSCALE" || m.kind === "EDIT"), [catalog]);
  const model: CatalogModel | undefined = useMemo(
    () => imageModels.find((m) => m.id === (modelId || search.get("model"))) ?? imageModels.find((m) => m.available),
    [imageModels, modelId, search]
  );

  useEffect(() => {
    const toolParam = search.get("tool");
    if (toolParam && IMAGE_TOOLS.some((t) => t.id === toolParam)) setTool(toolParam);
    const preset = search.get("prompt");
    if (preset) setPrompt(preset);
  }, [search]);

  const caps = model?.capabilities;
  const toolAvailable = model ? Boolean(caps?.[IMAGE_TOOLS.find((t) => t.id === tool)!.cap]) : false;
  const credits = model ? Math.ceil(model.creditScore * count) : 0;

  const generate = async () => {
    if (!model) return;
    if (tool !== "upscale" && tool !== "background_removal" && !prompt.trim()) return;
    setBusy(true);
    await submit({
      kind: model.kind === "UPSCALE" ? "UPSCALE" : model.kind === "EDIT" ? "EDIT" : "IMAGE",
      tool,
      modelId: model.id,
      prompt: prompt.trim() || (tool === "upscale" ? "upscale" : "cutout"),
      negativePrompt: caps?.supportsNegativePrompt && negative ? negative : undefined,
      enhanced: enhanced,
      refAssetIds: refIds,
      params: {
        aspectRatio: aspect,
        count,
        ...(caps?.supportsSeed && seed ? { seed: Number(seed) } : {}),
        ...(caps?.imageToImage && refIds.length ? { strength: Number(strength) } : {}),
        ...(tool === "upscale" ? { scale: Number(scale), faceEnhance } : {}),
        ...(enhanced ? { lens, lighting, style } : {}),
      },
    });
    setBusy(false);
  };

  const showAdvanced = tool === "text_to_image" || tool === "image_to_image";

  return (
    <div>
      <PageHeader
        title="Image Studio"
        subtitle="Text-to-image, image-to-image, upscaling and background removal — real provider jobs, model-aware controls."
      />
      {unavailableNotice(catalog, "IMAGE")}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {IMAGE_TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-3 text-left text-sm transition-all",
                    tool === t.id ? "border-accent/70 bg-accent/10 text-text" : "border-edge bg-panel/60 text-muted hover:text-text"
                  )}
                >
                  <Icon className={cn("h-4 w-4", tool === t.id && "text-accent")} />
                  <span className="font-medium leading-tight">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Model</p>
            <ModelGrid models={imageModels} kind={model?.kind ?? "IMAGE"} selected={model?.id ?? ""} onSelect={setModelId} />
          </div>

          {(tool === "text_to_image" || tool === "image_to_image") && (
            <>
              <Field label="Prompt" hint={`${prompt.length}/4000`}>
                <Textarea rows={5} maxLength={4000} placeholder="Describe the shot: subject, environment, mood…" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              </Field>

              <button
                onClick={() => setEnhanced(!enhanced)}
                className={cn("flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors", enhanced ? "border-accent/60 bg-accent/10" : "border-edge bg-ink-2")}
              >
                <span className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-accent" /> Prompt enhancer</span>
                <span className={cn("text-xs", enhanced ? "text-accent" : "text-muted")}>{enhanced ? "ON" : "OFF"}</span>
              </button>

              {enhanced && (
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Lens" value={lens} onChange={setLens} options={LENSES} />
                  <SelectField label="Lighting" value={lighting} onChange={setLighting} options={LIGHTING} />
                  <SelectField label="Style" value={style} onChange={setStyle} options={STYLES} />
                </div>
              )}

              {caps?.supportsNegativePrompt && (
                <Field label="Negative prompt">
                  <Textarea rows={2} placeholder="What to avoid…" value={negative} onChange={(e) => setNegative(e.target.value)} />
                </Field>
              )}

              {caps?.imageToImage && (
                <div>
                  <RefUploader refIds={refIds} onChange={setRefIds} max={caps.maxRefImages || 1} label="Source image (image-to-image)" />
                  {refIds.length > 0 && (
                    <Field label="Guidance strength" hint={strength}>
                      <input type="range" min="0.1" max="0.95" step="0.05" value={strength} onChange={(e) => setStrength(e.target.value)} className="w-full accent-[var(--color-accent)]" />
                    </Field>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Aspect ratio" value={aspect} onChange={setAspect} options={(caps?.aspectRatios ?? ["1:1"]).map((r) => ({ value: r, label: r }))} />
                <SelectField label="Image count" value={String(count)} onChange={(v) => setCount(Number(v))} options={(caps?.counts ?? [1]).map((c) => ({ value: String(c), label: `${c}` }))} />
              </div>

              {caps?.supportsSeed && (
                <Field label="Seed" hint="blank = random">
                  <SeedField value={seed} onChange={setSeed} />
                </Field>
              )}
            </>
          )}

          {tool === "upscale" && (
            <>
              <RefUploader refIds={refIds} onChange={setRefIds} max={1} label="Image to upscale" accept="image/png,image/jpeg,image/webp" />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Scale" value={scale} onChange={setScale} options={[{ value: "2", label: "2x" }, { value: "4", label: "4x" }]} />
                <label className="flex items-end gap-2 pb-2.5 text-sm text-muted">
                  <input type="checkbox" checked={faceEnhance} onChange={(e) => setFaceEnhance(e.target.checked)} className="accent-[var(--color-accent)]" />
                  Face enhance
                </label>
              </div>
            </>
          )}

          {tool === "background_removal" && (
            <RefUploader refIds={refIds} onChange={setRefIds} max={1} label="Image" />
          )}

          <div className="rounded-xl border border-edge bg-ink-2 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Estimated cost</span>
              <span className="font-semibold text-amber">{credits} credits</span>
            </div>
            <Button variant="accent" size="lg" className="mt-3 w-full" disabled={!model || !toolAvailable || busy || (refIds.length === 0 && (tool === "upscale" || tool === "background_removal"))} loading={busy} onClick={generate}>
              Generate
            </Button>
            {model && !toolAvailable && (
              <p className="mt-2 text-center text-xs text-amber/80">This model doesn&apos;t support {tool.replaceAll("_", " ")} — switch tool or model.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-edge text-center">
              <Scissors className="mb-3 h-8 w-8 text-muted/50" />
              <p className="text-sm text-muted">Results appear here. Select a connected model and generate.</p>
            </div>
          ) : (
            jobs.map((j) => <JobResultCard key={j.id} job={j} onCancel={cancel} />)
          )}
        </div>
      </div>
    </div>
  );
}
