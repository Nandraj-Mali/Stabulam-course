import Link from "next/link";
import { Award, Download, Share2, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseWithProgress } from "@/lib/course";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "My certificate" };

export default async function CertificatePage() {
  const { profile } = await requireOnboarded();
  const supabase = await createClient();
  const { data: enr } = await supabase.from("enrollments").select("course_id, courses(slug, title)").eq("user_id", profile.id);

  const items = await Promise.all(
    (enr ?? []).map(async (e) => {
      const c = e.courses as unknown as { slug: string; title: string };
      const prog = await getCourseWithProgress(c.slug, profile.id);
      let certId: string | null = null;
      let issued: string | null = null;
      if (prog?.allDone) {
        const { data } = await supabase.rpc("issue_certificate", { p_course: e.course_id });
        certId = data as string | null;
        if (certId) {
          const { data: row } = await supabase.from("certificates").select("issued_at").eq("id", certId).maybeSingle();
          issued = row?.issued_at ?? null;
        }
      }
      return { course: c, prog, certId, issued };
    })
  );

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1000px] px-4 pb-24 sm:px-6">
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">My certificate</h1>
        {items.map(({ course, prog, certId, issued }) => (
          <section key={course.slug} className="mt-8">
            {certId ? (
              <div className="grid-bg relative overflow-hidden rounded-[28px] p-8 text-white sm:p-12">
                <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
                <div className="relative">
                  <Award className="h-12 w-12 text-brand" />
                  <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Congratulations, {profile.full_name}!</h2>
                  <p className="mt-2 text-lg text-white/80">You&apos;ve completed <b>{course.title}</b>.</p>
                  <p className="mt-1 text-sm text-white/60">Certificate ID {certId} · Issued {fmtDate(issued)}</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <a href={`/api/certificate/${certId}`} target="_blank" className="btn-primary px-6 py-3 text-base">
                      <Download className="h-5 w-5" /> Download PDF
                    </a>
                    <Link href={`/verify/${certId}`} className="btn border border-white/30 text-white hover:bg-white/10">
                      <ShieldCheck className="h-5 w-5" /> Verification page
                    </Link>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(course.title)}&certId=${certId}&certUrl=${encodeURIComponent(`${site}/verify/${certId}`)}`}
                      className="btn border border-white/30 text-white hover:bg-white/10"
                    >
                      <Share2 className="h-5 w-5" /> Add to LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="dots-bg rounded-[28px] p-8 sm:p-12">
                <Award className="h-10 w-10 text-brand" />
                <h2 className="mt-3 text-2xl font-bold">{course.title}</h2>
                <p className="mt-1 text-muted">
                  You&apos;ve completed {prog?.completed ?? 0} of {prog?.total ?? 0} modules. Finish all modules to unlock your free certificate.
                </p>
                <div className="mt-5 h-2.5 max-w-md overflow-hidden rounded-full bg-white">
                  <div className="h-full bg-brand" style={{ width: `${prog?.total ? (prog.completed / prog.total) * 100 : 0}%` }} />
                </div>
                <Link href={`/course/${course.slug}`} className="btn-dark mt-6">Continue learning</Link>
              </div>
            )}
          </section>
        ))}
      </main>
      <WhatsAppFab />
    </>
  );
}
