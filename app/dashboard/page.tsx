import Link from "next/link";
import { Award, Clock, Layers, PlayCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourseWithProgress } from "@/lib/course";
import { fmtMinutes, pad2 } from "@/lib/format";
import { getSettings, whatsappLink } from "@/lib/settings";

export const metadata = { title: "My dashboard" };

export default async function Dashboard() {
  const { profile } = await requireOnboarded();
  const s = await getSettings();
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, courses(slug)")
    .eq("user_id", profile.id);

  const courses = (
    await Promise.all(
      (enrollments ?? []).map((e) => {
        const c = e.courses as unknown as { slug: string } | null;
        return c ? getCourseWithProgress(c.slug, profile.id) : null;
      })
    )
  ).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof getCourseWithProgress>>>[];

  const first = profile.full_name.split(" ")[0];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1240px] px-4 pb-24 sm:px-6">
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Hi {first} 👋</h1>
        <p className="mt-1 text-muted">{profile.designation} · {profile.school_name}</p>

        {courses.length === 0 && (
          <div className="card mt-8 p-8 text-muted">No courses yet. Please check back soon.</div>
        )}

        {courses.map((c) => {
          const pct = c.total ? Math.round((c.completed / c.total) * 100) : 0;
          return (
            <section key={c.course.id} className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <div className="grid-bg relative overflow-hidden rounded-[28px] p-8 text-white sm:p-10">
                <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
                <div className="relative">
                  <p className="eyebrow">My course</p>
                  <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{c.course.title}</h2>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <span className="pill"><Layers className="h-4 w-4" /> {c.completed}/{c.total} modules</span>
                    <span className="pill"><Clock className="h-4 w-4" /> {fmtMinutes(c.watchedSec)} watched</span>
                  </div>
                  <div className="mt-8">
                    <div className="flex justify-between text-sm text-white/80">
                      <span>Progress</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-3">
                    {c.next ? (
                      <Link href={`/course/${c.course.slug}/module/${c.next.position}`} className="btn-primary px-6 py-3 text-base">
                        <PlayCircle className="h-5 w-5" />
                        {c.completed === 0 && !c.next.progress ? "Start" : "Continue"} Module {pad2(c.next.position)}
                      </Link>
                    ) : (
                      <Link href="/certificate" className="btn-primary px-6 py-3 text-base">
                        <Award className="h-5 w-5" /> Get your certificate
                      </Link>
                    )}
                    <Link href={`/course/${c.course.slug}`} className="btn border border-white/30 text-white hover:bg-white/10">
                      View all modules
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="dots-bg rounded-[28px] p-8">
                  <Award className="h-8 w-8 text-brand" />
                  <h3 className="mt-3 text-xl font-semibold">Free certificate</h3>
                  <p className="mt-1 text-muted">
                    {c.allDone ? "You've completed the course. Your certificate is ready!" : `Complete all ${c.total} modules to unlock your free certificate.`}
                  </p>
                  {c.allDone && <Link href="/certificate" className="btn-dark mt-4">Download certificate</Link>}
                </div>
                <div className="card p-8">
                  <h3 className="text-xl font-semibold">Need help?</h3>
                  <p className="mt-1 text-muted">Talk to our team directly on WhatsApp.</p>
                  <a href={whatsappLink(s, `(${profile.full_name}, ${profile.school_name})`)} target="_blank" rel="noopener noreferrer" className="btn mt-4 bg-[#25D366] text-white hover:bg-[#1ebe5a]">
                    Contact the team on WhatsApp
                  </a>
                </div>
              </div>
            </section>
          );
        })}
      </main>
      <WhatsAppFab context={`(${profile.full_name}, ${profile.school_name})`} />
    </>
  );
}
