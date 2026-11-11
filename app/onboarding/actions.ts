"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name as it should appear on the certificate"),
  school_name: z.string().trim().min(2, "Enter your school name"),
  designation: z.string().trim().min(2, "Select your designation"),
  city: z.string().trim().min(2, "Enter your city"),
  state: z.string().trim().min(2, "Enter your state"),
  school_board: z.string().trim().min(1, "Select your school board"),
  student_count: z.string().trim().min(1, "Select approximate student count"),
  whatsapp: z.string().trim().min(10, "Enter your WhatsApp number"),
});

export async function completeOnboarding(_: { error?: string } | undefined, formData: FormData) {
  const raw = Object.fromEntries(formData);
  if (raw.designation === "Other" && raw.designation_other) raw.designation = raw.designation_other;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", { p: parsed.data });
  if (error) return { error: error.message };
  redirect("/dashboard");
}
