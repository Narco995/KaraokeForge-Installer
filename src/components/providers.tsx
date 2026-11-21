"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  credits: number;
};

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setCredits: (n: number) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type Toast = { id: number; message: string; kind: "info" | "success" | "error" };
const ToastContext = createContext<{ toast: (message: string, kind?: Toast["kind"]) => void } | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { user: SessionUser | null };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const setCredits = useCallback((n: number) => {
    setUser((u) => (u ? { ...u, credits: n } : u));
  }, []);

  const toast = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const authValue = useMemo(() => ({ user, loading, refresh, logout, setCredits }), [user, loading, refresh, logout, setCredits]);

  return (
    <AuthContext.Provider value={authValue}>
      <ToastContext.Provider value={{ toast }}>
        {children}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`animate-fade-up pointer-events-auto max-w-md rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-md ${
                t.kind === "error"
                  ? "border-danger/40 bg-[#2a1219]/90 text-[#ffd3dd]"
                  : t.kind === "success"
                    ? "border-success/40 bg-[#0f2a1f]/90 text-[#c9f5e2]"
                    : "border-edge-2 bg-panel/90 text-text"
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside Providers");
  return ctx;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside Providers");
  return ctx.toast;
}
