import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const IDLE_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "visibilitychange"];

/**
 * Signs the user out after 10 minutes of inactivity, unless the
 * "Keep me signed in" flag is set in localStorage at login time.
 */
const IdleLogout = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem("keepSignedIn") === "true") return;

    const logout = async () => {
      await signOut();
      toast.info("Signed out due to inactivity");
      navigate(role === "driver" ? "/driver/login" : "/login", { replace: true });
    };

    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(logout, IDLE_MS);
    };

    reset();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user, role, signOut, navigate]);

  return null;
};

export default IdleLogout;
