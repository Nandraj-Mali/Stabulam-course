import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteModule, deleteQuestion, saveModule, saveQuestion } from "../../actions";
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
  const { data: questions } = isNew
    ? { data: [] }
    : await admin.from("quiz_questions").select("*").eq("module_id", id).order("position").order("id");

  const courseId = m?.course_id ?? sp.course;
  const popup = (m?.popup_content ?? {}) as Record<string, string>;
  const resources = ((m?.resources ?? []) as { label: string; url: string }[]).map((r) => `${r.label} | ${r.url}`).join("\n");

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
          <div><label className="label">Resources (one per line: Label | URL)</label><textarea name="resources" rows={3} defaultValue={resources} className="input font-mono text-sm" placeholder="Content calendar template | https://…" /></div>
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

        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Quiz</legend>
          <div>
            <label className="label">Pass mark (%)</label>
            <input name="pass_percent" type="number" min={0} max={100} defaultValue={m?.pass_percent ?? 60} className="input" />
          </div>
          <p className="self-end text-sm text-muted">Add questions below after saving. A module with no questions completes after the video.</p>
        </fieldset>

        <div className="flex justify-end">
          <SubmitButton className="btn-primary px-8 py-3">{isNew ? "Create module" : "Save module"}</SubmitButton>
        </div>
      </form>

      {!isNew && (
        <>
          <section className="mt-12">
            <h2 className="text-2xl font-bold">Quiz questions ({questions?.length ?? 0})</h2>
            <div className="mt-4 space-y-4">
              {(questions ?? []).map((q, i) => (
                <QuestionForm key={q.id} moduleId={m!.id} q={q} index={i} />
              ))}
              <QuestionForm moduleId={m!.id} index={questions?.length ?? 0} />
            </div>
          </section>

          <form action={deleteModule} className="mt-12 border-t border-line pt-6">
            <input type="hidden" name="id" value={m!.id} />
            <button className="btn text-brand hover:bg-brand-soft"><Trash2 className="h-4 w-4" /> Delete this module</button>
            <p className="mt-1 text-xs text-muted">This also deletes its quiz and all learner progress for this module.</p>
          </form>
        </>
      )}
    </div>
  );
}

type Question = { id: string; position: number; question: string; options: string[]; correct_index: number; explanation: string | null };

function QuestionForm({ moduleId, q, index }: { moduleId: string; q?: Question; index: number }) {
  return (
    <div className={`card p-5 ${q ? "" : "border-dashed"}`}>
      <form action={saveQuestion} className="grid gap-3">
        <input type="hidden" name="module_id" value={moduleId} />
        {q && <input type="hidden" name="id" value={q.id} />}
        <input type="hidden" name="position" value={q?.position ?? index + 1} />
        <label className="label !mb-0">{q ? `Question ${index + 1}` : "+ Add a question"}</label>
        <input name="question" defaultValue={q?.question ?? ""} required className="input" placeholder="Type the question" />
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="radio" name="correct_index" value={i} defaultChecked={(q?.correct_index ?? 0) === i} className="accent-[#e11d2e]" title="Correct answer" />
              <input name={`opt${i}`} defaultValue={q?.options[i] ?? ""} className="input" placeholder={i < 2 ? `Option ${i + 1}` : `Option ${i + 1} (optional)`} required={i < 2} />
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">Select the radio button next to the correct answer.</p>
        <input name="explanation" defaultValue={q?.explanation ?? ""} className="input" placeholder="Explanation shown after submitting (optional)" />
        <div className="flex justify-end gap-2">
          <SubmitButton className="btn-dark text-sm">{q ? "Save question" : "Add question"}</SubmitButton>
        </div>
      </form>
      {q && (
        <form action={deleteQuestion} className="-mt-10 w-fit">
          <input type="hidden" name="id" value={q.id} />
          <input type="hidden" name="module_id" value={moduleId} />
          <button className="btn text-sm text-brand hover:bg-brand-soft"><Trash2 className="h-4 w-4" /> Delete</button>
        </form>
      )}
    </div>
  );
}
