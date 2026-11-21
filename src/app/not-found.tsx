import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-5xl font-bold gradient-text">404</h1>
      <p className="text-muted">This frame doesn&apos;t exist in the timeline.</p>
      <Link href="/" className="btn-accent rounded-xl px-5 py-2.5 text-sm font-medium">Back to Home</Link>
    </div>
  );
}
