import { useEffect, useState } from "react";
import { LoginForm } from "@/components/LoginForm";
import { SessionPanel } from "@/components/SessionPanel";
import { Card } from "@/ui";
import {
  clearToken,
  getToken,
  meRequest,
  setToken,
  type AuthUser,
} from "@/lib/auth";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(() => Boolean(getToken()));

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    meRequest()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setBooting(false));
  }, []);

  function handleSuccess(nextUser: AuthUser, token: string) {
    setToken(token);
    setUser(nextUser);
  }

  function handleLogout() {
    clearToken();
    setUser(null);
  }

  return (
    <div className="min-h-screen bg-[#0d242b] bg-[radial-gradient(1200px_700px_at_12%_-10%,#3aa18f_0%,transparent_55%),radial-gradient(900px_600px_at_110%_10%,#d4a25a_0%,transparent_50%),linear-gradient(160deg,#071217_0%,#123038_48%,#0d242b_100%)] font-sans text-[#0c1a1f]">
      <div className="grid min-h-screen place-items-center px-5 py-8">
        <div className="grid w-full max-w-[960px] grid-cols-1 items-stretch gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <header className="flex flex-col justify-center px-0.5 py-6 text-[#e8f2f0] animate-[rise_700ms_ease_both] max-lg:pt-1">
            <p className="mb-5 font-serif text-[clamp(2.6rem,14vw,5.5rem)] leading-[0.9] font-semibold tracking-[-0.04em] lg:text-[clamp(3rem,8vw,5.5rem)]">
              Leucine
            </p>
            <h1 className="mb-3.5 max-w-[14ch] font-serif text-[clamp(1.6rem,3vw,2.25rem)] leading-tight font-medium tracking-tight max-lg:max-w-none">
              {user ? "You’re signed in." : "Sign in to continue."}
            </h1>
            <p className="max-w-[32ch] text-[1.05rem] leading-relaxed text-[#e8f2f0]/72">
              Equipment cleaning records, verified operators, and a clear audit
              trail.
            </p>
          </header>

          <Card>
            {booting ? (
              <p className="text-[#0c1a1f]/60">Checking session…</p>
            ) : user ? (
              <SessionPanel user={user} onLogout={handleLogout} />
            ) : (
              <LoginForm onSuccess={handleSuccess} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
