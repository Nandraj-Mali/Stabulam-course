import Link from "next/link";
import { Award, Gift, LayoutDashboard, Layers, Settings, Users, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Admin" };

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users & progress", icon: Users },
  { href: "/admin/modules", label: "Course & modules", icon: Layers },
  { href: "/admin/bonuses", label: "Bonuses", icon: Gift },
  { href: "/admin/certificates", label: "Certificates", icon: Award },
  { href: "/admin/settings", label: "Site settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  const s = await getSettings();
  return (
    <div className="min-h-screen bg-[#fbfbfa] lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-line bg-white p-5 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <Logo s={s} href="/admin" />
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brand">Admin panel</p>
        <nav className="mt-6 flex gap-1 overflow-x-auto lg:flex-col">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] text-ink-2 hover:bg-cream">
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
          <Link href="/" target="_blank" className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] text-muted hover:bg-cream">
            <ExternalLink className="h-4 w-4" /> View site
          </Link>
        </nav>
        <p className="mt-8 hidden text-xs text-muted lg:block">Signed in as {profile.email}</p>
      </aside>
      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
