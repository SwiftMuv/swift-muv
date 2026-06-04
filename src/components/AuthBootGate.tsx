import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BUILD_VERSION } from "@/lib/buildVersion";

const PUBLIC_PATHS = ["/", "/index", "/login", "/driver", "/driver/login", "/reset-password", "/about", "/terms"];

const isPublic = (path: string) =>
  PUBLIC_PATHS.includes(path) || path.startsWith("/about") || path.startsWith("/terms");

/**
 * Boot-time auth gate: blocks rendering until Supabase session is resolved,
 * then redirects unauthenticated users away from protected routes before
 * any dashboard markup can flash. Also forces re-login after app updates.
 */
const AuthBootGate = ({ children }: { children: ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const storedVersion = localStorage.getItem("appVersion");
    if (storedVersion !== BUILD_VERSION) {
      localStorage.setItem("appVersion", BUILD_VERSION);
      if (user) {
        signOut();
      }
      return;
    }

    if (!user && !isPublic(location.pathname)) {
      const target = location.pathname.startsWith("/driver") ? "/driver/login" : "/login";
      navigate(target, { replace: true });
    }
  }, [loading, user, location.pathname, navigate, signOut]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthBootGate;
