import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  // getClaims verifies the JWT locally (no round-trip to Supabase Auth when signing keys are asymmetric)
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) return { user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", sub).maybeSingle();
  if (!profile) return { user: null, profile: null as Profile | null };
  return { user: { id: sub as string, email: (data.claims.email as string | undefined) ?? profile.email }, profile: profile as Profile };
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
