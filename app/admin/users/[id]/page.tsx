import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtMinutes, pad2 } from "@/lib/format";
import { completeModuleForUser, resetModuleProgress, setRole } from "../../actions";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: user } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!user) notFound();
  const u = user as Profile;

  const [{ data: modules }, { data: progress }, { data: certs }] = await Promise.all([
    admin.from("modules").select("id, position, title, duration_seconds, course_id").eq("is_published", true).order("position"),
    admin.from("module_progress").select("*").eq("user_id", id),
    admin.from("certificates").select("id, issued_at, revoked").eq("user_id", id),
  ]);
  const pmap = new Map((progress ?? []).map((p) => [p.module_id, p]));
  const totalWatched = (progress ?? []).reduce((a, p) => a + (p.watched_seconds ?? 0), 0);
  const completed = (progress ?? []).filter((p) => p.completed_at).length;

  const info: [string, string | null][] = [
    ["Email", u.email], ["Phone", u.phone], ["WhatsApp", u.whatsapp], ["Institution", u.school_name],
    ["Institution type", u.institution_type], ["Role", u.designation],
    ["City / State", [u.city, u.state].filter(Boolean).join(", ")], ["Joined", fmtDate(u.created_at)],
    ["Onboarded", fmtDate(u.onboarded_at)], ["Last active", fmtDate(u.last_active_at)],
  ];

  return (
    <div>
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All users
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{u.full_name || u.email}</h1>
          <p className="text-muted">{completed}/{modules?.length ?? 0} modules · {fmtMinutes(totalWatched)} watched</p>
        </div>
        <form action={setRole} className="flex items-center gap-2">
          <input type="hidden" name="user_id" value={u.id} />
          <input type="hidden" name="role" value={u.role === "admin" ? "student" : "admin"} />
          <button className="btn-outline text-sm">{u.role === "admin" ? "Remove admin" : "Make admin"}</button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_2fr]">
        <div className="card p-6">
          <h2 className="font-semibold">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          {certs?.map((c) => (
            <a key={c.id} href={`/api/certificate/${c.id}`} target="_blank" className="btn-dark mt-4 w-full text-sm">
              Certificate {c.id} {c.revoked && "(revoked)"}
            </a>
          ))}
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-cream/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                {["Module", "Watched", "Furthest point", "Completed", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(modules ?? []).map((m) => {
                const p = pmap.get(m.id);
                const pct = m.duration_seconds ? Math.min(100, Math.round(((p?.max_position ?? 0) / m.duration_seconds) * 100)) : 0;
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3"><span className="font-semibold">M{pad2(m.position)}</span> {m.title}</td>
                    <td className="px-4 py-3">{fmtMinutes(p?.watched_seconds ?? 0)} / {fmtMinutes(m.duration_seconds)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-cream"><div className="h-full bg-brand" style={{ width: `${pct}%` }} /></div>
                        {pct}%
                      </div>
                    </td>
                    <td className="px-4 py-3">{p?.completed_at ? fmtDate(p.completed_at) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!p?.completed_at && (
                          <form action={completeModuleForUser}>
                            <input type="hidden" name="user_id" value={u.id} />
                            <input type="hidden" name="module_id" value={m.id} />
                            <button className="rounded-md px-2 py-1 text-xs text-ink hover:bg-cream">Mark done</button>
                          </form>
                        )}
                        {p && (
                          <form action={resetModuleProgress}>
                            <input type="hidden" name="user_id" value={u.id} />
                            <input type="hidden" name="module_id" value={m.id} />
                            <button className="rounded-md px-2 py-1 text-xs text-brand hover:bg-brand-soft">Reset</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
