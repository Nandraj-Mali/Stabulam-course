import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderCertificate } from "@/lib/certificate";
import { getSettings } from "@/lib/settings";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { p_id: id });
  const cert = Array.isArray(data) ? data[0] : null;
  if (!cert || cert.revoked) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  const s = await getSettings();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const bytes = await renderCertificate({
    id: cert.id,
    full_name: cert.full_name,
    course_title: cert.course_title,
    issued_at: cert.issued_at,
    brand_name: s.brand_name,
    logo_url: s.logo_url,
    signature_url: s.certificate.signature_url,
    signatory_name: s.certificate.signatory_name,
    signatory_title: s.certificate.signatory_title,
    verify_url: `${origin}/verify/${cert.id}`,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-${cert.id}.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
