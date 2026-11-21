import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)}>
      <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg btn-accent shadow-[0_0_18px_-4px_rgba(124,92,255,0.7)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2Z" fill="currentColor" stroke="none" />
        </svg>
        <span className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/25 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      {!markOnly && (
        <span className="text-[15px] font-bold tracking-[0.18em]">
          FREE<span className="gradient-text">FIELDER</span>
          <span className="ml-1 text-[10px] font-semibold tracking-widest text-muted">AI</span>
        </span>
      )}
    </Link>
  );
}

export function Tagline({ className }: { className?: string }) {
  return <p className={cn("text-sm tracking-wide text-muted", className)}>Your Imagination. No Limits.</p>;
}
