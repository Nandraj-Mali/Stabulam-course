import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "../AuthForms";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthShell title="Claim your free spot" subtitle="Create your account to start the course. It takes 30 seconds.">
      <SignupForm />
    </AuthShell>
  );
}
