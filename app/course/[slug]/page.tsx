import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { ModuleCard } from "@/components/ModuleCard";
import { requireOnboarded } from "@/lib/auth";
import { getCourseWithProgress } from "@/lib/course";
import { getSettings } from "@/lib/settings";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { profile } = await requireOnboarded();
  const data = await getCourseWithProgress(slug, profile.id);
  if (!data) notFound();
  const s = await getSettings();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1240px] px-4 pb-24 sm:px-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">{data.completed}/{data.total} modules completed</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-5xl">{data.course.title}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-cream px-4 py-3 text-sm font-medium">
            <Award className="h-5 w-5 text-brand" /> {s.hero.certificate_note ?? "Free certificate on completion"}
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.modules.map((m) => (
            <ModuleCard
              key={m.id}
              position={m.position}
              title={m.title}
              subtitle={m.subtitle}
              cover={m.cover_url}
              duration={m.duration_seconds}
              state={m.state}
              percent={m.percent}
              href={`/course/${slug}/module/${m.position}`}
            />
          ))}
        </div>

        {data.allDone && (
          <div className="dots-bg mt-12 flex flex-col items-start justify-between gap-4 rounded-[28px] p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold">🎉 Course completed!</h2>
              <p className="text-muted">Your free certificate is ready to download.</p>
            </div>
            <Link href="/certificate" className="btn-primary px-6 py-3">Get certificate</Link>
          </div>
        )}
      </main>
      <WhatsAppFab context={`(${profile.full_name}, ${profile.school_name})`} />
    </>
  );
}
