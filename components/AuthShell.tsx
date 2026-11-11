import { Logo } from "@/components/Logo";
import { getSettings } from "@/lib/settings";
import { CheckCircle2 } from "lucide-react";

export async function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <div className="grid min-h-svh lg:h-svh lg:grid-cols-2 lg:overflow-hidden">
      <div className="flex flex-col px-4 py-5 sm:px-10 lg:overflow-y-auto">
        <Logo s={s} />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-6">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mt-1.5 text-sm text-muted sm:text-base">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
      <div className="grid-bg relative m-3 hidden flex-col justify-end overflow-hidden rounded-[24px] p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative">
          <p className="eyebrow">{s.hero.eyebrow}</p>
          <h2 className="mt-3 text-4xl font-bold leading-tight">{s.hero.title}</h2>
          <ul className="mt-6 space-y-2.5 text-white/85">
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
