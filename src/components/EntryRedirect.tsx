import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Landing redirect: sends first-time or logged-out users to /login,
 * and returning authenticated users to their role-specific dashboard.
 */
const EntryRedirect = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (role === "driver") navigate("/driver/dashboard", { replace: true });
    else if (role === "admin") navigate("/admin", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [loading, user, role, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
};

export default EntryRedirect;
