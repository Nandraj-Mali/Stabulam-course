"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn, signUp } from "./actions";

function PasswordInput({ name, autoComplete }: { name: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input name={name} type={show ? "text" : "password"} required minLength={6} autoComplete={autoComplete} className="input pr-11" />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-0 px-3 text-muted" aria-label="Toggle password">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ErrorBox({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="rounded-lg bg-brand-soft px-3.5 py-2.5 text-sm text-brand-dark">{msg}</p>;
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Full name</label>
        <input name="full_name" required autoComplete="name" className="input" placeholder="e.g. Priya Sharma" />
      </div>
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" required autoComplete="email" className="input" placeholder="you@school.com" />
      </div>
      <div>
        <label className="label">Phone number</label>
        <input name="phone" type="tel" required autoComplete="tel" className="input" placeholder="10-digit mobile number" />
      </div>
      <div>
        <label className="label">Password</label>
        <PasswordInput name="password" autoComplete="new-password" />
      </div>
      <ErrorBox msg={state?.error} />
      <button disabled={pending} className="btn-primary w-full py-3">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Create free account
      </button>
      <p className="text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-medium text-ink underline">Log in</Link>
      </p>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label">Email or phone number</label>
        <input name="identifier" required autoComplete="username" className="input" placeholder="you@school.com or 98xxxxxxxx" />
      </div>
      <div>
        <label className="label">Password</label>
        <PasswordInput name="password" autoComplete="current-password" />
      </div>
      <ErrorBox msg={state?.error} />
      <button disabled={pending} className="btn-dark w-full py-3">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Log in
      </button>
      <p className="text-center text-sm text-muted">
        New here? <Link href="/signup" className="font-medium text-ink underline">Claim your free spot</Link>
      </p>
    </form>
  );
}
