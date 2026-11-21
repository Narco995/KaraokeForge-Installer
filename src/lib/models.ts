/**
 * Public model catalog. Safe to import on client and server — it contains no
 * secrets. A model is only *usable* when its provider adapter reports it is
 * configured (server-side env key check). Models whose provider is not
 * configured are surfaced to users as "Requires connection" with the exact
 * reason, never silently advertised as available.
 */

export type ModelKind = "IMAGE" | "VIDEO" | "UPSCALE" | "EDIT" | "AUDIO";
export type ProviderId = "replicate" | "fal";

export type ModelCapabilities = {
  textToImage?: boolean;
  imageToImage?: boolean;
  textToVideo?: boolean;
  imageToVideo?: boolean;
  videoToVideo?: boolean;
  textToAudio?: boolean;
  upscale?: boolean;
  backgroundRemoval?: boolean;
  aspectRatios: string[];
  counts: number[];
  durations?: number[];
  fps?: number[];
  supportsNegativePrompt: boolean;
  supportsSeed: boolean;
  supportsImageRef: boolean;
  maxRefImages: number;
  cameraAware: boolean;
  resolutionCap: string;
};

export type ModelDef = {
  id: string;
  name: string;
  provider: ProviderId;
  providerModel: string;
  kind: ModelKind;
  description: string;
  strengths: string[];
  creditScore: number;
  avgSeconds: number;
  envKey: string;
  capabilities: ModelCapabilities;
};

const imageCaps = (over: Partial<ModelCapabilities>): ModelCapabilities => ({
  aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:2"],
  counts: [1, 2, 4],
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageRef: false,
  maxRefImages: 0,
  cameraAware: false,
  resolutionCap: "2K",
  ...over,
});

const videoCaps = (over: Partial<ModelCapabilities>): ModelCapabilities => ({
  aspectRatios: ["16:9", "9:16", "1:1"],
  counts: [1],
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageRef: false,
  maxRefImages: 0,
  cameraAware: true,
  resolutionCap: "720p",
  ...over,
});

export const MODELS: ModelDef[] = [
  {
    id: "flux-schnell",
    name: "FLUX Schnell",
    provider: "replicate",
    providerModel: "black-forest-labs/flux-schnell",
    kind: "IMAGE",
    description:
      "Fastest ast-quality diffusion model. Ideal for iteration, drafts and high-volume concepting.",
    strengths: ["Speed", "Prompt adherence", "Batch drafts"],
    creditScore: 4,
    avgSeconds: 6,
    envKey: "REPLICATE_API_TOKEN",
    capabilities: imageCaps({ textToImage: true, counts: [1, 2, 4], supportsSeed: true }),
  },
  {
    id: "sdxl",
    name: "SDXL 3.0 Refiner",
    provider: "replicate",
    providerModel: "stability-ai/sdxl",
    kind: "IMAGE",
    description:
      "Stable Diffusion XL with full negative-prompt and image-to-image control. The workhorse for stylized and guided results.",
    strengths: ["Negative prompts", "Image-to-image", "Style control"],
    creditScore: 6,
    avgSeconds: 10,
    envKey: "REPLICATE_API_TOKEN",
    capabilities: imageCaps({
      textToImage: true,
      imageToImage: true,
      supportsNegativePrompt: true,
      supportsSeed: true,
      supportsImageRef: true,
      maxRefImages: 1,
      counts: [1, 2, 4],
    }),
  },
  {
    id: "flux-dev",
    name: "FLUX Dev",
    provider: "replicate",
    providerModel: "black-forest-labs/flux-dev",
    kind: "IMAGE",
    description:
      "Flagship open-weights image model. Exceptional detail, text rendering and photorealism for hero shots.",
    strengths: ["Photorealism", "In-image text", "Fine detail"],
    creditScore: 12,
    avgSeconds: 25,
    envKey: "REPLICATE_API_TOKEN",
    capabilities: imageCaps({ textToImage: true, supportsSeed: true, counts: [1, 2, 4] }),
  },
  {
    id: "flux-1.1-pro",
    name: "FLUX 1.1 Pro",
    provider: "replicate",
    providerModel: "black-forest-labs/flux-1.1-pro",
    kind: "IMAGE",
    description:
      "Commercial-grade image generation with top-tier prompt fidelity and composition. Use for final deliverables.",
    strengths: ["Prompt fidelity", "Composition", "Commercial output"],
    creditScore: 15,
    avgSeconds: 20,
    envKey: "REPLICATE_API_TOKEN",
    capabilities: imageCaps({ textToImage: true, counts: [1, 2] }),
  },
  {
    id: "fal-flux-schnell",
    name: "FLUX Schnell (fal)",
    provider: "fal",
    providerModel: "fal-ai/flux/schnell",
    kind: "IMAGE",
    description: "Same FLUX Schnell engine served by the fal.ai queue. Useful as a redundant fast lane.",
    strengths: ["Speed", "Redundancy"],
    creditScore: 4,
    avgSeconds: 6,
    envKey: "FAL_KEY",
    capabilities: imageCaps({ textToImage: true, supportsSeed: true, counts: [1, 4] }),
  },
  {
    id: "minimax-video-01",
    name: "Hailuo Video 01",
    provider: "replicate",
    providerModel: "minimax/video-01",
    kind: "VIDEO",
    description:
      "Cinematic text-to-video and image-to-video with strong physics and camera language. Fixed 6s clips.",
    strengths: ["Camera language", "Physics", "Prompt following"],
    creditScore: 80,
    avgSeconds: 240,
    envKey: "REPLICATE_API_TOKEN",
    capabilities: videoCaps({
      textToVideo: true,
      imageToVideo: true,
      supportsImageRef: true,
      maxRefImages: 1,
      durations: [6],
    }),
  },
  {
    id: "kling-v2.1",
    name: "Kling v2.1",
    provider: "replicate",
    providerModel: "kwaivgi/kling-v2.1",
    kind: "VIDEO",
    description:
      "High-motion video model with 5s / 10s durations, negative prompts and start-frame conditioning.",
    strengths: ["High motion", "Negative prompts", "Start frame"],
    creditScore: 90,
    avgSeconds: 300,
    envKey: "REPLICATE_API_TOKEN",
    capabilities: videoCaps({
      textToVideo: true,
      imageToVideo: true,
      supportsImageRef: true,
      maxRefImages: 1,
      supportsNegativePrompt: true,
      durations: [5, 10],
      aspectRatios: ["16:9", "9:16", "1:1"],
      resolutionCap: "1080p",
    }),
  },
  {
    id: "fal-minimax-video-01",
    name: "Hailuo Video 01 (fal)",
    provider: "fal",
    providerModel: "fal-ai/minimax/video-01",
    kind: "VIDEO",
    description: "Hailuo served through the fal.ai queue as a redundant video lane.",
    strengths: ["Camera language", "Redundancy"],
    creditScore: 80,
    avgSeconds: 240,
    envKey: "FAL_KEY",
    capabilities: videoCaps({
      textToVideo: true,
      imageToVideo: true,
      supportsImageRef: true,
      maxRefImages: 1,
      durations: [6],
    }),
  },
  {
    id: "real-esrgan",
    name: "Real-ESRGAN Upscale",
    provider: "replicate",
    providerModel: "nightmareai/real-esrgan",
    kind: "UPSCALE",
    description: "Photorealistic upscaling up to 4x with optional face enhancement.",
    strengths: ["2x / 4x scale", "Face enhance"],
    creditScore: 2,
    avgSeconds: 12,
    envKey: "REPLICATE_API_TOKEN",
    capabilities: imageCaps({
      aspectRatios: ["original"],
      counts: [1],
      upscale: true,
      supportsImageRef: true,
      maxRefImages: 1,
    }),
  },
  {
    id: "rembg",
    name: "Background Removal",
    provider: "replicate",
    providerModel: "cjwbw/rembg",
    kind: "EDIT",
    description: "Instant subject isolation with transparent-background output.",
    strengths: ["Cutouts", "Transparency"],
    creditScore: 2,
    avgSeconds: 6,
    envKey: "REPLICATE_API_TOKEN",
    capabilities: imageCaps({
      aspectRatios: ["original"],
      counts: [1],
      backgroundRemoval: true,
      supportsImageRef: true,
      maxRefImages: 1,
    }),
  },
];

