import { Suspense } from "react";
import { VideoStudio } from "@/components/studio/video-studio";

export const metadata = { title: "Video Studio — FREEFIELDER AI" };

export default function Page() {
  return (
    <Suspense>
      <VideoStudio />
    </Suspense>
  );
}
