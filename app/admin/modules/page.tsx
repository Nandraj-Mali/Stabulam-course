import Link from "next/link";
import { Plus, Bell, Video, VideoOff } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDuration, pad2 } from "@/lib/format";
import { saveCourse } from "../actions";

export const dynamic = "force-dynamic";

export default async function ModulesAdmin() {
  const admin = createAdminClient();
  const { data: courses } = await admin.from("courses").select("*").order("created_at");
  const { data: modules } = await admin
    .from("modules")
    .select("id, course_id, position, title, cover_url, duration_seconds, popup_enabled, popup_interval_minutes, video_provider_id, video_url, is_published")
    .order("position");
  const { data: qcount } = await admin.from("quiz_questions").select("module_id");
  const qmap = new Map<string, number>();
  for (const q of qcount ?? []) qmap.set(q.module_id, (qmap.get(q.module_id) ?? 0) + 1);

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold">Course & modules</h1>

      {(courses ?? []).map((c) => {
        const mods = (modules ?? []).filter((m) => m.course_id === c.id);
        return (
          <section key={c.id} className="space-y-5">
            <details className="card p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <div>
                  <p className="eyebrow">Course</p>
                  <h2 className="text-2xl font-bold">{c.title}</h2>
                  <p className="text-sm text-muted">/course/{c.slug} · {c.is_published ? "Published" : "Hidden"}</p>
                </div>
                <span className="btn-outline text-sm">Edit course</span>
              </summary>
              <form action={saveCourse} className="mt-6 grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={c.id} />
                <div><label className="label">Title</label><input name="title" defaultValue={c.title} required className="input" /></div>
                <div><label className="label">URL slug</label><input name="slug" defaultValue={c.slug} required className="input" /></div>
                <div className="sm:col-span-2"><label className="label">Description</label><textarea name="description" defaultValue={c.description ?? ""} rows={3} className="input" /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={c.is_published} className="accent-[#e11d2e]" /> Published</label>
                <div className="sm:text-right"><button className="btn-dark">Save course</button></div>
              </form>
            </details>

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{mods.length} modules</h3>
              <Link href={`/admin/modules/new?course=${c.id}&position=${(mods.at(-1)?.position ?? 0) + 1}`} className="btn-primary text-sm">
                <Plus className="h-4 w-4" /> Add module
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mods.map((m) => (
                <Link key={m.id} href={`/admin/modules/${m.id}`} className="card group overflow-hidden transition hover:shadow-lg">
                  <div className="relative aspect-[16/9] bg-ink">
                    {m.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid-bg grid h-full w-full place-items-center text-5xl font-bold text-white/20">{pad2(m.position)}</div>
                    )}
                    <span className="absolute left-3 top-3 rounded-md bg-white px-2 py-0.5 text-xs font-bold">MODULE {pad2(m.position)}</span>
                    {!m.is_published && <span className="absolute right-3 top-3 rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-white">HIDDEN</span>}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold group-hover:text-brand">{m.title}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        {m.video_provider_id || m.video_url ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5 text-brand" />}
                        {m.video_provider_id || m.video_url ? fmtDuration(m.duration_seconds) : "No video"}
                      </span>
                      <span>{qmap.get(m.id) ?? 0} quiz questions</span>
                      {m.popup_enabled && (
                        <span className="inline-flex items-center gap-1 text-brand"><Bell className="h-3.5 w-3.5" /> Popup every {m.popup_interval_minutes}m</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <details className="card p-6">
        <summary className="cursor-pointer font-semibold">+ Create another course</summary>
        <form action={saveCourse} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Title</label><input name="title" required className="input" /></div>
          <div><label className="label">URL slug</label><input name="slug" required className="input" placeholder="e.g. seo-for-schools" /></div>
          <div className="sm:col-span-2"><label className="label">Description</label><textarea name="description" rows={3} className="input" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" className="accent-[#e11d2e]" /> Published</label>
          <div className="sm:text-right"><button className="btn-dark">Create course</button></div>
        </form>
      </details>
    </div>
  );
}
