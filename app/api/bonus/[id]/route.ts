import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Bonus PDF download: only for learners who completed the course (or admins). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) return NextResponse.redirect(new URL("/login", req.url));

  const admin = createAdminClient();
  const { data: bonus } = await admin.from("bonuses").select("course_id, file_path, file_name, is_published").eq("id", id).maybeSingle();
  if (!bonus?.file_path || (!bonus.is_published && profile.role !== "admin")) {
    return NextResponse.json({ error: "Bonus not found" }, { status: 404 });
  }

  if (profile.role !== "admin") {
    const { data: enr } = await admin
      .from("enrollments")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("course_id", bonus.course_id)
      .maybeSingle();
    if (!enr?.completed_at) return NextResponse.json({ error: "Complete the course to unlock this bonus." }, { status: 403 });
  }

  const { data, error } = await admin.storage
    .from("resources")
    .createSignedUrl(bonus.file_path, 60 * 10, { download: bonus.file_name ?? true });
  if (error || !data) return NextResponse.json({ error: "File unavailable" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
