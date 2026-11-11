import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { user, profile: profile as Profile | null };
});

export async function requireUser() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");
  return { user, profile };
}

export async function requireOnboarded() {
  const res = await requireUser();
  if (!res.profile.onboarded_at) redirect("/onboarding");
  return res;
}

export async function requireAdmin() {
  const res = await requireUser();
  if (res.profile.role !== "admin") redirect("/dashboard");
  return res;
}
