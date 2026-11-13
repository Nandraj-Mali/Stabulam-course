import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, FolderOpen, Lock, PlayCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { ResourceCard } from "@/components/ResourceCard";
import { requireOnboarded } from "@/lib/auth";
import { getCourseWithProgress } from "@/lib/course";
import { ModuleTile, ProgressRing } from "@/components/CourseTiles";
import { signResources } from "@/lib/resources";
import { fmtDuration, fmtMinutes, pad2 } from "@/lib/format";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { profile } = await requireOnboarded();
  const data = await getCourseWithProgress(slug, profile.id);
  if (!data) notFound();

  const pct = data.total ? Math.round((data.completed / data.total) * 100) : 0;
  const totalSec = data.modules.reduce((a, m) => a + (m.duration_seconds || 0), 0);

  // Resources from unlocked modules only (signed, short-lived links)
  const library = (
    await Promise.all(
      data.modules
        .filter((m) => m.state !== "locked" || profile.role === "admin")
        .map(async (m) => ({ m, files: await signResources(m.resources) }))
    )
  ).filter((x) => x.files.length);
  const lockedWithFiles = data.modules.filter((m) => m.state === "locked" && profile.role !== "admin" && (m.resources?.length ?? 0) > 0).length;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-4 pb-28 sm:px-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        {/* COURSE HEADER */}
        <section className="grid-bg relative mt-3 overflow-hidden rounded-[26px] p-6 text-white sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow">Your learning journey</p>
              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">{data.course.title}</h1>
              <div className="mt-5 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">{data.total} modules</span>
                {totalSec > 0 && <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">{fmtDuration(totalSec)} total</span>}
                <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">{fmtMinutes(data.watchedSec)} watched</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 font-medium"><Award className="h-4 w-4" /> Free certificate</span>
              </div>
              {data.next && (
                <Link href={`/course/${slug}/module/${data.next.position}`} className="btn mt-7 bg-white px-6 py-3 text-base text-ink hover:bg-cream">
                  <PlayCircle className="h-5 w-5 text-brand" />
                  {data.next.progress ? "Continue" : "Start"} Module {pad2(data.next.position)}
                </Link>
              )}
            </div>
            <ProgressRing pct={pct} done={data.completed} total={data.total} />
          </div>

          {/* step tracker */}
          <ol className="relative mt-8 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, data.total)}, minmax(0, 1fr))` }}>
            {data.modules.map((m) => (
              <li key={m.id} className="flex flex-col gap-2">
                <div className={`h-1.5 rounded-full ${m.state === "done" ? "bg-brand" : m.state === "open" ? "bg-white/70" : "bg-white/15"}`} />
                <span className={`text-xs ${m.state === "locked" ? "text-white/40" : "text-white/80"}`}>M{pad2(m.position)}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* MODULES — 2 per row */}
        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Modules</p>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Watch in order, unlock as you go</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {data.modules.map((m, i) => (
              <ModuleTile key={m.id} m={m} slug={slug} prev={data.modules[i - 1]} />
            ))}
          </div>

          {/* certificate milestone */}
          <div className={`mt-6 flex flex-col items-start justify-between gap-5 rounded-[22px] border-2 border-dashed p-6 sm:flex-row sm:items-center sm:p-8 ${data.allDone ? "border-brand bg-brand-soft" : "border-line bg-cream/60"}`}>
            <div className="flex items-center gap-4">
              <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${data.allDone ? "bg-brand text-white" : "bg-white text-muted"}`}>
                <Award className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-bold">{data.allDone ? "🎉 Your certificate is ready!" : "Final milestone: your free certificate"}</p>
                <p className="text-sm text-muted">
                  {data.allDone ? "Download it and share it on LinkedIn." : `Complete all ${data.total} modules to unlock it. ${data.total - data.completed} to go.`}
                </p>
              </div>
            </div>
            {data.allDone ? (
              <Link href="/certificate" className="btn-primary px-6 py-3">Get certificate <ArrowRight className="h-4 w-4" /></Link>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm text-muted"><Lock className="h-4 w-4" /> Locked</span>
            )}
          </div>
        </section>

        {/* RESOURCES LIBRARY */}
        <section className="mt-16">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-white"><FolderOpen className="h-5 w-5" /></span>
            <div>
              <p className="eyebrow">Resources</p>
              <h2 className="text-2xl font-bold sm:text-3xl">Downloads & templates</h2>
            </div>
          </div>
          {library.length === 0 ? (
            <div className="dots-bg mt-6 rounded-[22px] p-8 text-center text-muted">
              {lockedWithFiles > 0 ? "Resources unlock with each module. Start Module 01 to get your first downloads." : "Resources will appear here as they are added."}
            </div>
          ) : (
            <div className="mt-6 space-y-8">
              {library.map(({ m, files }) => (
                <div key={m.id}>
                  <p className="mb-3 text-sm font-semibold text-ink-2">
                    <span className="mr-2 rounded-md bg-ink px-2 py-0.5 text-xs text-white">M{pad2(m.position)}</span>
                    {m.title}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {files.map((r, i) => <ResourceCard key={i} r={r} />)}
                  </div>
                </div>
              ))}
              {lockedWithFiles > 0 && (
                <p className="flex items-center gap-2 text-sm text-muted"><Lock className="h-4 w-4" /> More resources unlock as you complete modules.</p>
              )}
            </div>
          )}
        </section>
      </main>
      <WhatsAppFab context={`(${profile.full_name}, ${profile.school_name})`} />
    </>
  );
}

