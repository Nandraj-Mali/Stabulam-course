import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export type UserRow = Profile & {
  modules_completed: number;
  watched_seconds: number;
  avg_score: number | null;
  has_certificate: boolean;
};

/** Pulls all users + aggregates. Fine for thousands of users; move to a SQL view if it grows large. */
export async function getUserRows(): Promise<{ rows: UserRow[]; totalModules: number }> {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: progress }, { data: certs }, { count: totalModules }] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }).limit(10000),
    admin.from("module_progress").select("user_id, watched_seconds, completed_at, best_score").limit(100000),
    admin.from("certificates").select("user_id, revoked").limit(10000),
    admin.from("modules").select("id", { count: "exact", head: true }).eq("is_published", true),
  ]);

  const agg = new Map<string, { done: number; sec: number; scores: number[] }>();
  for (const p of progress ?? []) {
    const a = agg.get(p.user_id) ?? { done: 0, sec: 0, scores: [] };
    a.sec += p.watched_seconds ?? 0;
    if (p.completed_at) a.done += 1;
    if (p.best_score != null) a.scores.push(p.best_score);
    agg.set(p.user_id, a);
  }
  const certSet = new Set((certs ?? []).filter((c) => !c.revoked).map((c) => c.user_id));

  const rows = ((profiles ?? []) as Profile[]).map((p) => {
    const a = agg.get(p.id);
    return {
      ...p,
      modules_completed: a?.done ?? 0,
      watched_seconds: a?.sec ?? 0,
      avg_score: a?.scores.length ? Math.round(a.scores.reduce((x, y) => x + y, 0) / a.scores.length) : null,
      has_certificate: certSet.has(p.id),
    };
  });
  return { rows, totalModules: totalModules ?? 0 };
}
