import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FolderOpen, Lightbulb } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { ResourceCard } from "@/components/ResourceCard";
import { requireOnboarded } from "@/lib/auth";
import { getCourseWithProgress } from "@/lib/course";
import { createAdminClient } from "@/lib/supabase/admin";
import { bunnyEmbedUrl } from "@/lib/bunny";
import { signResources } from "@/lib/resources";
import { fmtDuration, pad2 } from "@/lib/format";
import { ModuleExperience } from "./ModuleExperience";

export default async function ModulePage({ params }: { params: Promise<{ slug: string; n: string }> }) {
  const { slug, n } = await params;
  const { profile } = await requireOnboarded();
  const data = await getCourseWithProgress(slug, profile.id);
  if (!data) notFound();
  const idx = data.modules.findIndex((m) => m.position === Number(n));
  if (idx < 0) notFound();
  const mod = data.modules[idx];
  if (mod.state === "locked" && profile.role !== "admin") redirect(`/course/${slug}`);
  const nextMod = data.modules[idx + 1];

  // Video source is read with the service role so raw IDs never reach the browser except as a signed, expiring URL.
  const admin = createAdminClient();
  const [{ data: src }, files] = await Promise.all([
    admin.from("modules").select("video_provider_id, video_url").eq("id", mod.id).single(),
    signResources(mod.resources),
  ]);
  const embedUrl = src?.video_provider_id ? bunnyEmbedUrl(src.video_provider_id) : null;
  const directUrl = !embedUrl ? src?.video_url ?? null : null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-4 pb-24 sm:px-6">
        <Link href={`/course/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All modules
        </Link>
        <div className="mt-3">
          <p className="eyebrow">Module {pad2(mod.position)} of {pad2(data.total)} {mod.duration_seconds ? `· ${fmtDuration(mod.duration_seconds)}` : ""}</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-5xl">{mod.title}</h1>
          {mod.subtitle && <p className="mt-2 text-lg text-muted">{mod.subtitle}</p>}
        </div>

        <ModuleExperience
          moduleId={mod.id}
          embedUrl={embedUrl}
          directUrl={directUrl}
          watermark={profile.email}
          duration={mod.duration_seconds}
          startAt={mod.progress?.last_position ?? 0}
          maxPosition={mod.progress?.max_position ?? 0}
          videoCompleted={!!mod.progress?.video_completed}
          moduleCompleted={mod.state === "done"}
          popup={{
            enabled: mod.popup_enabled,
            intervalMinutes: mod.popup_interval_minutes,
            type: mod.popup_type,
            content: mod.popup_content ?? {},
          }}
          nextHref={nextMod ? `/course/${slug}/module/${nextMod.position}` : "/certificate"}
          nextLabel={nextMod ? `Next: Module ${pad2(nextMod.position)}` : "Get your certificate"}
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <section>
            <h2 className="text-2xl font-bold">About this module</h2>
            <div className="mt-3 whitespace-pre-line text-[17px] leading-relaxed text-ink-2">{mod.summary || "—"}</div>
            {mod.takeaways?.length > 0 && (
              <div className="dots-bg mt-8 rounded-2xl p-6">
                <h3 className="flex items-center gap-2 font-semibold"><Lightbulb className="h-5 w-5 text-brand" /> Key takeaways</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2">
                  {mod.takeaways.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            )}
          </section>
          <aside>
            <div className="rounded-[22px] bg-ink p-5 text-white sm:p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold"><FolderOpen className="h-5 w-5 text-brand" /> Resources</h3>
              <p className="mt-1 text-sm text-white/60">{files.length ? "Download the files for this module." : "No downloads for this module."}</p>
              {files.length > 0 && (
                <div className="mt-4 space-y-2.5">
                  {files.map((r, i) => <ResourceCard key={i} r={r} />)}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
      <WhatsAppFab context={`(${profile.full_name}, Module ${mod.position}: ${mod.title})`} />
    </>
  );
}
