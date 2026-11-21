"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Field, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/ui";
import { useModelCatalog, useGenerationQueue, ModelGrid, RefUploader, JobResultCard, unavailableNotice, SelectField, SeedField } from "./shared";
import { CAMERA_PRESETS, SHOT_TYPES } from "@/lib/models";
import { Film, Image, Video, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS = [
  { id: "text_to_video", label: "Text → Video", icon: Video },
  { id: "image_to_video", label: "Image → Video", icon: Image },
];

const MOTION_LEVELS = [
  { value: "0.3", label: "Subtle motion" },
  { value: "0.6", label: "Balanced motion" },
  { value: "0.9", label: "High motion" },
];

export function VideoStudio() {
  const catalog = useModelCatalog();
  const { jobs, submit, cancel } = useGenerationQueue();
  const search = useSearchParams();

  const [tool, setTool] = useState("text_to_video");
  const [modelId, setModelId] = useState("");
  const [scene, setScene] = useState("");
  const [negative, setNegative] = useState("");
  const [camera, setCamera] = useState("dolly_in");
  const [shot, setShot] = useState("none");
  const [motion, setMotion] = useState("0.6");
  const [duration, setDuration] = useState("");
  const [aspect, setAspect] = useState("16:9");
  const [fps, setFps] = useState("");
  const [hasRefs, setHasRefs] = useState(false);
  const [refIds, setRefIds] = useState<string[]>([]);
  const [enhanced, setEnhanced] = useState(true);
  const [busy, setBusy] = useState(false);

  const videoModels = useMemo(() => catalog.filter((m) => m.kind === "VIDEO"), [catalog]);
  const model = useMemo(
    () => videoModels.find((m) => m.id === (search.get("model") || modelId)) ?? videoModels.find((m) => m.available),
    [videoModels, modelId, search]
  );
  const caps = model?.capabilities;

  useEffect(() => {
    const preset = search.get("prompt");
    if (preset) setScene(preset);
    const cam = search.get("camera");
    if (cam) setCamera(cam);
  }, [search]);

  useEffect(() => {
    if (caps?.durations?.length && !caps.durations.includes(Number(duration))) {
      setDuration(String(caps.durations[0]));
    }
  }, [caps, duration]);

  const supportsTool = model
    ? tool === "text_to_video"
      ? Boolean(caps?.textToVideo)
      : Boolean(caps?.imageToVideo)
    : false;
  const needRef = tool === "image_to_video";
  const canGenerate = Boolean(model) && supportsTool && scene.trim().length > 0 && (!needRef || refIds.length > 0);
  const credits = model ? model.creditScore : 0;

  const finalPrompt = useMemo(() => {
    const parts = [scene.trim()];
    const cam = CAMERA_PRESETS.find((c) => c.id === camera);
    if (cam && caps?.cameraAware) parts.push(cam.prompt);
    const st = SHOT_TYPES.find((s) => s.id === shot && s.id !== "none");
    if (st?.prompt) parts.push(st.prompt);
    return parts.join(", ");
  }, [scene, camera, shot, caps]);

  const generate = async () => {
    if (!model || !canGenerate) return;
    setBusy(true);
    await submit({
      kind: "VIDEO",
      tool,
      modelId: model.id,
      prompt: finalPrompt,
      negativePrompt: caps?.supportsNegativePrompt && negative ? negative : undefined,
      refAssetIds: refIds,
      params: {
        aspectRatio: aspect,
        ...(duration ? { duration: Number(duration) } : {}),
        ...(caps?.fps && fps ? { fps: Number(fps) } : {}),
        motionStrength: Number(motion),
        cameraPreset: camera,
        shotType: shot,
      },
    });
    setBusy(false);
  };

  return (
    <div>
      <PageHeader
        title="Video Studio"
        subtitle="Text-to-video and image-to-video on real provider queues, with camera language that matches each model."
      />
      {unavailableNotice(catalog, "VIDEO")}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {TOOLS.map((t) => {
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
                  <span className="font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Model</p>
            <ModelGrid models={videoModels} kind="VIDEO" selected={model?.id ?? ""} onSelect={setModelId} />
          </div>

          <Field label="Scene description" hint={`${scene.length}/4000`}>
            <Textarea rows={5} maxLength={4000} placeholder="A lone astronaut walks across a bioluminescent desert at dusk…" value={scene} onChange={(e) => setScene(e.target.value)} />
          </Field>

          <button
            onClick={() => setEnhanced(!enhanced)}
            className={cn("flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors", enhanced ? "border-accent/60 bg-accent/10" : "border-edge bg-ink-2")}
          >
            <span className="flex items-center gap-2"><Clapperboard className="h-4 w-4 text-accent" /> Director-grade prompt</span>
            <span className={cn("text-xs", enhanced ? "text-accent" : "text-muted")}>{enhanced ? "ON" : "OFF"}</span>
          </button>

          {caps?.cameraAware && (
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Camera movement</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {CAMERA_PRESETS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCamera(c.id)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-[11px] leading-tight transition-all",
                        camera === c.id ? "border-accent/70 bg-accent/10 text-text" : "border-edge bg-panel/60 text-muted hover:text-text"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <SelectField
                label="Shot type"
                value={shot}
                onChange={setShot}
                options={SHOT_TYPES.map((s) => ({ value: s.id, label: s.label }))}
              />
              <SelectField label="Motion strength" value={motion} onChange={setMotion} options={MOTION_LEVELS} />
            </div>
          )}

          {caps?.supportsNegativePrompt && (
            <Field label="Negative prompt">
              <Textarea rows={2} placeholder="Artifacts, distortion, watermark…" value={negative} onChange={(e) => setNegative(e.target.value)} />
            </Field>
          )}

          {caps?.supportsImageRef && (tool === "image_to_video" || Boolean(search.get("ref"))) && (
            <RefUploader refIds={refIds} onChange={setRefIds} max={caps.maxRefImages || 1} label="Start frame" />
          )}

          <div className="grid grid-cols-2 gap-3">
            {caps?.durations && caps.durations.length > 1 && (
              <SelectField label="Duration" value={duration} onChange={setDuration} options={caps.durations.map((d) => ({ value: String(d), label: `${d}s` }))} />
            )}
            {caps?.fps && (
              <SelectField label="FPS" value={fps} onChange={setFps} options={[{ value: "", label: "Auto" }, ...caps.fps.map((f) => ({ value: String(f), label: `${f}` }))]} />
            )}
            <SelectField label="Aspect ratio" value={aspect} onChange={setAspect} options={(caps?.aspectRatios ?? ["16:9"]).map((r) => ({ value: r, label: r }))} />
          </div>

          <div className="rounded-xl border border-edge bg-ink-2 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Estimated cost</span>
              <span className="font-semibold text-amber">{credits} credits</span>
            </div>
            {finalPrompt && (
              <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted/80">
                <span className="font-semibold text-muted">Final prompt:</span> {finalPrompt}
              </p>
            )}
            <Button variant="accent" size="lg" className="mt-3 w-full" disabled={!canGenerate} loading={busy} onClick={generate}>
              <Film className="h-4 w-4" /> Generate video
            </Button>
            {!supportsTool && model && (
              <p className="mt-2 text-center text-xs text-amber/80">
                {model.name} doesn&apos;t support {tool === "text_to_video" ? "text-to-video" : "image-to-video"} — pick another tool or model.
              </p>
            )}
            {model && caps && !caps.cameraAware && (
              <p className="mt-2 text-center text-xs text-muted">Camera controls not supported by this model — hidden from the provider input.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-edge text-center">
              <Film className="mb-3 h-8 w-8 text-muted/50" />
              <p className="text-sm text-muted">Video renders appear here with live status.</p>
            </div>
          ) : (
            jobs.map((j) => <JobResultCard key={j.id} job={j} onCancel={cancel} />)
          )}
        </div>
      </div>
    </div>
  );
}
