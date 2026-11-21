"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { formatCredits, timeAgo } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Spinner } from "@/components/ui";
import { useAuth, useToast } from "@/components/providers";
import { cn } from "@/lib/utils";

type Overview = {
  stats: {
    users: number; jobs: number; succeeded: number; failed: number; running: number;
    assets: number; revenueCents: number; providers: string[];
  };
  models: { id: string; name: string; provider: string; kind: string; available: boolean; reason?: string | null }[];
  recentJobs: { id: string; status: string; tool: string; modelId: string; kind: string; cost: number; error?: string | null; user: string; createdAt: string }[];
};
type AdminUser = {
  id: string; email: string; name: string; role: string; plan: string; credits: number;
  suspended: boolean; createdAt: string; _count: { jobs: number; assets: number };
};
type AdminJob = {
  id: string; status: string; kind: string; tool: string; modelId: string; provider: string;
  cost: number; refunded: boolean; attempts: number; error?: string | null; user: string;
  createdAt: string; finishedAt?: string | null;
};
type AdminLog = { id: string; action: string; detail?: string | null; user: string; createdAt: string };
type StatusFilter = "ALL" | "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

const TABS = ["Overview", "Users", "Jobs", "Models", "Audit logs"] as const;
type Tab = (typeof TABS)[number];

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "accent" | "success" | "danger" }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "accent" && "text-accent",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger"
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function statusTone(status: string): "success" | "danger" | "amber" | "accent" | "default" {
  if (status === "SUCCEEDED" || status === "ACTIVE") return "success";
  if (status === "FAILED") return "danger";
  if (status === "RUNNING" || status === "QUEUED") return "amber";
  if (status === "ADMIN") return "accent";
  return "default";
}

