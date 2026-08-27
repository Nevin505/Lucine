import { useNavigate } from "react-router-dom";
import { Card } from "@/ui";
import { LoginForm } from "@/components/LoginForm";
import { RedirectIfAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import type { AuthUser } from "@/lib/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  function handleSuccess(user: AuthUser) {
    setUser(user);
    void navigate("/equipment", { replace: true });
  }

  return (
    <RedirectIfAuth>
      <div className="min-h-screen bg-[#0d242b]">
        <div className="grid min-h-screen place-items-center px-5 py-8">
          <div className="grid w-full max-w-[960px] grid-cols-1 items-stretch gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            <header className="flex flex-col justify-center px-0.5 py-6 text-[#e8f2f0] animate-[rise_700ms_ease_both] max-lg:pt-1">
              <p className="mb-5 font-serif text-[clamp(2.6rem,14vw,5.5rem)] leading-[0.9] font-semibold tracking-[-0.04em] lg:text-[clamp(3rem,8vw,5.5rem)]">
                Leucine
              </p>
              <h1 className="mb-3.5 max-w-[14ch] font-serif text-[clamp(1.6rem,3vw,2.25rem)] leading-tight font-medium tracking-tight max-lg:max-w-none">
                Sign in to continue.
              </h1>
              <p className="max-w-[32ch] text-[1.05rem] leading-relaxed text-[#e8f2f0]/72">
                Equipment cleaning records, verified operators, and a clear
                audit trail.
              </p>
            </header>

            <Card>
              <LoginForm onSuccess={handleSuccess} />
            </Card>
          </div>
        </div>
      </div>
    </RedirectIfAuth>
  );
}
