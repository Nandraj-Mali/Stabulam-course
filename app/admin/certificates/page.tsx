import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { toggleRevoke } from "../actions";

export const dynamic = "force-dynamic";

export default async function CertificatesAdmin() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("certificates")
    .select("id, issued_at, revoked, user_id, profiles(full_name, school_name, email), courses(title)")
    .order("issued_at", { ascending: false })
    .limit(2000);

  return (
    <div>
      <h1 className="text-3xl font-bold">Certificates</h1>
      <p className="text-muted">{data?.length ?? 0} issued</p>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-cream/60 text-xs uppercase tracking-wide text-muted">
            <tr>{["ID", "Name", "School", "Course", "Issued", "Status", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((c) => {
              const p = c.profiles as unknown as { full_name: string; school_name: string | null; email: string } | null;
              const co = c.courses as unknown as { title: string } | null;
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono"><a href={`/api/certificate/${c.id}`} target="_blank" className="hover:text-brand">{c.id}</a></td>
                  <td className="px-4 py-3"><Link href={`/admin/users/${c.user_id}`} className="hover:text-brand">{p?.full_name}</Link></td>
                  <td className="px-4 py-3">{p?.school_name}</td>
                  <td className="px-4 py-3">{co?.title}</td>
                  <td className="px-4 py-3">{fmtDate(c.issued_at)}</td>
                  <td className="px-4 py-3">{c.revoked ? <span className="text-brand">Revoked</span> : "Valid"}</td>
                  <td className="px-4 py-3">
                    <form action={toggleRevoke}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="revoked" value={String(!c.revoked)} />
                      <button className="rounded-md px-2 py-1 text-xs hover:bg-cream">{c.revoked ? "Restore" : "Revoke"}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {(data ?? []).length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">No certificates yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