export function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("Overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [jobFilter, setJobFilter] = useState<StatusFilter>("ALL");
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [creditInput, setCreditInput] = useState<Record<string, string>>({});

  const isAuthedAdmin = user && user.role === "ADMIN";

  const loadAll = useCallback(async () => {
    if (!isAuthedAdmin) return;
    setLoading(true);
    try {
      const [ov, us, jb, lg] = await Promise.all([
        api<Overview>("/api/admin/overview"),
        api<{ users: AdminUser[] }>("/api/admin/users"),
        api<{ jobs: AdminJob[] }>("/api/admin/jobs"),
        api<{ logs: AdminLog[] }>("/api/admin/logs"),
      ]);
      setOverview(ov);
      setUsers(us.users);
      setJobs(jb.jobs);
      setLogs(lg.logs);
      setForbidden(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setForbidden(true);
      } else {
        toast(e instanceof Error ? e.message : "Failed to load admin data", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthedAdmin, toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const searchUsers = async () => {
    try {
      const d = await api<{ users: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(userQuery)}`);
      setUsers(d.users);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Search failed", "error");
    }
  };

  const patchUser = async (id: string, body: Record<string, unknown>) => {
    try {
      const d = await api<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: "PATCH", json: body });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, credits: d.user.credits, role: d.user.role, plan: u.plan, suspended: d.user.suspended } : u
        )
      );
      toast("User updated", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", "error");
    }
  };

  const filteredJobs = jobFilter === "ALL" ? jobs : jobs.filter((j) => j.status === jobFilter);

  if (!user) {
    return (
      <div className="px-4 pt-20 text-center text-muted sm:px-6">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm">Checking access…</p>
      </div>
    );
  }

  if (!isAuthedAdmin || forbidden) {
    return (
      <div className="px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <EmptyState
          icon={<ShieldAlert className="h-9 w-9" />}
          title="Administrator access required"
          body="This dashboard is restricted to accounts with the ADMIN role. If you believe you should have access, ask an existing administrator to promote your account."
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Platform health, user management, generation monitoring and audit trail."
        action={<Button variant="ghost" onClick={() => void loadAll()} loading={loading}>Refresh</Button>}
      />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-edge bg-panel/70 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition",
              tab === t ? "bg-accent text-white" : "text-muted hover:bg-panel-2 hover:text-text"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : (
        <>
          {tab === "Overview" && overview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Users" value={overview.stats.users} tone="accent" />
                <Stat label="Generations" value={overview.stats.jobs} />
                <Stat label="Succeeded" value={overview.stats.succeeded} tone="success" />
                <Stat label="Failed" value={overview.stats.failed} tone="danger" />
                <Stat label="Running now" value={overview.stats.running} />
                <Stat label="Assets stored" value={overview.stats.assets} />
                <Stat label="Revenue" value={`$${(overview.stats.revenueCents / 100).toFixed(2)}`} tone="success" />
                <Stat label="Providers" value={overview.stats.providers.length ? overview.stats.providers.join(", ") : "None configured"} />
              </div>
              <Card className="overflow-x-auto p-4">
                <h3 className="mb-3 text-sm font-semibold">Recent generations</h3>
                {overview.recentJobs.length === 0 ? (
                  <p className="text-sm text-muted">No generations yet.</p>
                ) : (
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-muted">
                      <tr><th className="py-2">Status</th><th>Tool</th><th>Model</th><th>User</th><th>Cost</th><th>When</th></tr>
                    </thead>
                    <tbody>
                      {overview.recentJobs.map((j) => (
                        <tr key={j.id} className="border-t border-edge/60">
                          <td className="py-2"><Badge tone={statusTone(j.status)}>{j.status}</Badge></td>
                          <td className="text-muted">{j.tool}/{j.kind}</td>
                          <td className="text-muted">{j.modelId}</td>
                          <td className="max-w-[180px] truncate text-muted">{j.user}</td>
                          <td className="tabular-nums">{j.cost} cr</td>
                          <td className="text-muted">{timeAgo(j.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          )}

          {tab === "Users" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by email or name…"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void searchUsers()}
                />
                <Button onClick={() => void searchUsers()}>Search</Button>
              </div>
              <div className="space-y-3">
                {users.map((u) => (
                  <Card key={u.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{u.name || u.email}</p>
                          <Badge tone={statusTone(u.role)}>{u.role}</Badge>
                          <Badge tone="default">{u.plan}</Badge>
                          {u.suspended && <Badge tone="danger">SUSPENDED</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {u.email} · {formatCredits(u.credits)} credits · {u._count.jobs} generations · {u._count.assets} assets · joined {timeAgo(u.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-end gap-2">
                        <Field label="Credits ±">
                          <Input
                            className="w-24"
                            type="number"
                            value={creditInput[u.id] ?? ""}
                            placeholder="e.g. 100"
                            onChange={(e) => setCreditInput((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          />
                        </Field>
                        <Button
                          size="sm"
                          onClick={() => {
                            const delta = Number(creditInput[u.id]);
                            if (!delta || !Number.isFinite(delta)) { toast("Enter a non-zero credit delta", "error"); return; }
                            void patchUser(u.id, { creditDelta: Math.round(delta) });
                            setCreditInput((prev) => ({ ...prev, [u.id]: "" }));
                          }}
                        >
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void patchUser(u.id, { role: u.role === "ADMIN" ? "USER" : "ADMIN" })}
                        >
                          {u.role === "ADMIN" ? "Demote" : "Make admin"}
                        </Button>
                        <Button
                          size="sm"
                          variant={u.suspended ? "outline" : "danger"}
                          onClick={() => void patchUser(u.id, { suspended: !u.suspended })}
                        >
                          {u.suspended ? "Unsuspend" : "Suspend"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tab === "Jobs" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(["ALL", "QUEUED", "RUNNING", "SUCCEEDED", "FAILED"] as StatusFilter[]).map((s) => (
                  <Button key={s} size="sm" variant={jobFilter === s ? "accent" : "outline"} onClick={() => setJobFilter(s)}>
                    {s}
                  </Button>
                ))}
              </div>
              {filteredJobs.length === 0 ? (
                <EmptyState title="No jobs match this filter" />
              ) : (
                <Card className="overflow-x-auto p-4">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-muted">
                      <tr><th className="py-2">Status</th><th>Tool</th><th>Model</th><th>Provider</th><th>User</th><th>Cost</th><th>Attempts</th><th>When</th></tr>
                    </thead>
                    <tbody>
                      {filteredJobs.slice(0, 80).map((j) => (
                        <tr key={j.id} className="border-t border-edge/60">
                          <td className="py-2">
                            <Badge tone={statusTone(j.status)}>{j.status}{j.refunded && j.status === "FAILED" ? " · refunded" : ""}</Badge>
                          </td>
                          <td className="text-muted">{j.tool}/{j.kind}</td>
                          <td className="text-muted">{j.modelId}</td>
                          <td className="text-muted">{j.provider}</td>
                          <td className="max-w-[160px] truncate text-muted">{j.user}</td>
                          <td className="tabular-nums">{j.cost} cr</td>
                          <td className="tabular-nums">{j.attempts}</td>
                          <td className="text-muted">{timeAgo(j.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
              {filteredJobs.some((j) => j.error) && (
                <Card className="p-4">
                  <h3 className="mb-2 text-sm font-semibold">Recent job errors</h3>
                  <ul className="space-y-1 text-xs text-muted">
                    {filteredJobs.filter((j) => j.error).slice(0, 20).map((j) => (
                      <li key={j.id} className="truncate"><span className="text-danger">{j.modelId}</span> — {j.error}</li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          {tab === "Models" && overview && (
            <div className="grid gap-3 sm:grid-cols-2">
              {overview.models.map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{m.name}</p>
                    <Badge tone={m.available ? "success" : "danger"}>{m.available ? "Available" : "Not connected"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{m.id} · {m.provider} · {m.kind}</p>
                  {m.reason && <p className="mt-2 text-xs text-amber">{m.reason}</p>}
                </Card>
              ))}
            </div>
          )}

          {tab === "Audit logs" && (
            <Card className="overflow-x-auto p-4">
              {logs.length === 0 ? (
                <p className="text-sm text-muted">No audit entries yet.</p>
              ) : (
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted">
                    <tr><th className="py-2">Action</th><th>Actor</th><th>Detail</th><th>When</th></tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-t border-edge/60">
                        <td className="py-2 font-medium">{l.action}</td>
                        <td className="max-w-[180px] truncate text-muted">{l.user}</td>
                        <td className="max-w-[320px] truncate text-muted">{l.detail ?? "—"}</td>
                        <td className="text-muted">{timeAgo(l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
