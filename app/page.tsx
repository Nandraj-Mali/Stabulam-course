import Link from "next/link";
import { Armchair, Award, CalendarDays, CheckCircle2, MonitorPlay, ShieldCheck, Timer } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Countdown } from "@/components/Countdown";
import { ModuleCard } from "@/components/ModuleCard";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { MODULE_COLUMNS, type Module } from "@/lib/types";
import { fmtDuration } from "@/lib/format";

export const revalidate = 60;

export default async function Home() {
  const s = await getSettings();
  const h = s.hero;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, description")
    .eq("is_published", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const { data: modules } = course
    ? await supabase.from("modules").select(MODULE_COLUMNS).eq("course_id", course.id).eq("is_published", true).order("position")
    : { data: [] as Module[] };
  const mods = (modules ?? []) as Module[];
  const totalSec = mods.reduce((a, m) => a + (m.duration_seconds || 0), 0);

  const slotsTotal = Math.max(1, Math.min(20, Number(h.slots_total ?? 11)));
  const slotsFilled = Math.min(slotsTotal, Number(h.slots_filled ?? 9));
  const slotsLeft = slotsTotal - slotsFilled;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* HERO */}
        <section className="grid-bg relative mt-2 flex overflow-hidden rounded-[24px] px-5 py-8 text-white sm:px-10 sm:py-10 lg:min-h-[calc(100svh-120px)] lg:max-h-[640px] lg:items-center lg:px-12">
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative grid w-full items-center gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
            <div>
              <p className="eyebrow text-xs sm:text-sm">{h.eyebrow}</p>
              <h1 className="mt-3 text-3xl font-bold leading-[1.1] sm:text-4xl xl:text-5xl">{h.title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">{h.subtitle}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(h.badges ?? []).map((b, i) => (
                  <span key={b} className="pill px-3 py-2 text-xs sm:text-[13px]">
                    {i === 0 && <CalendarDays className="h-4 w-4" />}
                    {b}
                  </span>
                ))}
              </div>
              <Link
                href="/signup"
                className="mt-7 inline-flex items-center gap-2 rounded-xl border-2 border-brand bg-brand px-6 py-3 text-base font-medium text-white transition hover:bg-brand-dark sm:text-lg"
              >
                {h.cta_text} {h.value_price && <s className="opacity-80">{h.value_price}</s>} Free
              </Link>
            </div>

            <div className="dots-bg rounded-[22px] p-6 text-ink sm:p-7">
              <p className="flex items-center gap-2 text-lg font-medium">
                <Timer className="h-5 w-5 text-brand" /> {h.offer_title}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {Array.from({ length: slotsTotal }).map((_, i) => (
                  <Armchair key={i} className={`h-6 w-6 ${i < slotsFilled ? "text-ink" : "text-muted/40"}`} strokeWidth={i < slotsFilled ? 2.4 : 1.6} />
                ))}
              </div>
              {slotsLeft > 0 && <p className="mt-1.5 text-xs text-muted">Only {slotsLeft} free seats left in this batch</p>}
              {h.value_price && (
                <>
                  <p className="mt-5">
                    Total Value: <span className="font-semibold">{h.value_price}</span>
                  </p>
                  <p className="text-sm text-muted">Today you can get it for</p>
                </>
              )}
              <p className="mt-2 text-4xl font-bold tracking-tight">FREE</p>
              {h.countdown_end && (
                <>
                  <p className="mt-5 text-sm text-muted">This special offer ends in</p>
                  <p className="mt-0.5 text-xl font-medium">
                    <Countdown end={h.countdown_end} />
                  </p>
                </>
              )}
              {h.certificate_note && (
                <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm font-medium">{h.certificate_note}</p>
              )}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { icon: MonitorPlay, t: `${mods.length || 10} video modules`, d: `${totalSec ? fmtDuration(totalSec) : "About 2 hours"} of focused, practical training` },
            { icon: ShieldCheck, t: "Learn step by step", d: "Each module unlocks after you finish the previous one" },
            { icon: Award, t: "Free certificate", d: "Download your certificate once you complete all modules" },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="card p-6">
              <Icon className="h-7 w-7 text-brand" />
              <h3 className="mt-4 text-xl font-semibold">{t}</h3>
              <p className="mt-1 text-muted">{d}</p>
            </div>
          ))}
        </section>

        {/* MODULES */}
        <section id="modules" className="mt-24 scroll-mt-10">
          <p className="eyebrow">Course curriculum</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-5xl">{course?.title ?? h.title}</h2>
          {course?.description && <p className="mt-4 max-w-3xl text-lg text-muted">{course.description}</p>}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mods.map((m) => (
              <ModuleCard key={m.id} position={m.position} title={m.title} subtitle={m.subtitle} cover={m.cover_url} duration={m.duration_seconds} />
            ))}
          </div>
        </section>

        {/* CERTIFICATE */}
        <section id="certificate" className="mt-24 scroll-mt-10">
          <div className="dots-bg grid items-center gap-10 rounded-[28px] p-8 sm:p-14 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Free certificate</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-5xl">Finish the course, get certified</h2>
              <p className="mt-4 text-lg text-muted">
                Complete all modules and quizzes to download a verified certificate with your name, school and designation. Share it on LinkedIn or show it to your management.
              </p>
              <ul className="mt-6 space-y-2.5">
                {["100% free, no hidden charges", "Verifiable with a unique certificate ID", "Instant PDF download"].map((x) => (
                  <li key={x} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-brand" /> {x}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-primary mt-8 px-7 py-3.5 text-base">Start learning for free</Link>
            </div>
            <div className="rounded-2xl border-[10px] border-ink bg-white p-8 text-center shadow-xl">
              <p className="text-xs font-bold tracking-[0.3em] text-brand">CERTIFICATE OF COMPLETION</p>
              <p className="mt-6 text-sm text-muted">This is to certify that</p>
              <p className="mt-2 text-3xl font-bold">Your Name</p>
              <p className="mt-1 text-muted">Principal, Your School</p>
              <p className="mt-6 text-sm text-muted">has successfully completed</p>
              <p className="mt-1 text-xl font-semibold">{course?.title ?? h.title}</p>
              <div className="mx-auto mt-8 h-px w-40 bg-line" />
              <p className="mt-2 text-xs text-muted">{s.certificate.signatory_name}</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-24 max-w-3xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
            {[
              ["Is the course really free?", "Yes. The course and the certificate are completely free."],
              ["Who is this course for?", "School owners, principals, coordinators, admission teams and anyone handling marketing for a school."],
              ["How long is the course?", "Around 2 hours split across 10 short modules. Learn at your own pace."],
              ["Do I need any technical knowledge?", "No. Everything is explained step by step with real school examples."],
              ["How do I get the certificate?", "Watch all modules and pass the short quizzes. Your certificate becomes available instantly."],
            ].map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-medium">
                  {q}
                  <span className="text-2xl text-brand transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
