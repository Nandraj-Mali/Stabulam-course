import { createClient } from "@/lib/supabase/server";
import { MODULE_COLUMNS, type Course, type Module, type Progress } from "@/lib/types";

export type ModuleWithState = Module & {
  state: "locked" | "open" | "done";
  progress?: Progress;
  percent: number;
};

export async function getCourseWithProgress(slug: string, userId: string) {
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
  if (!course) return null;
  const [{ data: modules }, { data: progress }] = await Promise.all([
    supabase.from("modules").select(MODULE_COLUMNS).eq("course_id", course.id).eq("is_published", true).order("position"),
    supabase.from("module_progress").select("*").eq("user_id", userId),
  ]);
  const pmap = new Map<string, Progress>((progress ?? []).map((p) => [p.module_id, p as Progress]));

  let prevDone = true;
  const mods: ModuleWithState[] = ((modules ?? []) as Module[]).map((m) => {
    const p = pmap.get(m.id);
    const done = !!p?.completed_at;
    const state: ModuleWithState["state"] = done ? "done" : prevDone ? "open" : "locked";
    prevDone = done;
    const percent = done ? 100 : m.duration_seconds ? Math.round(((p?.max_position ?? 0) / m.duration_seconds) * 100) : 0;
    return { ...m, state, progress: p, percent };
  });

  const completed = mods.filter((m) => m.state === "done").length;
  const watchedSec = mods.reduce((a, m) => a + (m.progress?.watched_seconds ?? 0), 0);
  return {
    course: course as Course,
    modules: mods,
    completed,
    total: mods.length,
    watchedSec,
    next: mods.find((m) => m.state === "open"),
    allDone: mods.length > 0 && completed === mods.length,
  };
}
