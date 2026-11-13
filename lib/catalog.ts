import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { BONUS_COLUMNS, MODULE_COLUMNS, type Bonus, type Module } from "@/lib/types";

export type PublicCourse = { id: string; slug: string; title: string; description: string | null; cover_url: string | null };

/** Published course + modules + bonuses for the home page. Cached; refreshed when admin saves (tag "site"). */
const loadCatalog = unstable_cache(
  async () => {
    const db = createPublicClient();
    const { data: course } = await db
      .from("courses")
      .select("id, slug, title, description, cover_url")
      .eq("is_published", true)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!course) return { course: null as PublicCourse | null, modules: [] as Module[], bonuses: [] as Bonus[] };
    const [{ data: modules }, { data: bonuses }] = await Promise.all([
      db.from("modules").select(MODULE_COLUMNS).eq("course_id", course.id).eq("is_published", true).order("position"),
      db.from("bonuses").select(BONUS_COLUMNS).eq("course_id", course.id).eq("is_published", true).order("position"),
    ]);
    return { course: course as PublicCourse, modules: (modules ?? []) as Module[], bonuses: (bonuses ?? []) as Bonus[] };
  },
  ["public-catalog-v1"],
  { tags: ["site"], revalidate: 600 }
);

export const getPublicCatalog = cache(async () => {
  try {
    return await loadCatalog();
  } catch {
    return { course: null as PublicCourse | null, modules: [] as Module[], bonuses: [] as Bonus[] };
  }
});
