import Link from "next/link";
import { FileText, Gift, Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { pad2 } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BonusesAdmin() {
  const admin = createAdminClient();
  const [{ data: courses }, { data: bonuses }] = await Promise.all([
    admin.from("courses").select("id, title").order("created_at"),
    admin.from("bonuses").select("id, course_id, position, title, summary, thumbnail_url, file_path, file_name, is_published").order("position"),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Bonuses</h1>
        <p className="text-muted">PDF bonuses that unlock together with the certificate when a learner completes the course.</p>
      </div>

      {(courses ?? []).map((c) => {
        const list = (bonuses ?? []).filter((b) => b.course_id === c.id);
        return (
          <section key={c.id}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">{c.title} · {list.length} bonuses</h2>
              <Link href={`/admin/bonuses/new?course=${c.id}&position=${(list.at(-1)?.position ?? 0) + 1}`} className="btn-primary text-sm">
                <Plus className="h-4 w-4" /> Add bonus
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((b) => (
                <Link key={b.id} href={`/admin/bonuses/${b.id}`} className="card group overflow-hidden transition hover:shadow-lg">
                  <div className="relative aspect-[4/3] bg-ink">
                    {b.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid-bg grid h-full w-full place-items-center"><Gift className="h-10 w-10 text-brand" /></div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white">BONUS {pad2(b.position)}</span>
                    <span className={`absolute right-3 top-3 rounded-md px-2 py-0.5 text-xs font-bold ${b.is_published ? "bg-white text-ink" : "bg-black/70 text-white"}`}>
                      {b.is_published ? "PUBLISHED" : "DRAFT"}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold group-hover:text-brand">{b.title}</p>
                    {b.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{b.summary}</p>}
                    <p className={`mt-2 inline-flex items-center gap-1.5 text-xs ${b.file_path ? "text-ink" : "text-brand"}`}>
                      <FileText className="h-3.5 w-3.5" /> {b.file_path ? b.file_name ?? "PDF attached" : "No PDF yet"}
                    </p>
                  </div>
                </Link>
              ))}
              {list.length === 0 && <p className="text-sm text-muted">No bonuses yet.</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
