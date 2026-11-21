export type Step = {
  title: string;
  body: string;
  cta?: { label: string; href: string };
};

export type Workflow = {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  duration: string;
  steps: Step[];
};

export type Template = {
  id: string;
  name: string;
  kind: "IMAGE" | "VIDEO";
  tool: string;
  camera?: string;
  prompt: string;
  styles?: string[];
  aspect: string;
  tags: string[];
};

export const WORKFLOWS: Workflow[] = [
  {
    id: "cinematic-film",
    name: "Cinematic Filmmaking",
    tagline: "Concept boards → hero frames → motion shots",
    icon: "clapperboard",
    duration: "4 steps",
    steps: [
      { title: "1 · Lock the story", body: "Write the logline and pick a visual style (35mm film, anamorphic, golden hour…)before generating anything.", cta: { label: "Open Template Board", href: "/templates" } },
      { title: "2 · Generate key frames", body: "Create 4–8 stills in Image Studio with 'FLUX Dev' or 'FLUX 1.1 Pro' to lock composition and palette.", cta: { label: "Open Image Studio", href: "/studio/image?tool=text_to_image" } },
      { title: "3 · Animate the hero frame", body: "Feed your best still into Image → Video with a dolly-in or crane preset.", cta: { label: "Open Video Studio", href: "/studio/video?tool=image_to_video&camera=dolly_in" } },
      { title: "4 · Assemble the cut", body: "Trim clips, add letterbox overlays and score in the Editing Studio, then export.", cta: { label: "Open AI Editing", href: "/studio/edit" } },
    ],
  },
  {
    id: "product-commercial",
    name: "Product Commercial",
    tagline: "Studio-grade packshots → 6s product motion",
    icon: "package",
    duration: "3 steps",
    steps: [
      { title: "1 · Perfect the packshot", body: "Upload your product photo, remove the background, then place it on a studio backdrop with Image → Image.", cta: { label: "Open Image Studio", href: "/studio/image?tool=image_to_image" } },
      { title: "2 · Add product motion", body: "Use Image → Video with a slow orbit or macro push-in. Balanced motion keeps the product legible.", cta: { label: "Open Video Studio", href: "/studio/video?tool=image_to_video&camera=orbit" } },
      { title: "3 · Deliver social cuts", body: "Export 9:16 for reels with captions in the Editing Studio.", cta: { label: "Open AI Editing", href: "/studio/edit" } },
    ],
  },
  {
    id: "ugc-ads",
    name: "UGC Advertisement",
    tagline: "Authentic smartphone-feel creative",
    icon: "smartphone",
    duration: "3 steps",
    steps: [
      { title: "1 · Cast your presenter", body: "Create a character from reference photos so the same presenter appears across every ad variant.", cta: { label: "Open Character Studio", href: "/studio/character" } },
      { title: "2 · Generate the hook", body: "Text → Video with the UGC aesthetic: handheld, slightly imperfect framing, direct address.", cta: { label: "Open Video Studio", href: "/studio/video?camera=handheld" } },
      { title: "3 · Assemble variants", body: "Cut 3 hooks in the Editing Studio and export each at 9:16.", cta: { label: "Open AI Editing", href: "/studio/edit" } },
    ],
  },
  {
    id: "fashion",
    name: "Fashion Photography",
    tagline: "Editorial looks from one reference set",
    icon: "shirt",
    duration: "3 steps",
    steps: [
      { title: "1 · Build the model profile", body: "Upload reference set, define hair/structure descriptors.", cta: { label: "Open Character Studio", href: "/studio/character" } },
      { title: "2 · Full-body editorial", body: "Generate full-body frames with your chosen lens and lighting recipe.", cta: { label: "Open Image Studio", href: "/studio/image?tool=text_to_image" } },
      { title: "3 · Fabric motion reel", body: "Animate the best still with a slow pan for fabric movement.", cta: { label: "Open Video Studio", href: "/studio/video?tool=image_to_video&camera=pan_left" } },
    ],
  },
  {
    id: "music-video",
    name: "Music Video",
    tagline: "Beat-synced abstract visuals",
    icon: "music",
    duration: "3 steps",
    steps: [
      { title: "1 · Generate visual themes", body: "Batch 8+ stills across palette variants in Image Studio.", cta: { label: "Open Image Studio", href: "/studio/image?tool=text_to_image" } },
      { title: "2 · Animate stills", body: "Image → Video, FPV or orbit presets for energy.", cta: { label: "Open Video Studio", href: "/studio/video?camera=fpv" } },
      { title: "3 · Sync to track", body: "Drop clips, audio track and beat-matched cuts in the Editing Studio.", cta: { label: "Open AI Editing", href: "/studio/edit" } },
    ],
  },
  {
    id: "storyboard",
    name: "Storyboarding",
    tagline: "Shot-by-shot boards for production",
    icon: "layout",
    duration: "2 steps",
    steps: [
      { title: "1 · Shot list", body: "Define each shot: subject, lens, camera move, lighting.", cta: { label: "Plan in Templates", href: "/templates" } },
      { title: "2 · Batch board frames", body: "Generate consistent boards in Image Studio with a locked seed and style preset.", cta: { label: "Open Image Studio", href: "/studio/image?tool=text_to_image" } },
    ],
  },
  {
    id: "youtube",
    name: "YouTube Production",
    tagline: "Thumbnails → b-roll → Viral hooks",
    icon: "youtube",
    duration: "3 steps",
    steps: [
      { title: "1 · Thumbnail A/B set", body: "Generate 4 thumbnail variants with bold in-image text (FLUX Dev).", cta: { label: "Open Image Studio", href: "/studio/image?tool=text_to_image" } },
      { title: "2 · Generate b-roll", body: "Animate establishing shots for cutaways.", cta: { label: "Open Video Studio", href: "/studio/video?camera=drone" } },
      { title: "3 · Assemble intro", body: "Trim the first 15 seconds in the Editing Studio.", cta: { label: "Open AI Editing", href: "/studio/edit" } },
    ],
  },
  {
    id: "anime",
    name: "Anime & Animation",
    tagline: "Key visuals and cel-motion clips",
    icon: "star",
    duration: "2 steps",
    steps: [
      { title: "1 · Key visual", body: "Image Studio with the 'Anime' style preset and a locked character description.", cta: { label: "Open Image Studio", href: "/studio/image?tool=text_to_image" } },
      { title: "2 · Cel-motion shot", body: "Animate with subtle motion to keep linework stable.", cta: { label: "Open Video Studio", href: "/studio/video?camera=static" } },
    ],
  },
  {
    id: "brand-campaign",
    name: "Brand Campaign",
    tagline: "Complete multi-asset campaign kit",
    icon: "megaphone",
    duration: "4 steps",
    steps: [
      { title: "1 · Brand board", body: "Generate palette + typography reference stills.", cta: { label: "Open Image Studio", href: "/studio/image?tool=text_to_image" } },
      { title: "2 · Hero motion", body: "Cinematic dolly hero clip.", cta: { label: "Open Video Studio", href: "/studio/video?camera=dolly_in" } },
      { title: "3 · Product no-watermark exports", body: "Starter plan and above for clean export.", cta: { label: "See plans", href: "/pricing" } },
      { title: "4 · Final cut", body: "Assemble with brand overlay text in the Editing Studio.", cta: { label: "Open AI Editing", href: "/studio/edit" } },
    ],
  },
  {
    id: "portrait-photography",
    name: "Portrait Photography",
    tagline: "Studio-quality portraits with a repeatable recipe",
    icon: "user",
    duration: "2 steps",
    steps: [
      { title: "1 · Recipe", body: "85mm portrait lens + studio lighting + photoreal style in Image Studio.", cta: { label: "Open Image Studio", href: "/studio/image?tool=text_to_image" } },
      { title: "2 · Upscale & deliver", body: "Run winning frames through Real-ESRGAN at 4x with face enhancement.", cta: { label: "Open Upscale", href: "/studio/image?tool=upscale" } },
    ],
  },
  {
    id: "social-reels",
    name: "Social Media Reels",
    tagline: "9:16 scroll-stoppers in minutes",
    icon: "instagram",
    duration: "2 steps",
    steps: [
      { title: "1 · Vertical clips", body: "Generate 9:16 clips with tracking or handheld presets.", cta: { label: "Open Video Studio", href: "/studio/video?camera=tracking" } },
      { title: "2 · Captions & music", body: "Add captions and a music track in the Editing Studio.", cta: { label: "Open AI Editing", href: "/studio/edit" } },
    ],
  },
  {
    id: "short-film",
    name: "Short Film",
    tagline: "Three-act cut from one consistent world",
    icon: "film",
    duration: "5 steps",
    steps: [
      { title: "1 · World bible", body: "Lock look + recurring character profiles.", cta: { label: "Open Character Studio", href: "/studio/character" } },
      { title: "2 · Act boards", body: "Storyboarding workflow.", cta: { label: "Plan in Templates", href: "/templates" } },
      { title: "3 · Shot generation", body: "Animate key frames with matched camera presets.", cta: { label: "Open Video Studio", href: "/studio/video" } },
      { title: "4 · Assembly", body: "Timeline edit with score.", cta: { label: "Open AI Editing", href: "/studio/edit" } },
      { title: "5 · Master export", body: "Upscale hero frames and export the master.", cta: { label: "Open Upscale", href: "/studio/image?tool=upscale" } },
    ],
  },
];

