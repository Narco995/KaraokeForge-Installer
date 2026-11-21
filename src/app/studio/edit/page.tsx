import type { Metadata } from "next";
import { EditStudio } from "@/components/studio/edit-studio";

export const metadata: Metadata = { title: "AI Editing Studio — FREEFIELDER AI" };

export default function EditStudioPage() {
  return <EditStudio />;
}
