import { Button } from "@/ui";
import type { AuthUser } from "@/lib/auth";

type Props = {
  user: AuthUser;
  onLogout: () => void;
};

export function SessionPanel({ user, onLogout }: Props) {
  return (
    <section className="grid gap-4">
      <p className="text-xs font-bold tracking-[0.12em] text-[#1f7a6c] uppercase">
        Signed in
      </p>
      <h2 className="font-serif text-3xl font-semibold tracking-tight">
        {user.name}
      </h2>
      <dl className="grid gap-3 border-y border-[#0c1a1f]/12 py-4">
        <div className="grid gap-0.5">
          <dt className="text-xs tracking-[0.08em] text-[#0c1a1f]/50 uppercase">
            Email
          </dt>
          <dd className="font-semibold">{user.email}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-xs tracking-[0.08em] text-[#0c1a1f]/50 uppercase">
            Role
          </dt>
          <dd className="font-semibold">{user.role}</dd>
        </div>
      </dl>
      <Button
        type="button"
        variant="secondary"
        onClick={onLogout}
        className="justify-self-start"
      >
        Sign out
      </Button>
    </section>
  );
}
