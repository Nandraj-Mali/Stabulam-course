import Link from "next/link";
import { Download, Search } from "lucide-react";
import { getUserRows } from "@/lib/admin-data";
import { fmtDate, fmtMinutes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const { q = "", filter = "all" } = await searchParams;
  const { rows, totalModules } = await getUserRows();
  const needle = q.toLowerCase();
  const list = rows.filter((r) => {
    if (needle && ![r.full_name, r.email, r.phone, r.school_name, r.city].some((v) => v?.toLowerCase().includes(needle))) return false;
    if (filter === "completed") return r.has_certificate;
    if (filter === "in_progress") return r.modules_completed > 0 && !r.has_certificate;
    if (filter === "not_started") return r.modules_completed === 0;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Users & progress</h1>
          <p className="text-muted">{list.length} of {rows.length} users</p>
        </div>
        <a href="/api/admin/export" className="btn-outline"><Download className="h-4 w-4" /> Export CSV</a>
      </div>

      <form className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Search name, email, phone, institution, city" className="input pl-9" />
        </div>
        <select name="filter" defaultValue={filter} className="input w-auto">
          <option value="all">All users</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
        <button className="btn-dark">Apply</button>
      </form>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-line bg-cream/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              {["Name", "Institution", "Phone", "Joined", "Modules", "Watched", "Last active", "Cert"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-cream/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="font-medium hover:text-brand">{u.full_name || "—"}</Link>
                  <p className="text-muted">{u.email}</p>
                  {u.role === "admin" && <span className="text-xs font-semibold text-brand">ADMIN</span>}
                </td>
                <td className="px-4 py-3">
                  <p>{u.school_name ?? <span className="text-muted">Not onboarded</span>}</p>
                  <p className="text-muted">{[u.institution_type, u.designation, u.city].filter(Boolean).join(" · ")}</p>
                </td>
                <td className="px-4 py-3">{u.phone ?? "—"}</td>
                <td className="px-4 py-3">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-cream">
                      <div className="h-full bg-brand" style={{ width: `${totalModules ? (u.modules_completed / totalModules) * 100 : 0}%` }} />
                    </div>
                    {u.modules_completed}/{totalModules}
                  </div>
                </td>
                <td className="px-4 py-3">{fmtMinutes(u.watched_seconds)}</td>
                <td className="px-4 py-3">{fmtDate(u.last_active_at)}</td>
                <td className="px-4 py-3">{u.has_certificate ? "✅" : "—"}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">No users match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
