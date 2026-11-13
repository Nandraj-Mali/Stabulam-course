import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteBonus, saveBonus } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ImageField } from "@/components/admin/ImageField";
import { PdfField } from "@/components/admin/PdfField";

export const dynamic = "force-dynamic";

export default async function EditBonus({
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
  const { data: b } = isNew ? { data: null } : await admin.from("bonuses").select("*").eq("id", id).maybeSingle();
  if (!isNew && !b) notFound();
  const courseId = b?.course_id ?? sp.course;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/bonuses" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All bonuses
      </Link>
      <div className="mt-3 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{isNew ? "New bonus" : b!.title}</h1>
        {sp.saved && <span className="inline-flex items-center gap-1.5 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-brand" /> Saved</span>}
      </div>

      <form action={saveBonus} className="mt-6 space-y-6">
        {!isNew && <input type="hidden" name="id" value={b!.id} />}
        <input type="hidden" name="course_id" value={courseId} />

        <fieldset className="card grid gap-4 p-6 sm:grid-cols-[110px_1fr]">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Bonus details</legend>
          <div><label className="label">Order</label><input name="position" type="number" min={1} defaultValue={b?.position ?? sp.position ?? 1} className="input" /></div>
          <div><label className="label">Title</label><input name="title" defaultValue={b?.title ?? ""} required className="input" placeholder="e.g. 50 Ready-to-Post Social Media Templates" /></div>
          <div className="sm:col-span-2">
            <label className="label">About / summary</label>
            <textarea name="summary" rows={5} defaultValue={b?.summary ?? ""} className="input" placeholder="What's inside this PDF and how it helps the learner." />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Thumbnail (4:3 recommended)</label>
            <ImageField name="thumbnail_url" initial={b?.thumbnail_url} folder="bonuses" previewClass="h-24 w-32" />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="is_published" defaultChecked={b?.is_published ?? true} className="accent-[#e11d2e]" /> Published (shown to learners)
          </label>
        </fieldset>

        <fieldset className="card p-6">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Bonus PDF</legend>
          <PdfField initialPath={b?.file_path} initialName={b?.file_name} initialSize={b?.file_size} />
        </fieldset>

        <div className="flex justify-end">
          <SubmitButton className="btn-primary px-8 py-3">{isNew ? "Create bonus" : "Save bonus"}</SubmitButton>
        </div>
      </form>

      {!isNew && (
        <form action={deleteBonus} className="mt-10 border-t border-line pt-6">
          <input type="hidden" name="id" value={b!.id} />
          <button className="btn text-brand hover:bg-brand-soft"><Trash2 className="h-4 w-4" /> Delete this bonus</button>
        </form>
      )}
    </div>
  );
}
