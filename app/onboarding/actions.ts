"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  school_name: z.string().trim().min(2, "Enter your institution name"),
  designation: z.string().trim().min(2, "Enter your designation / role"),
  city: z.string().trim().min(2, "Enter your city"),
  state: z.string().trim().min(2, "Enter your state"),
  institution_type: z.enum(["School", "Coaching Institute", "University"], {
    message: "Select the type of institution you're associated with",
  }),
});

export async function completeOnboarding(_: { error?: string } | undefined, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", { p: parsed.data });
  if (error) return { error: error.message };
  redirect("/dashboard");
}