export const TEMPLATES: Template[] = [
  { id: "t-1", name: "Neon Noir Detective", kind: "IMAGE", tool: "text_to_image", aspect: "3:2", tags: ["Cinematic", "Portrait"], styles: ["photoreal", "noir lighting"], prompt: "weathered detective under neon rain, cigarette smoke curling through light shafts, wet asphalt reflections, moody teal and magenta" },
  { id: "t-2", name: "Desert Epic Dolly", kind: "VIDEO", tool: "text_to_video", camera: "dolly_in", aspect: "16:9", tags: ["Cinematic", "Landscape"], prompt: "a colossal sandstone arch in a vast desert, camera dollies toward a lone traveler, heat shimmer on the horizon, epic scale" },
  { id: "t-3", name: "Studio Product Hero", kind: "IMAGE", tool: "text_to_image", aspect: "1:1", tags: ["Product", "Advertising"], styles: ["studio lighting"], prompt: "premium wireless headphones on obsidian pedestal, clean studio softbox lighting, reflections on glossy surface, product photography, centered composition" },
  { id: "t-4", name: "Orbit Packshot", kind: "VIDEO", tool: "image_to_video", camera: "orbit", aspect: "1:1", tags: ["Product", "Commercial"], prompt: "product on glass turntable, soft studio highlights, slow orbit" },
  { id: "t-5", name: "Editorial Fashion", kind: "IMAGE", tool: "text_to_image", aspect: "9:16", tags: ["Fashion"], styles: ["film"], prompt: "avant-garde couture in an abandoned brutalist hall, 85mm, wind-blown fabric, editorial fashion spread" },
  { id: "t-6", name: "FPV City Fly-Through", kind: "VIDEO", tool: "text_to_video", camera: "fpv", aspect: "9:16", tags: ["Social", "Travel"], prompt: "dusk megacity, FPV drone threads between glass towers, volume-lit streets" },
  { id: "t-7", name: "Anime Key Visual", kind: "IMAGE", tool: "text_to_image", aspect: "3:2", tags: ["Anime"], styles: ["anime"], prompt: "shrine maiden on a cliff at sunrise, drifting cherry blossoms, vibrant cel shading, dynamic wind" },
  { id: "t-8", name: "UGC Unboxing Hook", kind: "VIDEO", tool: "text_to_video", camera: "handheld", aspect: "9:16", tags: ["Social", "UGC"], prompt: "authentic UGC unboxing on a bedroom desk, natural window light, direct address selfie angle" },
  { id: "t-9", name: "Golden Hour Portrait", kind: "IMAGE", tool: "text_to_image", aspect: "4:3", tags: ["Portrait"], styles: ["golden"], prompt: "backlit portrait in golden hour wheat field, 85mm, bokeh, warm skin tones" },
  { id: "t-10", name: "Underwater Macro", kind: "VIDEO", tool: "text_to_video", camera: "static", aspect: "16:9", tags: ["Nature"], prompt: "bioluminescent jellyfish drifting in black deep water, macro detail, volumetric glow" },
  { id: "t-11", name: "Brand Billboard", kind: "IMAGE", tool: "text_to_image", aspect: "16:9", tags: ["Advertising"], prompt: "minimalist billboard-ready composition, bold negative space, primary brand block of saturated color" },
  { id: "t-12", name: "Crane Reveal", kind: "VIDEO", tool: "text_to_video", camera: "crane", aspect: "16:9", tags: ["Cinematic"], prompt: "camera cranes up over a midnight harbor town, lights sparkling across the bay" },
];

