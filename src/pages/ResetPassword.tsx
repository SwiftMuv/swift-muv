import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, AlertTriangle, Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

type LinkState = "validating" | "valid" | "invalid";

const PwInput = ({
  id,
  label,
  value,
  onChange,
  show,
  setShow,
  showLabel,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (fn: (s: boolean) => boolean) => void;
  showLabel: string;
  hideLabel: string;
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
        autoComplete="new-password"
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={show ? hideLabel : showLabel}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
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
  const [linkState, setLinkState] = useState<LinkState>("validating");
  const [linkError, setLinkError] = useState<string>("");

  useEffect(() => {
    const hash = window.location.hash || "";
    const query = window.location.search || "";
    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const queryParams = new URLSearchParams(query);

    const hashType = hashParams.get("type");
    const queryType = queryParams.get("type");
    const errorCode =
      hashParams.get("error_code") ||
      hashParams.get("error") ||
      queryParams.get("error_code") ||
      queryParams.get("error");
    const errorDescription =
      hashParams.get("error_description") || queryParams.get("error_description");

    const hasRecoveryIntent =
      hashType === "recovery" ||
      queryType === "recovery" ||
      hashParams.has("access_token") ||
      queryParams.has("code");

    // Supabase reports expired/invalid links via error params in the URL.
    if (errorCode) {
      const friendly =
        errorCode.includes("expired") || (errorDescription || "").toLowerCase().includes("expired")
          ? t("auth.resetPassword.expiredLinkMessage")
          : t("auth.resetPassword.invalidLinkMessage");
      setLinkState("invalid");
      setLinkError(errorDescription ? `${friendly}` : friendly);
      return;
    }

    if (hasRecoveryIntent) setIsRecovery(true);

    // Handle PKCE-style ?code=... reset links
    const code = queryParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          setLinkState("invalid");
          setLinkError(t("auth.resetPassword.invalidOrExpiredMessage"));
          return;
        }
        setIsRecovery(true);
        setReady(true);
        setLinkState("valid");
        setEmail(data.session?.user?.email ?? null);
      });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setReady(true);
        setLinkState("valid");
        setEmail(session?.user?.email ?? null);
      } else if (event === "SIGNED_IN" && session) {
        setReady(true);
        setEmail(session.user?.email ?? null);
        if (linkState === "validating") setLinkState("valid");
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setReady(true);
        setEmail(data.session.user?.email ?? null);
        setLinkState((prev) => (prev === "invalid" ? prev : "valid"));
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        setUserRole((roleRow?.role as string) ?? null);
      } else if (!hasRecoveryIntent && !code) {
        // No active session and no recovery intent in URL — treat as invalid entry.
        setLinkState("invalid");
        setLinkError(t("auth.resetPassword.noValidLinkMessage"));
      } else if (hasRecoveryIntent && !code) {
        // Wait briefly for PASSWORD_RECOVERY event; if it never comes the link is bad.
        window.setTimeout(() => {
          setLinkState((prev) => {
            if (prev === "validating") {
              setLinkError(t("auth.resetPassword.invalidOrExpiredMessage"));
              return "invalid";
            }
            return prev;
          });
        }, 4000);
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error(t("auth.resetPassword.passwordsDoNotMatch"));
    }
    if (password.length < 6) {
      return toast.error(t("auth.resetPassword.passwordTooShort"));
    }
    setLoading(true);

    if (!isRecovery && email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (signInError) {
        setLoading(false);
        return toast.error(t("auth.resetPassword.oldPasswordIncorrect"));
      }
    }

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("expired") || msg.includes("invalid") || msg.includes("session")) {
        setLinkState("invalid");
        setLinkError(t("auth.resetPassword.sessionExpiredMessage"));
        return;
      }
      return toast.error(error.message);
    }
    toast.success(t("auth.resetPassword.passwordUpdated"));
    const redirectTo = userRole === "driver" ? "/driver/login" : "/login";
    await supabase.auth.signOut();
    navigate(redirectTo, { replace: true });
  };

  const pwLabels = { showLabel: t("auth.showPassword"), hideLabel: t("auth.hidePassword") };



  if (linkState === "invalid") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 dark">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {t("auth.resetPassword.linkInvalidTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">{linkError}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full rounded-xl h-11 font-semibold">
              <Link to="/login">{t("auth.resetPassword.requestNewLink")}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-xl h-11">
              <Link to="/driver/login">{t("auth.resetPassword.driverSignIn")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (linkState === "validating") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 dark">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t("auth.resetPassword.validatingLink")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 dark">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {t("auth.resetPassword.setNewPassword")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ready
              ? isRecovery
                ? t("auth.resetPassword.enterNewPassword")
                : t("auth.resetPassword.enterCurrentAndNew")
              : t("auth.resetPassword.validatingRecovery")}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isRecovery && (
            <PwInput id="old-password" label={t("auth.resetPassword.oldPassword")} value={oldPassword} onChange={setOldPassword} show={showOld} setShow={setShowOld} />
          )}
          <PwInput id="new-password" label={t("auth.resetPassword.newPassword")} value={password} onChange={setPassword} show={showNew} setShow={setShowNew} />
          <PwInput id="repeat-password" label={t("auth.resetPassword.repeatNewPassword")} value={confirmPassword} onChange={setConfirmPassword} show={showRepeat} setShow={setShowRepeat} />
          <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={loading || !ready}>
            {loading ? t("auth.resetPassword.updating") : t("auth.resetPassword.updatePassword")}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
