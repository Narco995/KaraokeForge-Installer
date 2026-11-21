"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Home, Compass, Sparkles, ImageIcon, Clapperboard, UserRound, Scissors,
  LayoutTemplate, History, FolderOpen, Heart, Settings, ShieldCheck, Menu, X, LogOut, Coins,
} from "lucide-react";
import { cn, formatCredits } from "@/lib/utils";
import { useAuth } from "./providers";
import { Logo } from "./brand";

const NAV = [
  {
    group: "Create",
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/explore", label: "Explore", icon: Compass },
      { href: "/create", label: "Create", icon: Sparkles },
      { href: "/templates", label: "Templates", icon: LayoutTemplate },
    ],
  },
  {
    group: "Studios",
    items: [
      { href: "/studio/image", label: "Image Studio", icon: ImageIcon },
      { href: "/studio/video", label: "Video Studio", icon: Clapperboard },
      { href: "/studio/character", label: "Character Studio", icon: UserRound },
      { href: "/studio/edit", label: "AI Editing", icon: Scissors },
    ],
  },
  {
    group: "Library",
    items: [
      { href: "/creations", label: "My Creations", icon: History },
      { href: "/projects", label: "Projects", icon: FolderOpen },
      { href: "/favorites", label: "Favorites", icon: Heart },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const shellless = isAuthPage || !user;

  if (shellless) return <>{children}</>;

  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-edge bg-ink-2/80 lg:flex">
        <div className="px-5 pb-6 pt-6">
          <Logo />
        </div>
        <NavList pathname={pathname} onNavigate={() => {}} />
        <div className="mt-auto border-t border-edge p-4">
          <div className="flex items-center gap-3 rounded-xl bg-panel px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/25 text-sm font-bold text-[#c9b8ff]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs capitalize text-muted">{user.plan} plan</p>
            </div>
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              className="rounded-lg p-1.5 text-muted hover:bg-edge hover:text-text"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="animate-fade-up glass absolute inset-y-0 left-0 w-[280px] flex flex-col rounded-r-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-4 pt-6">
              <Logo />
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            <div className="mt-auto border-t border-edge p-4">
              <button
                onClick={async () => {
                  setDrawerOpen(false);
                  await logout();
                  router.push("/login");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-panel-2 hover:text-text"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-dvh flex-col">
        {/* Mobile top bar */}
        <header
          className="glass sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 lg:hidden"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 text-muted hover:text-text">
            <Menu className="h-6 w-6" />
          </button>
          <Logo />
          <CreditChip credits={user.credits} />
        </header>

        {/* Desktop top bar */}
        <header className="sticky top-0 z-30 hidden items-center justify-end gap-4 border-b border-edge bg-ink/80 px-8 py-3.5 backdrop-blur-md lg:flex">
          <CreditChip credits={user.credits} />
          <Link href="/pricing" className="rounded-xl border border-edge-2 px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:border-accent/60 hover:text-text">
            Get more credits
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/25 text-sm font-bold text-[#c9b8ff]" title={user.email}>
            {initials}
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const { user } = useAuth();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-6">
      {NAV.map((section) => {
        const items = section.items.filter((i) => !("adminOnly" in i && i.adminOnly) || user?.role === "ADMIN");
        if (items.length === 0) return null;
        return (
          <div key={section.group}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted/60">{section.group}</p>
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        active ? "bg-accent/15 font-medium text-text shadow-[inset_2px_0_0_0_var(--color-accent)]" : "text-muted hover:bg-panel-2 hover:text-text"
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px]", active && "text-accent")} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function CreditChip({ credits }: { credits: number }) {
  return (
    <Link
      href="/pricing"
      className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-semibold text-[#c9b8ff] transition-colors hover:bg-accent/20"
      title="Credit balance"
    >
      <Coins className="h-4 w-4 text-amber" />
      {formatCredits(credits)}
    </Link>
  );
}
