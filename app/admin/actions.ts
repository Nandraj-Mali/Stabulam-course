"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const str = (f: FormData, k: string) => (f.get(k) as string | null)?.trim() ?? "";
const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

async function uploadImage(file: File | null, folder: string) {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("Please upload an image file");
  const admin = createAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await admin.storage.from("public-assets").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return admin.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
}

/* ---------------- Site settings ---------------- */
export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: cur } = await admin.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const logo = await uploadImage(formData.get("logo") as File | null, "brand");
  const heroImg = await uploadImage(formData.get("hero_image") as File | null, "hero");
  const countdown = str(formData, "countdown_end");

  const row = {
    id: 1,
    brand_name: str(formData, "brand_name") || "Stabulam",
    brand_tagline: str(formData, "brand_tagline") || null,
    logo_url: formData.get("remove_logo") ? null : logo ?? cur?.logo_url ?? null,
    hero: {
      eyebrow: str(formData, "eyebrow"),
      title: str(formData, "title"),
      subtitle: str(formData, "subtitle"),
      badges: lines(str(formData, "badges")),
      cta_text: str(formData, "cta_text"),
      value_price: str(formData, "value_price"),
      offer_title: str(formData, "offer_title"),
      slots_total: Number(str(formData, "slots_total")) || 0,
      slots_filled: Number(str(formData, "slots_filled")) || 0,
      countdown_end: countdown ? new Date(countdown).toISOString() : "",
      certificate_note: str(formData, "certificate_note"),
      image_url: formData.get("remove_hero_image") ? "" : heroImg ?? cur?.hero?.image_url ?? "",
    },
    whatsapp_number: str(formData, "whatsapp_number").replace(/\D/g, ""),
    whatsapp_message: str(formData, "whatsapp_message"),
    footer_text: str(formData, "footer_text"),
    footer_text_2: str(formData, "footer_text_2"),
    certificate: {
      signatory_name: str(formData, "signatory_name"),
      signatory_title: str(formData, "signatory_title"),
    },
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("site_settings").upsert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

/* ---------------- Courses ---------------- */
export async function saveCourse(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = str(formData, "id");
  const row = {
    title: str(formData, "title"),
    slug: str(formData, "slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    description: str(formData, "description"),
    is_published: formData.get("is_published") === "on",
  };
  const cover = await uploadImage(formData.get("cover") as File | null, "courses");
  if (cover) Object.assign(row, { cover_url: cover });
  if (formData.get("remove_cover")) Object.assign(row, { cover_url: null });
  const { error } = id ? await admin.from("courses").update(row).eq("id", id) : await admin.from("courses").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/admin/modules?saved=1");
}

/* ---------------- Modules ---------------- */
export async function saveModule(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = str(formData, "id");
  const cover = await uploadImage(formData.get("cover") as File | null, "modules");
  const mins = Number(str(formData, "duration_minutes")) || 0;

  let resources: unknown[] = [];
  try {
    const parsed = JSON.parse(str(formData, "resources_json") || "[]");
    if (Array.isArray(parsed))
      resources = parsed
        .filter((r) => r && typeof r.label === "string" && (typeof r.path === "string" || /^https?:\/\//.test(r.url ?? "")))
        .map((r) => ({ label: String(r.label).slice(0, 200), path: r.path, url: r.url, type: r.type, size: r.size }));
  } catch {
    resources = [];
  }

  const row: Record<string, unknown> = {
    course_id: str(formData, "course_id"),
    position: Number(str(formData, "position")) || 1,
    title: str(formData, "title"),
    subtitle: str(formData, "subtitle") || null,
    video_provider_id: str(formData, "video_provider_id") || null,
    video_url: str(formData, "video_url") || null,
    duration_seconds: Math.round(mins * 60),
    summary: str(formData, "summary"),
    takeaways: lines(str(formData, "takeaways")),
    resources,
    popup_enabled: formData.get("popup_enabled") === "on",
    popup_interval_minutes: Math.max(1, Number(str(formData, "popup_interval_minutes")) || 15),
    popup_type: str(formData, "popup_type") === "message" ? "message" : "attention",
    popup_content: {
      title: str(formData, "popup_title"),
      body: str(formData, "popup_body"),
      button_text: str(formData, "popup_button_text"),
      button_url: str(formData, "popup_button_url"),
    },
    is_published: formData.get("is_published") === "on",
  };
  if (cover) row.cover_url = cover;
  if (formData.get("remove_cover")) row.cover_url = null;

  if (id) {
    const { error } = await admin.from("modules").update(row).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    redirect(`/admin/modules/${id}?saved=1`);
  } else {
    const { data, error } = await admin.from("modules").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    redirect(`/admin/modules/${data.id}?saved=1`);
  }
}

export async function deleteModule(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("modules").delete().eq("id", str(formData, "id"));
  revalidatePath("/", "layout");
  redirect("/admin/modules");
}

/* ---------------- Users ---------------- */
export async function resetModuleProgress(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.rpc("admin_reset_progress", { p_user: str(formData, "user_id"), p_module: str(formData, "module_id") });
  revalidatePath(`/admin/users/${str(formData, "user_id")}`);
}

export async function completeModuleForUser(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.rpc("admin_complete_module", { p_user: str(formData, "user_id"), p_module: str(formData, "module_id") });
  revalidatePath(`/admin/users/${str(formData, "user_id")}`);
}

export async function setRole(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const role = str(formData, "role") === "admin" ? "admin" : "student";
  await admin.from("profiles").update({ role }).eq("id", str(formData, "user_id"));
  revalidatePath(`/admin/users/${str(formData, "user_id")}`);
}

/* ---------------- Certificates ---------------- */
export async function toggleRevoke(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("certificates").update({ revoked: str(formData, "revoked") === "true" }).eq("id", str(formData, "id"));
  revalidatePath("/admin/certificates");
}
