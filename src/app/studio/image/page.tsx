import { Suspense } from "react";
import { ImageStudio } from "@/components/studio/image-studio";

export const metadata = { title: "Image Studio — FREEFIELDER AI" };

export default function Page() {
  return (
    <Suspense>
      <ImageStudio />
    </Suspense>
  );
}
