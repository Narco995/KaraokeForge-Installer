"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Download, Film, FolderOpen, Music, Pause, Play,
  Save, Scissors, Trash2, Type as TypeIcon,
} from "lucide-react";
import { api, uploadFile } from "@/lib/client";
import { cn, downloadUrl } from "@/lib/utils";
import {
  Badge, Button, EmptyState, Field, Input, Modal, PageHeader, Select,
} from "@/components/ui";
import { useToast } from "@/components/providers";

type VideoClip = {
  id: string; kind: "video"; assetId: string; src: string; name: string;
  duration: number; in: number; out: number; trackStart: number;
};
type TextClip = {
  id: string; kind: "text"; text: string; duration: number;
  size: number; color: string; trackStart: number;
};
type AudioClip = {
  id: string; kind: "audio"; assetId: string; src: string; name: string;
  duration: number; in: number; out: number; volume: number; trackStart: number;
};
type Clip = VideoClip | TextClip | AudioClip;
type Track = { id: string; kind: "video" | "text" | "audio"; name: string; clips: Clip[] };
type TimelineProject = { width: number; height: number; fps: number; tracks: Track[] };

type LibraryAsset = { id: string; url: string; kind: string; mediaType?: string | null };
type EditorProjectRow = { id: string; name: string; updatedAt: string };

const uid = () => Math.random().toString(36).slice(2, 10);
const PX_PER_SEC = 60;
const CROSSFADE = 0.5;

const ASPECT_PRESETS = [
  { label: "16:9 HD", width: 1280, height: 720 },
  { label: "16:9 Full HD", width: 1920, height: 1080 },
  { label: "9:16 Vertical", width: 720, height: 1280 },
  { label: "1:1 Square", width: 1080, height: 1080 },
];

const EMPTY: TimelineProject = {
  width: 1280, height: 720, fps: 30,
  tracks: [
    { id: "text", kind: "text", name: "Text overlay", clips: [] },
    { id: "video1", kind: "video", name: "Video 1", clips: [] },
    { id: "video2", kind: "video", name: "Video 2", clips: [] },
    { id: "audio", kind: "audio", name: "Audio", clips: [] },
  ],
};

const CLIP_STYLE: Record<Clip["kind"], string> = {
  video: "border-accent/60 bg-accent/25 text-[#cfc3ff]",
  text: "border-amber/60 bg-amber/20 text-[#ffdba8]",
  audio: "border-accent-2/60 bg-accent-2/20 text-[#a5ecf6]",
};

function clipEnd(c: Clip): number {
  if (c.kind === "text") return c.trackStart + c.duration;
  return c.trackStart + (c.out - c.in);
}
function clipDur(c: Clip): number {
  return c.kind === "text" ? c.duration : c.out - c.in;
}
function projectEnd(t: TimelineProject): number {
  let end = 5;
  for (const tr of t.tracks) for (const c of tr.clips) end = Math.max(end, clipEnd(c));
  return Math.ceil(end * 10) / 10;
}
function probeDuration(url: string, kind: "video" | "audio"): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.onloadedmetadata = () => resolve(Number.isFinite(el.duration) ? el.duration : 0);
    el.onerror = () => resolve(0);
    el.src = url;
  });
}
function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}
function rechain(track: Track): Track {
  const sorted = [...track.clips].sort((a, b) => a.trackStart - b.trackStart);
  let cursor = 0;
  const clips = sorted.map((c) => {
    const next = { ...c, trackStart: Math.max(0, cursor) };
    cursor = clipEnd(next);
    return next;
  });
  return { ...track, clips };
}

