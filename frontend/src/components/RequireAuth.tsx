import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export function RequireAuth() {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0d242b] px-5 text-[#e8f2f0]/72">
        Checking session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth();

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0d242b] px-5 text-[#e8f2f0]/72">
        Checking session…
      </div>
    );
  }

  if (user) {
    return <Navigate to="/equipment" replace />;
  }

  return children;
}
