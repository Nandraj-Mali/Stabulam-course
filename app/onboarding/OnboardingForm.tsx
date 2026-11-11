"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { completeOnboarding } from "./actions";
import type { Profile } from "@/lib/types";

const DESIGNATIONS = ["Owner / Trustee", "Principal", "Vice Principal", "Coordinator", "Teacher", "Admission Counsellor", "Marketing Head", "Administrator", "Other"];
const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "Cambridge (IGCSE)", "Other"];
const SIZES = ["Under 300", "300 – 700", "700 – 1,500", "1,500 – 3,000", "3,000+"];

export function OnboardingForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  const [designation, setDesignation] = useState(profile.designation ?? "");
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Full name (for certificate)</label>
        <input name="full_name" defaultValue={profile.full_name} required className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">School name</label>
        <input name="school_name" defaultValue={profile.school_name ?? ""} required className="input" placeholder="e.g. Delhi Public School, Pune" />
      </div>
      <div>
        <label className="label">Your designation</label>
        <select name="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} required className="input">
          <option value="" disabled>Select</option>
          {DESIGNATIONS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      {designation === "Other" ? (
        <div>
          <label className="label">Please specify</label>
          <input name="designation_other" required className="input" />
        </div>
      ) : (
        <div>
          <label className="label">School board</label>
          <select name="school_board" defaultValue={profile.school_board ?? ""} required className="input">
            <option value="" disabled>Select</option>
            {BOARDS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      )}
      {designation === "Other" && (
        <div className="sm:col-span-2">
          <label className="label">School board</label>
          <select name="school_board" defaultValue={profile.school_board ?? ""} required className="input">
            <option value="" disabled>Select</option>
            {BOARDS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label">City</label>
        <input name="city" defaultValue={profile.city ?? ""} required className="input" />
      </div>
      <div>
        <label className="label">State</label>
        <input name="state" defaultValue={profile.state ?? ""} required className="input" />
      </div>
      <div>
        <label className="label">Approx. number of students</label>
        <select name="student_count" defaultValue={profile.student_count ?? ""} required className="input">
          <option value="" disabled>Select</option>
          {SIZES.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="label">WhatsApp number</label>
        <input name="whatsapp" type="tel" defaultValue={profile.whatsapp ?? profile.phone ?? ""} required className="input" />
      </div>
      {state?.error && <p className="rounded-lg bg-brand-soft px-3.5 py-2.5 text-sm text-brand-dark sm:col-span-2">{state.error}</p>}
      <button disabled={pending} className="btn-primary py-3 sm:col-span-2">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save &amp; start the course
      </button>
    </form>
  );
}
