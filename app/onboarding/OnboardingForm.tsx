"use client";

import { useActionState, useState } from "react";
import { Building2, GraduationCap, Landmark, Loader2 } from "lucide-react";
import { completeOnboarding } from "./actions";
import type { Profile } from "@/lib/types";

const TYPES = [
  { value: "School", icon: Building2 },
  { value: "Coaching Institute", icon: GraduationCap },
  { value: "University", icon: Landmark },
] as const;

export function OnboardingForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  const [type, setType] = useState(profile.institution_type ?? "");

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">1. Institution Name</label>
        <input name="school_name" defaultValue={profile.school_name ?? ""} required className="input" placeholder="Enter your institution name" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">2. Your Role</label>
        <input name="designation" defaultValue={profile.designation ?? ""} required className="input" placeholder="Enter your designation / role" />
      </div>
      <div>
        <label className="label">3. City</label>
        <input name="city" defaultValue={profile.city ?? ""} required className="input" placeholder="Enter your city" />
      </div>
      <div>
        <label className="label">4. State</label>
        <input name="state" defaultValue={profile.state ?? ""} required className="input" placeholder="Enter your state" />
      </div>

      <fieldset className="sm:col-span-2">
        <legend className="label">5. What type of institution are you associated with?</legend>
        <input type="hidden" name="institution_type" value={type} />
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPES.map(({ value, icon: Icon }) => {
            const active = type === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                aria-pressed={active}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left font-medium transition ${
                  active ? "border-brand bg-brand-soft text-ink" : "border-line hover:border-ink/40"
                }`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-brand text-white" : "bg-cream text-ink"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                {value}
              </button>
            );
          })}
        </div>
      </fieldset>

      {state?.error && <p className="rounded-lg bg-brand-soft px-3.5 py-2.5 text-sm text-brand-dark sm:col-span-2">{state.error}</p>}
      <button disabled={pending} className="btn-primary py-3 sm:col-span-2">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save &amp; start the course
      </button>
    </form>
  );
}
