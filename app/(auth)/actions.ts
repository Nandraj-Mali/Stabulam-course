"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { error?: string } | undefined;

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits; // default India
  return digits;
}

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  phone: z.string().trim().min(10, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { full_name, email, password } = parsed.data;
  const phone = normalizePhone(parsed.data.phone);
  if (phone.length < 11 || phone.length > 15) return { error: "Please enter a valid phone number" };

  const supabase = await createClient();
  const { data: taken } = await supabase.rpc("phone_exists", { p_phone: phone });
  if (taken) return { error: "This phone number is already registered. Please log in." };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, phone } },
  });
  if (error) {
    if (/registered|exists/i.test(error.message)) return { error: "This email is already registered. Please log in." };
    return { error: error.message };
  }
  if (!data.session) {
    return { error: "Account created, but email confirmation is ON in Supabase. Turn it off (Auth → Providers → Email) or confirm your email, then log in." };
  }
  redirect("/onboarding");
}

const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or phone number"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { identifier, password, next } = parsed.data;

  let email = identifier.toLowerCase();
  if (!identifier.includes("@")) {
    const admin = createAdminClient();
    const { data } = await admin.rpc("get_email_by_phone", { p_phone: normalizePhone(identifier) });
    if (!data) return { error: "Wrong phone number or password." };
    email = data as string;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wrong email/phone or password." };

  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(safeNext);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
