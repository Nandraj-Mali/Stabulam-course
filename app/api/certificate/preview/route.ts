import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { renderCertificate } from "@/lib/certificate";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

/** Admin-only sample certificate to preview the design, logo and signature. */
export async function GET(req: Request) {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const s = await getSettings();
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("title").order("created_at").limit(1).maybeSingle();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  const bytes = await renderCertificate({
    id: "SAMPLE-0000",
    full_name: profile.full_name || "Learner Name",
    course_title: course?.title ?? s.hero.title ?? "Course",
    issued_at: new Date().toISOString(),
    brand_name: s.brand_name,
    logo_url: s.logo_url,
    signature_url: s.certificate.signature_url,
    signatory_name: s.certificate.signatory_name,
    signatory_title: s.certificate.signatory_title,
    verify_url: `${origin}/verify/SAMPLE`,
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="certificate-preview.pdf"', "Cache-Control": "no-store" },
  });
}
