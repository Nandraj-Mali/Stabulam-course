import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteModule, saveModule } from "../../actions";
import { ResourcesEditor } from "./ResourcesEditor";
import type { Resource } from "@/lib/types";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function EditModule({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ course?: string; position?: string; saved?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const admin = createAdminClient();

  const { data: m } = isNew ? { data: null } : await admin.from("modules").select("*").eq("id", id).maybeSingle();
  if (!isNew && !m) notFound();

  const courseId = m?.course_id ?? sp.course;
  const popup = (m?.popup_content ?? {}) as Record<string, string>;

  return (
    <div className="max-w-4xl">
      <Link href="/admin/modules" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All modules
      </Link>
      <div className="mt-3 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{isNew ? "New module" : `Module ${m!.position}: ${m!.title}`}</h1>
        {sp.saved && <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink"><CheckCircle2 className="h-4 w-4 text-brand" /> Saved</span>}
      </div>

      <form action={saveModule} className="mt-6 space-y-6">
        {!isNew && <input type="hidden" name="id" value={m!.id} />}
        <input type="hidden" name="course_id" value={courseId} />

        <fieldset className="card grid gap-4 p-6 sm:grid-cols-[120px_1fr]">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Basics</legend>
          <div><label className="label">Number</label><input name="position" type="number" min={1} defaultValue={m?.position ?? sp.position ?? 1} required className="input" /></div>
          <div><label className="label">Title</label><input name="title" defaultValue={m?.title ?? ""} required className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Subtitle (shown on the card)</label><input name="subtitle" defaultValue={m?.subtitle ?? ""} className="input" /></div>
          <div className="sm:col-span-2">
            <label className="label">Cover image (big card image, 4:3 or 16:9 recommended)</label>
            <div className="flex flex-wrap items-center gap-4">
              {m?.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.cover_url} alt="" className="h-20 w-32 rounded-lg object-cover" />
              )}
              <input name="cover" type="file" accept="image/*" className="text-sm" />
              {m?.cover_url && <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="remove_cover" /> Remove</label>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="is_published" defaultChecked={m?.is_published ?? true} className="accent-[#e11d2e]" /> Published (visible to students)
          </label>
        </fieldset>

        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Video</legend>
          <div className="sm:col-span-2">
            <label className="label">Bunny Stream video ID (GUID)</label>
            <input name="video_provider_id" defaultValue={m?.video_provider_id ?? ""} className="input font-mono text-sm" placeholder="e.g. 8a7f3c1e-1234-4b5c-9d0e-abcdef123456" />
            <p className="mt-1 text-xs text-muted">Upload the video in your Bunny Stream library, then paste its Video ID here. The real link is never shown to students.</p>
            {!process.env.BUNNY_STREAM_LIBRARY_ID && (
              <p className="mt-2 rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand-dark">
                ⚠ BUNNY_STREAM_LIBRARY_ID is not set on the server, so Bunny videos can&apos;t play yet. Add it (and BUNNY_STREAM_TOKEN_KEY if token authentication is on) in Vercel → Settings → Environment Variables, then redeploy.
              </p>
            )}
          </div>
          <div>
            <label className="label">Or direct MP4 URL (testing only)</label>
            <input name="video_url" defaultValue={m?.video_url ?? ""} className="input text-sm" placeholder="https://…/video.mp4" />
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input name="duration_minutes" type="number" step="0.1" min={0} defaultValue={m ? Math.round((m.duration_seconds / 60) * 10) / 10 : ""} className="input" />
            <p className="mt-1 text-xs text-muted">Leave 0 to auto-detect from the first viewer.</p>
          </div>
        </fieldset>

        <fieldset className="card grid gap-4 p-6">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Content</legend>
          <div><label className="label">Summary</label><textarea name="summary" rows={6} defaultValue={m?.summary ?? ""} className="input" /></div>
          <div><label className="label">Key takeaways (one per line)</label><textarea name="takeaways" rows={4} defaultValue={((m?.takeaways ?? []) as string[]).join("\n")} className="input" /></div>
        </fieldset>

        <fieldset className="card p-6">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Resources (PDFs & files)</legend>
          <ResourcesEditor initial={(m?.resources ?? []) as Resource[]} folder={m?.id ?? `new-${courseId}`} />
        </fieldset>

        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Popup during video</legend>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="popup_enabled" defaultChecked={m?.popup_enabled ?? false} className="accent-[#e11d2e]" /> Show a popup on this module
          </label>
          <div>
            <label className="label">Every (minutes of watching)</label>
            <select name="popup_interval_minutes" defaultValue={String(m?.popup_interval_minutes ?? 15)} className="input">
              {[3, 5, 10, 15, 20, 25, 30].map((n) => <option key={n} value={n}>{n} minutes</option>)}
            </select>
          </div>
          <div>
            <label className="label">Popup type</label>
            <select name="popup_type" defaultValue={m?.popup_type ?? "attention"} className="input">
              <option value="attention">Attention check (“Still watching?”)</option>
              <option value="message">Message / call-to-action</option>
            </select>
          </div>
          <div><label className="label">Title (optional)</label><input name="popup_title" defaultValue={popup.title ?? ""} className="input" /></div>
          <div><label className="label">Button text (message type)</label><input name="popup_button_text" defaultValue={popup.button_text ?? ""} className="input" placeholder="Talk to us on WhatsApp" /></div>
          <div className="sm:col-span-2"><label className="label">Message (optional)</label><textarea name="popup_body" rows={2} defaultValue={popup.body ?? ""} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Button link (message type)</label><input name="popup_button_url" defaultValue={popup.button_url ?? ""} className="input" placeholder="https://wa.me/91…" /></div>
        </fieldset>


        <div className="flex justify-end">
          <SubmitButton className="btn-primary px-8 py-3">{isNew ? "Create module" : "Save module"}</SubmitButton>
        </div>
      </form>

      {!isNew && (
        <>

          <form action={deleteModule} className="mt-12 border-t border-line pt-6">
            <input type="hidden" name="id" value={m!.id} />
            <button className="btn text-brand hover:bg-brand-soft"><Trash2 className="h-4 w-4" /> Delete this module</button>
            <p className="mt-1 text-xs text-muted">This also deletes its resources list and all learner progress for this module.</p>
          </form>
        </>
      )}
    </div>
  );
}

