import type { Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";

export const metadata = {
  title: "FREEFIELDER AI — Your Imagination. No Limits.",
  description:
    "Unified AI creative platform: image studio, video studio, character consistency, cinematic workflows, editing and upscaling in one workspace.",
  applicationName: "FREEFIELDER AI",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