export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

export function modelsByKind(kind: ModelKind): ModelDef[] {
  return MODELS.filter((m) => m.kind === kind);
}

export const CAMERA_PRESETS = [
  { id: "dolly_in", label: "Cinematic Dolly In", prompt: "slow cinematic dolly-in toward the subject" },
  { id: "dolly_out", label: "Dolly Out", prompt: "smooth dolly-out revealing the wider scene" },
  { id: "tracking", label: "Tracking Shot", prompt: "lateral tracking shot following the subject" },
  { id: "orbit", label: "Orbit", prompt: "camera orbits around the subject in a smooth arc" },
  { id: "pan_left", label: "Pan Left", prompt: "camera pans slowly to the left" },
  { id: "pan_right", label: "Pan Right", prompt: "camera pans slowly to the right" },
  { id: "tilt_up", label: "Tilt Up", prompt: "camera tilts up from ground level to the sky" },
  { id: "tilt_down", label: "Tilt Down", prompt: "camera tilts down from above" },
  { id: "crane", label: "Crane Shot", prompt: "sweeping crane shot rising above the scene" },
  { id: "handheld", label: "Handheld", prompt: "handheld documentary-style camera movement" },
  { id: "drone", label: "Drone Shot", prompt: "aerial drone shot gliding over the landscape" },
  { id: "static", label: "Static Camera", prompt: "locked static camera, no movement" },
  { id: "fpv", label: "FPV Movement", prompt: "fast FPV drone fly-through movement" },
] as const;

export type CameraPresetId = (typeof CAMERA_PRESETS)[number]["id"];

export type ShotType = { id: string; label: string; prompt?: string };
export type ShotTypeId = ShotType["id"];

export const SHOT_TYPES: ShotType[] = [
  { id: "none", label: "Any" },
  { id: "extreme_wide", label: "Extreme Wide", prompt: "extreme wide establishing shot" },
  { id: "wide", label: "Wide", prompt: "wide shot" },
  { id: "medium", label: "Medium", prompt: "medium shot" },
  { id: "closeup", label: "Close-up", prompt: "dramatic close-up" },
  { id: "macro", label: "Macro", prompt: "extreme macro detail shot" },
  { id: "aerial", label: "Aerial", prompt: "aerial shot" },
];

export const ASPECT_RATIO_DIMENSIONS: Record<string, { w: number; h: number }> = {
  "1:1": { w: 1024, h: 1024 },
  "16:9": { w: 1344, h: 768 },
  "9:16": { w: 768, h: 1344 },
  "4:3": { w: 1152, h: 864 },
  "3:2": { w: 1216, h: 832 },
};
