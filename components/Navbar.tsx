import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSettings } from "@/lib/settings";
import { getSessionProfile } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

export async function Navbar() {
  const s = await getSettings();
  const { user, profile } = await getSessionProfile();
  return (
    <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-10">
        <Logo s={s} />
        <nav className="hidden items-center gap-8 text-[17px] text-ink md:flex">
          <Link href="/#modules" className="hover:text-brand">Modules</Link>
          <Link href="/#certificate" className="hover:text-brand">Certificate</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {user ? (
          <>
            {profile?.role === "admin" && (
              <Link href="/admin" className="btn-ghost hidden sm:inline-flex">Admin</Link>
            )}
            <Link href="/dashboard" className="btn-outline">Dashboard</Link>
            <form action={signOut}>
              <button className="btn-ghost">Log out</button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="btn-outline">Login</Link>
            <Link href="/signup" className="btn-dark">Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}
