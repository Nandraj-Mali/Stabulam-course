import Link from "next/link";
import { getUserRows } from "@/lib/admin-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, pad2 } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const { rows, totalModules } = await getUserRows();
  const admin = createAdminClient();
  const { data: modules } = await admin.from("modules").select("id, position, title").eq("is_published", true).order("position");
  const { data: done } = await admin.from("module_progress").select("module_id").not("completed_at", "is", null).limit(100000);

  const students = rows.filter((r) => r.role === "student");
  const weekAgo = Date.now() - 7 * 86400000;
  const stats = [
    { label: "Sign-ups", value: students.length },
    { label: "Onboarded", value: students.filter((r) => r.onboarded_at).length },
    { label: "Active (7 days)", value: students.filter((r) => r.last_active_at && new Date(r.last_active_at).getTime() > weekAgo).length },
    { label: "Certificates", value: students.filter((r) => r.has_certificate).length },
    { label: "Total hours watched", value: Math.round(students.reduce((a, r) => a + r.watched_seconds, 0) / 3600) },
    {
      label: "Avg. modules completed",
      value: students.length ? (students.reduce((a, r) => a + r.modules_completed, 0) / students.length).toFixed(1) : "0",
    },
  ];

  const perModule = new Map<string, number>();
  for (const d of done ?? []) perModule.set(d.module_id, (perModule.get(d.module_id) ?? 0) + 1);
  const funnel = [
    { label: "Signed up", n: students.length },
    { label: "Onboarded", n: stats[1].value as number },
    ...(modules ?? []).map((m) => ({ label: `M${pad2(m.position)} · ${m.title}`, n: perModule.get(m.id) ?? 0 })),
    { label: "Certificate", n: stats[3].value as number },
  ];
  const max = Math.max(1, funnel[0].n);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-1 text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card p-6">
          <h2 className="text-lg font-semibold">Completion funnel</h2>
          <p className="text-sm text-muted">How many learners got through each step ({totalModules} modules)</p>
          <div className="mt-5 space-y-2.5">
            {funnel.map((f) => (
              <div key={f.label} className="grid grid-cols-[minmax(0,220px)_1fr_48px] items-center gap-3 text-sm">
                <span className="truncate text-ink-2">{f.label}</span>
                <div className="h-6 overflow-hidden rounded-md bg-cream">
                  <div className="h-full rounded-md bg-brand" style={{ width: `${(f.n / max) * 100}%` }} />
                </div>
                <span className="text-right font-semibold tabular-nums">{f.n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest sign-ups</h2>
            <Link href="/admin/users" className="text-sm text-brand hover:underline">View all</Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {students.slice(0, 8).map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <Link href={`/admin/users/${u.id}`} className="min-w-0">
                  <p className="truncate font-medium">{u.full_name || u.email}</p>
                  <p className="truncate text-muted">{u.school_name || "Not onboarded"}</p>
                </Link>
                <span className="shrink-0 text-muted">{fmtDate(u.created_at)}</span>
              </li>
            ))}
            {students.length === 0 && <li className="py-4 text-sm text-muted">No users yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
