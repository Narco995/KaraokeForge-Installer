"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";
import { Button, Field, Input } from "@/components/ui";
import { Logo } from "@/components/brand";
import { useAuth } from "@/components/providers";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/signup", { method: "POST", json: form });
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <Logo className="mb-8" />
      <form onSubmit={submit} className="glass w-full max-w-sm rounded-2xl p-6">
        <h1 className="text-xl font-semibold">Create your studio</h1>
        <p className="mt-1 text-sm text-muted">Free plan includes 25 credits. No card required.</p>
        <div className="mt-5 space-y-4">
          <Field label="Name">
            <Input required maxLength={80} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name or studio" />
          </Field>
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@studio.com" />
          </Field>
          <Field label="Password" hint="min 8 characters">
            <Input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </Field>
          {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Button variant="accent" size="lg" className="w-full" type="submit" loading={busy}>Create account</Button>
        </div>
        <p className="mt-5 text-center text-sm text-muted">
          Already have an account? <Link href="/login" className="font-medium text-accent hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
