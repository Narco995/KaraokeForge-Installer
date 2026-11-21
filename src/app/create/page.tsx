"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import DirectorPanel from "@/components/studio/director";
import {
  Image as ImageIcon, Clapperboard, UserRound, Scissors, Scaling, Eraser,
  Type, Wand2, Video, Mic,
} from "lucide-react";

const TOOLS = [
  { href: "/studio/image?tool=text_to_image", label: "AI Image Generator", desc: "Text-to-image across multiple models", icon: ImageIcon, group: "Generation" },
  { href: "/studio/video?tool=text_to_video", label: "Text-to-Video", desc: "Scene descriptions → motion with camera control", icon: Clapperboard, group: "Generation" },
  { href: "/studio/image?tool=image_to_image", label: "Image-to-Image", desc: "Guided restyling with source conditioning", icon: Wand2, group: "Generation" },
  { href: "/studio/video?tool=image_to_video", label: "Image-to-Video", desc: "Animate a still with a start frame", icon: Video, group: "Generation" },
  { href: "/studio/character", label: "AI Character Studio", desc: "Consistent characters from reference photos", icon: UserRound, group: "Consistency" },
  { href: "/studio/image?tool=upscale", label: "AI Upscaling & Enhancement", desc: "2x / 4x photoreal upscaling + face enhance", icon: Scaling, group: "Enhancement" },
  { href: "/studio/image?tool=background_removal", label: "AI Background Removal", desc: "Transparent cutouts in seconds", icon: Eraser, group: "Enhancement" },
  { href: "/studio/edit", label: "AI Editing Studio", desc: "Timeline, tracks, transitions, text, audio", icon: Scissors, group: "Production" },
];


export default function Page() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <DirectorPanel />
      <div>
        <PageHeader title="All tools" subtitle="Every FREEFIELDER tool in one launcher. All tools run real generation jobs." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="group rounded-2xl border border-edge bg-panel/70 p-5 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent/5"
          >
            <div className="mb-3 flex items-center justify-between">
              <t.icon className="h-6 w-6 text-accent" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted/60">{t.group}</span>
            </div>
            <h3 className="font-semibold">{t.label}</h3>
            <p className="mt-1 text-sm text-muted">{t.desc}</p>
          </Link>
        ))}
        </div>
      </div>
    </div>
  );
}