export function EditStudio() {
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const [project, setProject] = useState<TimelineProject>(EMPTY);
  const projectRef = useRef(project);
  const [name, setName] = useState("Untitled edit");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ trackId: string; clipId: string } | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [projects, setProjects] = useState<EditorProjectRow[]>([]);
  const [saving, setSaving] = useState(false);
  const videoEls = useRef(new Map<string, HTMLVideoElement>());
  const audioEls = useRef(new Map<string, HTMLAudioElement>());

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const setTl = (next: TimelineProject) => setProject(next);

  const renderFrame = useCallback((t: number) => {
    const canvas = canvasRef.current;
    const tl = projectRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, tl.width, tl.height);
    const videoTracks = tl.tracks.filter((tr) => tr.kind === "video");
    for (let ti = videoTracks.length - 1; ti >= 0; ti--) {
      const active = videoTracks[ti].clips.filter((c) => {
        if (c.kind !== "video") return false;
        return t >= c.trackStart && t < clipEnd(c);
      });
      for (const c of active) {
        const vc = c as VideoClip;
        const el = videoEls.current.get(vc.id);
        if (!el || el.readyState < 2 || !el.videoWidth) continue;
        const later = active.find((o) => o.trackStart > c.trackStart);
        let alpha = 1;
        if (later && t > later.trackStart) {
          alpha = Math.min(1, Math.max(0, 1 - (t - later.trackStart) / CROSSFADE));
        }
        const scale = Math.max(tl.width / el.videoWidth, tl.height / el.videoHeight);
        const w = el.videoWidth * scale;
        const h = el.videoHeight * scale;
        ctx.globalAlpha = alpha;
        ctx.drawImage(el, (tl.width - w) / 2, (tl.height - h) / 2, w, h);
        ctx.globalAlpha = 1;
      }
    }
    for (const tr of tl.tracks) {
      if (tr.kind !== "text") continue;
      for (const c of tr.clips) {
        if (c.kind !== "text") continue;
        if (t < c.trackStart || t > clipEnd(c)) continue;
        const fadeIn = Math.min(1, (t - c.trackStart) / 0.4);
        const fadeOut = Math.min(1, (clipEnd(c) - t) / 0.4);
        ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
        ctx.fillStyle = c.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 ${c.size}px "Inter", system-ui, sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 8;
        ctx.fillText(c.text, tl.width / 2, tl.height / 2, tl.width * 0.9);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }
  }, []);

  const syncMedia = useCallback((t: number, isPlaying: boolean) => {
    const tl = projectRef.current;
    for (const tr of tl.tracks) {
      for (const c of tr.clips) {
        if (c.kind === "video") {
          const el = videoEls.current.get(c.id);
          if (!el) continue;
          if (t < c.trackStart || t >= clipEnd(c)) { if (!el.paused) el.pause(); continue; }
          const target = Math.min(c.out, c.in + (t - c.trackStart));
          if (Math.abs(el.currentTime - target) > 0.25) el.currentTime = Math.max(0, target);
          if (isPlaying && el.paused) void el.play().catch(() => {});
          if (!isPlaying && !el.paused) el.pause();
        } else if (c.kind === "audio") {
          const el = audioEls.current.get(c.id);
          if (!el) continue;
          el.volume = Math.min(1, Math.max(0, c.volume));
          if (t < c.trackStart || t >= clipEnd(c)) { if (!el.paused) el.pause(); continue; }
          const target = Math.min(c.out, c.in + (t - c.trackStart));
          if (Math.abs(el.currentTime - target) > 0.35) el.currentTime = Math.max(0, target);
          if (isPlaying && el.paused) void el.play().catch(() => {});
          if (!isPlaying && !el.paused) el.pause();
        }
      }
    }
  }, []);

  useEffect(() => {
    const tl = projectRef.current;
    const all = tl.tracks.flatMap((t) => t.clips);
    for (const c of all) {
      if (c.kind === "video" && !videoEls.current.has(c.id)) {
        const el = document.createElement("video");
        el.src = c.src;
        el.preload = "auto";
        el.playsInline = true;
        el.onloadeddata = () => renderFrame(timeRef.current);
        videoEls.current.set(c.id, el);
      } else if (c.kind === "audio" && !audioEls.current.has(c.id)) {
        const el = document.createElement("audio");
        el.src = c.src;
        el.preload = "auto";
        audioEls.current.set(c.id, el);
      }
    }
    const live = new Set(all.map((c) => c.id));
    for (const [id, el] of videoEls.current) {
      if (!live.has(id)) { el.pause(); videoEls.current.delete(id); }
    }
    for (const [id, el] of audioEls.current) {
      if (!live.has(id)) { el.pause(); audioEls.current.delete(id); }
    }
  }, [project, renderFrame]);

  useEffect(() => {
    timeRef.current = time;
    renderFrame(time);
    if (!playing) syncMedia(time, false);
  }, [time, project, playing, renderFrame, syncMedia]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const tl = projectRef.current;
      let nt = timeRef.current + dt;
      const end = projectEnd(tl);
      if (nt >= end) {
        nt = end;
        timeRef.current = nt;
        setTime(nt);
        renderFrame(nt);
        syncMedia(nt, false);
        setPlaying(false);
        if (exportingRef.current && recRef.current) {
          recRef.current.stop();
          recRef.current = null;
        }
        return;
      }
      timeRef.current = nt;
      setTime(nt);
      renderFrame(nt);
      syncMedia(nt, true);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, renderFrame, syncMedia]);

  const seek = (t: number) => {
    const clamped = Math.min(Math.max(0, t), projectEnd(projectRef.current));
    timeRef.current = clamped;
    setTime(clamped);
    renderFrame(clamped);
    syncMedia(clamped, false);
  };

  const findClip = (tl: TimelineProject, trackId: string, clipId: string) => {
    const tr = tl.tracks.find((t) => t.id === trackId);
    const clip = tr?.clips.find((c) => c.id === clipId);
    return { tr, clip };
  };

  const patchClip = (trackId: string, clipId: string, patch: Partial<Clip>) => {
    const tl = projectRef.current;
    setTl({
      ...tl,
      tracks: tl.tracks.map((t) =>
        t.id === trackId
          ? { ...t, clips: t.clips.map((c) => (c.id === clipId ? ({ ...c, ...patch } as Clip) : c)) }
          : t
      ),
    });
  };

  const removeClip = (trackId: string, clipId: string) => {
    const tl = projectRef.current;
    setTl({
      ...tl,
      tracks: tl.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) } : t
      ),
    });
    if (selected?.clipId === clipId) setSelected(null);
  };

  const nudgeClip = (trackId: string, clipId: string, dir: -1 | 1) => {
    const tl = projectRef.current;
    const tr = tl.tracks.find((t) => t.id === trackId);
    if (!tr) return;
    const idx = [...tr.clips].sort((a, b) => a.trackStart - b.trackStart).findIndex((c) => c.id === clipId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= tr.clips.length) return;
    const sorted = [...tr.clips].sort((a, b) => a.trackStart - b.trackStart);
    [sorted[idx], sorted[target]] = [sorted[target], sorted[idx]];
    setTl({ ...tl, tracks: tl.tracks.map((t) => (t.id === trackId ? rechain({ ...t, clips: sorted }) : t)) });
  };

  const toggleCrossfade = (trackId: string, clipId: string) => {
    const tl = projectRef.current;
    const tr = tl.tracks.find((t) => t.id === trackId);
    if (!tr) return;
    const sorted = [...tr.clips].sort((a, b) => a.trackStart - b.trackStart);
    const idx = sorted.findIndex((c) => c.id === clipId);
    if (idx <= 0) return;
    const prevEnd = clipEnd(sorted[idx - 1]);
    const c = sorted[idx];
    const overlapped = c.trackStart < prevEnd;
    const next = { ...c, trackStart: overlapped ? prevEnd : Math.max(0, prevEnd - CROSSFADE) };
    setTl({
      ...tl,
      tracks: tl.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: sorted.map((cc) => (cc.id === clipId ? next : cc)) } : t
      ),
    });
  };

  const splitSelected = () => {
    if (!selected) { toast("Select a clip first", "error"); return; }
    const tl = projectRef.current;
    const { tr, clip } = findClip(tl, selected.trackId, selected.clipId);
    if (!tr || !clip) return;
    const t = timeRef.current;
    const local = t - clip.trackStart;
    if (local < 0.1 || local > clipDur(clip) - 0.1) {
      toast("Move the playhead inside the clip to split", "error");
      return;
    }
    const sortedIdx = [...tr.clips].sort((a, b) => a.trackStart - b.trackStart).findIndex((c) => c.id === clip.id);
    let left: Clip;
    let right: Clip;
    if (clip.kind === "text") {
      left = { ...clip, duration: local };
      right = { ...clip, id: uid(), duration: clip.duration - local, trackStart: t };
    } else {
      left = { ...clip, out: clip.in + local };
      right = { ...clip, id: uid(), in: clip.in + local, trackStart: t };
    }
    const sorted = [...tr.clips].sort((a, b) => a.trackStart - b.trackStart);
    sorted[sortedIdx] = left;
    sorted.splice(sortedIdx + 1, 0, right);
    setTl({
      ...tl,
      tracks: tl.tracks.map((x) => (x.id === tr.id ? { ...x, clips: sorted } : x)),
    });
    toast("Clip split", "success");
  };

  const openLibrary = async () => {
    setLibraryOpen(true);
    try {
      const d = await api<{ assets: LibraryAsset[] }>("/api/assets?kind=VIDEO&limit=100");
      setAssets(d.assets);
    } catch {
      setAssets([]);
    }
  };

  const addVideoClip = async (asset: LibraryAsset) => {
    const duration = await probeDuration(asset.url, "video");
    if (!duration) {
      toast("Could not read that video's duration — try re-downloading it", "error");
      return;
    }
    const tl = projectRef.current;
    const tracks = tl.tracks.map((t) => {
      if (t.kind !== "video" || t.clips.some((c) => c.kind === "video" && c.assetId === asset.id)) return t;
      const firstVideo = tl.tracks.find((x) => x.kind === "video");
      if (t.id !== firstVideo?.id) return t;
      const start = t.clips.length ? Math.max(...t.clips.map(clipEnd)) : 0;
      const clip: VideoClip = {
        id: uid(), kind: "video", assetId: asset.id, src: asset.url, name: "Generated clip",
        duration, in: 0, out: Math.round(duration * 100) / 100, trackStart: Math.round(start * 100) / 100,
      };
      return { ...t, clips: [...t.clips, clip] };
    });
    setTl({ ...tl, tracks });
    setLibraryOpen(false);
    toast("Clip added to timeline", "success");
  };

  const addTextClip = () => {
    const tl = projectRef.current;
    const tracks = tl.tracks.map((t) => {
      if (t.kind !== "text") return t;
      const clip: TextClip = {
        id: uid(), kind: "text", text: "Your caption", duration: 3, size: 48,
        color: "#ffffff", trackStart: Math.round(timeRef.current * 10) / 10,
      };
      return { ...t, clips: [...t.clips, clip] };
    });
    setTl({ ...tl, tracks });
    toast("Text overlay added at the playhead", "success");
  };

  const addAudioClip = async (file: File) => {
    try {
      const { asset } = await uploadFile(file);
      const duration = await probeDuration(asset.url, "audio");
      if (!duration) {
        toast("Uploaded, but the audio duration could not be read", "error");
        return;
      }
      const tl = projectRef.current;
      const tracks = tl.tracks.map((t) => {
        if (t.kind !== "audio") return t;
        const clip: AudioClip = {
          id: uid(), kind: "audio", assetId: asset.id, src: asset.url, name: file.name,
          duration, in: 0, out: Math.round(duration * 100) / 100, volume: 1, trackStart: 0,
        };
        return { ...t, clips: [...t.clips, clip] };
      });
      setTl({ ...tl, tracks });
      toast("Audio track added", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    }
  };

  const refreshProjects = async () => {
    try {
      const d = await api<{ projects: EditorProjectRow[] }>("/api/editor/projects");
      setProjects(d.projects);
    } catch {
      setProjects([]);
    }
  };

  const openProjects = async () => {
    setProjectsOpen(true);
    await refreshProjects();
  };

  const saveProject = async () => {
    setSaving(true);
    try {
      const body = { name: name.trim() || "Untitled edit", timeline: project };
      if (projectId) {
        await api(`/api/editor/projects/${projectId}`, { method: "PATCH", json: body });
        toast("Project saved", "success");
      } else {
        const d = await api<{ project: { id: string } }>("/api/editor/projects", { method: "POST", json: body });
        setProjectId(d.project.id);
        toast("Project saved", "success");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const openProject = async (id: string) => {
    try {
      const d = await api<{ project: { id: string; name: string; timeline: TimelineProject } }>(
        `/api/editor/projects/${id}`
      );
      const tl = d.project.timeline;
      const merged: TimelineProject = {
        width: tl.width ?? EMPTY.width,
        height: tl.height ?? EMPTY.height,
        fps: tl.fps ?? EMPTY.fps,
        tracks: tl.tracks ?? EMPTY.tracks,
      };
      setProject(merged);
      setName(d.project.name);
      setProjectId(d.project.id);
      setProjectsOpen(false);
      seek(0);
      toast(`Opened "${d.project.name}"`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not open project", "error");
    }
  };

  const startExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof MediaRecorder === "undefined") {
      toast("Your browser does not support MediaRecorder export", "error");
      return;
    }
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) =>
      MediaRecorder.isTypeSupported(m)
    );
    if (!mime) {
      toast("WebM recording is not supported in this browser", "error");
      return;
    }
    if (projectEnd(projectRef.current) <= 0.1) {
      toast("Add at least one clip before exporting", "error");
      return;
    }
    const stream = canvas.captureStream(project.fps);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      downloadUrl(url, `${(name || "freefielder-export").replace(/[^a-z0-9-_ ]/gi, "")}.webm`);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      exportingRef.current = false;
      setExporting(false);
      toast("Export complete — WebM downloaded", "success");
    };
    recRef.current = rec;
    exportingRef.current = true;
    setExporting(true);
    seek(0);
    rec.start(250);
    setTimeout(() => setPlaying(true), 60);
  };

  const stopExport = () => {
    setPlaying(false);
    if (recRef.current) {
      recRef.current.stop();
      recRef.current = null;
    }
  };

  const end = projectEnd(project);
  const selTrack = selected ? project.tracks.find((t) => t.id === selected.trackId) : undefined;
  const selClip = selTrack?.clips.find((c) => c.id === selected?.clipId);
  const prevClipEnd = (() => {
    if (!selTrack || !selClip) return null;
    const sorted = [...selTrack.clips].sort((a, b) => a.trackStart - b.trackStart);
    const idx = sorted.findIndex((c) => c.id === selClip.id);
    if (idx <= 0) return null;
    return clipEnd(sorted[idx - 1]);
  })();

  return (
    <div className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <PageHeader
        title="AI Editing Studio"
        subtitle="Assemble generated clips into a finished cut — trim, split, reorder, overlay text and audio, then export."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={openProjects}>
              <FolderOpen className="h-4 w-4" /> Open
            </Button>
            <Button variant="ghost" loading={saving} onClick={saveProject}>
              <Save className="h-4 w-4" /> Save
            </Button>
            {exporting ? (
              <Button variant="danger" onClick={stopExport}>
                <Pause className="h-4 w-4" /> Stop export
              </Button>
            ) : (
              <Button variant="accent" onClick={startExport}>
                <Download className="h-4 w-4" /> Export WebM
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-edge bg-panel/70 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={openLibrary}>
                <Film className="h-4 w-4" /> Video clip
              </Button>
              <Button size="sm" onClick={addTextClip}>
                <TypeIcon className="h-4 w-4" /> Text overlay
              </Button>
              <label className="inline-flex cursor-pointer select-none items-center gap-2 rounded-xl bg-panel-2 px-3 py-1.5 text-xs font-medium text-text transition hover:bg-edge">
                <Music className="h-4 w-4" /> Audio track
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void addAudioClip(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <canvas
              ref={canvasRef}
              width={project.width}
              height={project.height}
              className="mx-auto block h-auto w-full max-w-full rounded-xl border border-edge bg-black"
            />
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                aria-label={playing ? "Pause" : "Play"}
                onClick={() => {
                  if (playing) setPlaying(false);
                  else if (timeRef.current >= projectEnd(projectRef.current) - 0.05) seek(0);
                  setPlaying(true);
                }}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <input
                type="range"
                className="h-1.5 min-w-0 flex-1 accent-[var(--color-accent)]"
                min={0}
                max={Math.max(end, 0.1)}
                step={0.05}
                value={Math.min(time, end)}
                onChange={(e) => seek(Number(e.target.value))}
              />
              <span className="text-xs tabular-nums text-muted">
                {fmt(time)} / {fmt(end)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-edge bg-panel/70 p-4">
            <div className="min-w-max space-y-2" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
              {project.tracks.map((track) => (
                <div key={track.id} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-right">
                    <Badge tone={track.kind === "video" ? "accent" : track.kind === "text" ? "amber" : "default"}>
                      {track.name}
                    </Badge>
                  </div>
                  <div
                    className="relative h-12 min-w-full rounded-lg border border-edge bg-black/40"
                    style={{
                      width: Math.max(end * PX_PER_SEC + 40, 320),
                      backgroundImage:
                        "repeating-linear-gradient(to right, rgba(255,255,255,0.05) 0 1px, transparent 1px 60px)",
                    }}
                  >
                    {track.clips.map((c) => {
                      const isSel = selected?.clipId === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelected({ trackId: track.id, clipId: c.id })}
                          className={cn(
                            "absolute top-1 flex h-10 items-center overflow-hidden rounded-md border px-2 text-left text-[11px] font-medium",
                            CLIP_STYLE[c.kind],
                            isSel && "ring-2 ring-accent-2"
                          )}
                          style={{ left: c.trackStart * PX_PER_SEC, width: Math.max(24, clipDur(c) * PX_PER_SEC) }}
                        >
                          <span className="truncate">
                            {c.kind === "text" ? c.text : `${c.kind === "video" ? c.name : c.name} ${clipDur(c).toFixed(1)}s`}
                          </span>
                        </button>
                      );
                    })}
                    <div
                      className="pointer-events-none absolute top-0 h-full w-px bg-accent-2"
                      style={{ left: time * PX_PER_SEC }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-edge bg-panel/70 p-4">
            <h3 className="mb-3 text-sm font-semibold">Project settings</h3>
            <Field label="Project name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Canvas size">
              <div className="flex flex-wrap gap-2">
                {ASPECT_PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setTl({ ...projectRef.current, width: p.width, height: p.height })
                    }
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </Field>
            <Field label="Frame rate">
              <Select value={project.fps} onChange={(e) => setTl({ ...projectRef.current, fps: Number(e.target.value) })}>
                <option value={24}>24 fps</option>
                <option value={30}>30 fps</option>
                <option value={60}>60 fps</option>
              </Select>
            </Field>
          </div>

          <div className="rounded-2xl border border-edge bg-panel/70 p-4">
            <h3 className="mb-3 text-sm font-semibold">Clip inspector</h3>
            {!selClip ? (
              <p className="text-sm text-muted">Select a clip on the timeline to edit its properties.</p>
            ) : (
              <div className="space-y-3">
                <Badge tone="default">{selClip.kind.toUpperCase()} · {clipDur(selClip).toFixed(2)}s</Badge>
                {selClip.kind === "text" && (
                  <>
                    <Field label="Text">
                      <Input value={selClip.text} onChange={(e) => patchClip(selTrack!.id, selClip.id, { text: e.target.value } as Partial<TextClip>)} />
                    </Field>
                    <Field label={`Font size (${selClip.size}px)`}>
                      <input
                        type="range"
                        min={16}
                        max={120}
                        value={selClip.size}
                        onChange={(e) => patchClip(selTrack!.id, selClip.id, { size: Number(e.target.value) } as Partial<TextClip>)}
                        className="w-full accent-[var(--color-accent)]"
                      />
                    </Field>
                    <Field label="Color">
                      <input
                        type="color"
                        value={selClip.color}
                        onChange={(e) => patchClip(selTrack!.id, selClip.id, { color: e.target.value } as Partial<TextClip>)}
                        className="h-9 w-full rounded-lg border border-edge bg-panel-2"
                      />
                    </Field>
                    <Field label="Duration (s)">
                      <Input
                        type="number"
                        min={0.5}
                        max={60}
                        step={0.5}
                        value={selClip.duration}
                        onChange={(e) => patchClip(selTrack!.id, selClip.id, { duration: Math.max(0.5, Number(e.target.value) || 1) } as Partial<TextClip>)}
                      />
                    </Field>
                  </>
                )}
                {selClip.kind === "audio" && (
                  <Field label={`Volume (${Math.round(selClip.volume * 100)}%)`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(selClip.volume * 100)}
                      onChange={(e) => patchClip(selTrack!.id, selClip.id, { volume: Number(e.target.value) / 100 } as Partial<AudioClip>)}
                      className="w-full accent-[var(--color-accent)]"
                    />
                  </Field>
                )}
                {selClip.kind === "video" && (
                  <>
                    <Field label={`Trim in (${selClip.in.toFixed(2)}s)`}>
                      <Input
                        type="number"
                        min={0}
                        max={selClip.out - 0.1}
                        step={0.1}
                        value={selClip.in}
                        onChange={(e) => patchClip(selTrack!.id, selClip.id, { in: Math.min(Number(e.target.value) || 0, selClip.out - 0.1) } as Partial<VideoClip>)}
                      />
                    </Field>
                    <Field label={`Trim out (${selClip.out.toFixed(2)}s of ${selClip.duration.toFixed(2)}s)`}>
                      <Input
                        type="number"
                        min={selClip.in + 0.1}
                        max={selClip.duration}
                        step={0.1}
                        value={selClip.out}
                        onChange={(e) => patchClip(selTrack!.id, selClip.id, { out: Math.max(Number(e.target.value) || 0.1, selClip.in + 0.1) } as Partial<VideoClip>)}
                      />
                    </Field>
                  </>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={splitSelected}>
                    <Scissors className="h-4 w-4" /> Split
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => nudgeClip(selTrack!.id, selClip.id, -1)}>
                    <ArrowLeft className="h-4 w-4" /> Earlier
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => nudgeClip(selTrack!.id, selClip.id, 1)}>
                    <ArrowRight className="h-4 w-4" /> Later
                  </Button>
                  {selClip.kind === "video" && prevClipEnd !== null && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleCrossfade(selTrack!.id, selClip.id)}
                    >
                      {selClip.trackStart < prevClipEnd ? "Remove transition" : "Crossfade 0.5s"}
                    </Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => removeClip(selTrack!.id, selClip.id)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted">
        Export records the timeline in real time to a WebM file via MediaRecorder — audio tracks play
        during preview and export playback, but only the video canvas is captured. Server-side H.264
        remuxing with an ffmpeg worker is planned for a future release.
      </p>

      <Modal open={projectsOpen} onClose={() => setProjectsOpen(false)} title="Open editor project">
        {projects.length === 0 ? (
          <p className="text-sm text-muted">No saved editor projects yet — build a timeline and press Save.</p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => void openProject(p.id)}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-xs text-muted">{new Date(p.updatedAt).toLocaleDateString()}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={libraryOpen} onClose={() => setLibraryOpen(false)} title="Add a generated video">
        {assets.length === 0 ? (
          <EmptyState
            icon={<Film className="h-8 w-8" />}
            title="No generated videos yet"
            body="Videos you generate in the Video Studio appear here automatically."
            action={<Button variant="accent" onClick={() => setLibraryOpen(false)}>Back to the editor</Button>}
          />
        ) : (
          <div className="grid max-h-[60dvh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {assets.map((a) => (
              <button
                key={a.id}
                onClick={() => void addVideoClip(a)}
                className="group overflow-hidden rounded-xl border border-edge bg-black/40 transition hover:border-accent/60"
              >
                <video src={a.url} className="h-24 w-full object-cover" preload="metadata" />
                <span className="block truncate px-2 py-1.5 text-[11px] text-muted">{a.id}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
