import { useState, type FormEvent } from "react";
import { Button, Field } from "@/ui";
import { loginRequest, loginSchema, type AuthUser } from "@/lib/auth";

type Props = {
  onSuccess: (user: AuthUser) => void;
};

export function LoginForm({ onSuccess }: Props) {
  const [email, setEmail] = useState("operator@example.com");
  const [password, setPassword] = useState("password123");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setFieldErrors({});
    setPending(true);
    try {
      const { user } = await loginRequest(parsed.data);
      onSuccess(user);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
      />

      <Field
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />

      {formError ? (
        <p className="text-sm text-[#b42318]">{formError}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="mt-1 text-[0.82rem] leading-snug text-[#0c1a1f]/55">
        Demo:{" "}
        <code className="rounded-md bg-[#1f7a6c]/10 px-1.5 py-0.5 text-[0.78rem]">
          operator@example.com
        </code>{" "}
        /{" "}
        <code className="rounded-md bg-[#1f7a6c]/10 px-1.5 py-0.5 text-[0.78rem]">
          password123
        </code>
      </p>
    </form>
  );
}
