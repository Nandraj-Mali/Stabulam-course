import { BadgeCheck, XCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Verify certificate" };

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { p_id: id });
  const c = Array.isArray(data) ? data[0] : null;
  const valid = c && !c.revoked;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-xl px-4 pb-24 pt-8 sm:px-6">
        <div className="card p-8 text-center sm:p-10">
          {valid ? (
            <>
              <BadgeCheck className="mx-auto h-14 w-14 text-brand" />
              <h1 className="mt-4 text-2xl font-bold">Verified certificate</h1>
              <dl className="mt-6 space-y-3 text-left">
                {[
                  ["Name", c.full_name],
                  ["Course", c.course_title],
                  ["Issued on", fmtDate(c.issued_at)],
                  ["Certificate ID", c.id],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-medium">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
              <a href={`/api/certificate/${c.id}`} target="_blank" className="btn-dark mt-6">View certificate</a>
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-14 w-14 text-brand" />
              <h1 className="mt-4 text-2xl font-bold">Certificate not found</h1>
              <p className="mt-2 text-muted">No valid certificate exists with ID “{id}”.</p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
