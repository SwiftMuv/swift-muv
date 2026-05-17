import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Detect recovery via URL hash (Supabase puts type=recovery there)
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setIsRecovery(true);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setReady(true);
        setEmail(session?.user?.email ?? null);
      } else if (event === "SIGNED_IN") {
        setReady(true);
        setEmail(session?.user?.email ?? null);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setReady(true);
        setEmail(data.session.user?.email ?? null);
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        setUserRole((roleRow?.role as string) ?? null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("New passwords do not match");
    }
    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    setLoading(true);

    // Only verify old password when NOT in recovery flow (recovery users forgot it)
    if (!isRecovery && email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (signInError) {
        setLoading(false);
        return toast.error("Old password is incorrect");
      }
    }

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. Please sign in.");
    const redirectTo = userRole === "driver" ? "/driver/login" : "/login";
    await supabase.auth.signOut();
    navigate(redirectTo, { replace: true });
  };

  const PwInput = ({
    id,
    label,
    value,
    onChange,
    show,
    setShow,
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    setShow: (fn: (s: boolean) => boolean) => void;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 dark">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Set new password
          </h1>
          <p className="text-sm text-muted-foreground">
            {ready
              ? isRecovery
                ? "Enter your new password below"
                : "Enter your current and new password below"
              : "Validating recovery link..."}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isRecovery && (
            <PwInput id="old-password" label="Old Password" value={oldPassword} onChange={setOldPassword} show={showOld} setShow={setShowOld} />
          )}
          <PwInput id="new-password" label="New Password" value={password} onChange={setPassword} show={showNew} setShow={setShowNew} />
          <PwInput id="repeat-password" label="Repeat New Password" value={confirmPassword} onChange={setConfirmPassword} show={showRepeat} setShow={setShowRepeat} />
          <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={loading || !ready}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
