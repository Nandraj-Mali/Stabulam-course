import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "../AuthForms";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Welcome back" subtitle="Log in with your email or phone number and password.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
