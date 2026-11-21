import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(80),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

const paramsSchema = z.object({
  aspectRatio: z.string().max(8).optional(),
  count: z.number().int().min(1).max(4).optional(),
  seed: z.number().int().optional().nullable(),
  duration: z.number().int().optional(),
  scale: z.number().int().min(2).max(4).optional(),
  faceEnhance: z.boolean().optional(),
  strength: z.number().min(0).max(1).optional(),
  motionStrength: z.number().min(0).max(1).optional(),
  cameraPreset: z.string().max(40).optional(),
  shotType: z.string().max(40).optional(),
  lens: z.string().max(40).optional(),
  lighting: z.string().max(40).optional(),
  style: z.string().max(40).optional(),
});

export const generateSchema = z.object({
  kind: z.enum(["IMAGE", "VIDEO", "UPSCALE", "EDIT", "AUDIO"]),
  tool: z.string().min(1).max(60),
  modelId: z.string().min(1).max(80),
  prompt: z.string().min(1).max(4000),
  negativePrompt: z.string().max(2000).optional(),
  params: paramsSchema.optional().default({}),
  refAssetIds: z.array(z.string().max(64)).max(4).optional().default([]),
  characterId: z.string().max(64).optional(),
  enhanced: z.boolean().optional().default(false),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  assetIds: z.array(z.string().max(64)).max(500).optional(),
});

export const characterSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  referenceAssetIds: z.array(z.string().max(64)).max(12).optional(),
  coverAssetId: z.string().max(64).optional().nullable(),
});

export const editorProjectSchema = z.object({
  name: z.string().min(1).max(120),
  timeline: z.record(z.unknown()),
});

export const assetPatchSchema = z.object({
  favorite: z.boolean().optional(),
});

export const adminUserPatchSchema = z.object({
  creditDelta: z.number().int().min(-100000).max(100000).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  suspended: z.boolean().optional(),
});

export type GenerateInput = z.infer<typeof generateSchema>;
