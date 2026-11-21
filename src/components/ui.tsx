"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export function Button({
  children,
  variant = "default",
  size = "md",
  className,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "accent" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        variant === "default" && "bg-panel-2 text-text hover:bg-edge",
        variant === "accent" && "btn-accent shadow-[0_4px_24px_-6px_rgba(124,92,255,0.55)] hover:brightness-110",
        variant === "ghost" && "text-muted hover:bg-panel-2 hover:text-text",
        variant === "outline" && "border border-edge-2 text-text hover:border-accent/60 hover:bg-panel",
        variant === "danger" && "bg-danger/15 text-danger hover:bg-danger/25",
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 spin" />}
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-edge bg-panel/70", className)}>{children}</div>;
}

export function Badge({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "accent" | "success" | "danger" | "amber"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        tone === "default" && "border border-edge-2 bg-panel-2 text-muted",
        tone === "accent" && "border-accent/40 bg-accent/15 text-[#c9b8ff]",
        tone === "success" && "border-success/40 bg-success/10 text-success",
        tone === "danger" && "border-danger/40 bg-danger/10 text-danger",
        tone === "amber" && "border-amber/40 bg-amber/10 text-amber",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted">
        {label}
        {hint && <span className="normal-case tracking-normal text-muted/70">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border border-edge bg-ink-2 px-3.5 py-2.5 text-sm text-text placeholder:text-muted/50 outline-none transition-colors focus:border-accent/60 min-h-[42px]";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, className)} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, "resize-none", className)} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(inputBase, "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239b9ba7%22 stroke-width=%222.5%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[position:right_0.9rem_center] bg-no-repeat pr-9", className)}>
      {children}
    </select>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 spin text-accent", className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge px-6 py-16 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <h3 className="font-medium text-text">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="animate-fade-up glass max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl p-5 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-text" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
