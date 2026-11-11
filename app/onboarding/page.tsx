import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { requireUser } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "Tell us about your school" };

export default async function OnboardingPage() {
  const { profile } = await requireUser();
  if (profile.onboarded_at) redirect("/dashboard");
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-6 sm:px-6">
        <p className="eyebrow">Step 1 of 1</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Tell us about your school</h1>
        <p className="mt-2 text-muted">We use these details to personalise the course and print your certificate.</p>
        <div className="card mt-8 p-6 sm:p-8">
          <OnboardingForm profile={profile} />
        </div>
      </main>
    </>
  );
}
