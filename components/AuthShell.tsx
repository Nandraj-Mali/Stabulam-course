import { Logo } from "@/components/Logo";
import { getSettings } from "@/lib/settings";
import { CheckCircle2 } from "lucide-react";

export async function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Logo s={s} />
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="m-4 hidden flex-col justify-end rounded-[28px] p-12 text-white lg:flex grid-bg relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative">
          <p className="eyebrow">{s.hero.eyebrow}</p>
          <h2 className="mt-3 text-5xl font-bold leading-tight">{s.hero.title}</h2>
          <ul className="mt-8 space-y-3 text-lg text-white/85">
            {(s.hero.badges ?? []).map((b) => (
              <li key={b} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand" /> {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
