"use client";

import { Button } from "@/components/ui";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-4xl">⚠️</div>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted">{error.message || "An unexpected error occurred."}</p>
      <Button variant="accent" onClick={reset}>Try again</Button>
    </div>
  );
}
