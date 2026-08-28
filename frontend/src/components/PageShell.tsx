import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button, Card } from "@/ui";
import { useAuth } from "@/lib/auth-context";

type Props = {
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
};

export function PageShell({
  title,
  description,
  children,
  wide = false,
}: Props) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#0d242b]">
      <div className="mx-auto grid min-h-screen w-full content-start gap-6 px-5 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4 text-[#e8f2f0]">
          <div className="grid gap-2">
            <Link
              to={user ? "/equipment" : "/login"}
              className="font-serif text-[clamp(2.2rem,8vw,3.5rem)] leading-none font-semibold tracking-[-0.04em] text-[#e8f2f0] no-underline"
            >
              Leucine
            </Link>
            <h1 className="max-w-[28ch] font-serif text-[clamp(1.35rem,3vw,1.85rem)] leading-tight font-medium tracking-tight">
              {title}
            </h1>
            <p className="max-w-[42ch] text-[1.02rem] leading-relaxed text-[#e8f2f0]/72">
              {description}
            </p>
          </div>

          {user ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-[#e8f2f0]/72">
                <span className="font-semibold text-[#e8f2f0]">{user.name}</span>
                <span className="mx-1.5 opacity-40">·</span>
                {user.role}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="border-white/20 bg-white/5 px-4 py-2.5 text-sm text-[#e8f2f0] hover:bg-white/10"
                onClick={() => void logout()}
              >
                Sign out
              </Button>
            </div>
          ) : null}
        </header>

        <Card className={wide ? "w-full" : "w-full max-w-[520px] justify-self-start"}>
          {children}
        </Card>
      </div>
    </div>
  );
}
