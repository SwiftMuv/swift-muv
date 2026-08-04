import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import swiftmuvLogo from "@/assets/swiftmuv-logo.png";


const CustomerLogin = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, role } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(
    () => localStorage.getItem("keepSignedIn") === "true",
  );

  const handleForgotPassword = async () => {
    if (!email) return toast.error("Enter your email above first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent. Check your inbox.");
  };

  useEffect(() => {
    if (!user || !role) return;
    if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "driver") navigate("/driver/dashboard", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem("keepSignedIn", keepSignedIn ? "true" : "false");
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, "customer", fullName, { phone, address });
        if (error) toast.error(error.message);
      } else {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img
            src={swiftmuvLogo}
            alt="SwiftMuv logo"
            className="mx-auto h-28 w-auto object-contain"
          />

          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Sign up to book your first move" : "Sign in to manage your moves"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />
            </div>
          )}
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="phone">Telephone Number</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" required />
            </div>
          )}
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="address">Current Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="pr-10" />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!isSignUp && (
              <div className="flex justify-end">
                <button type="button" onClick={handleForgotPassword} className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
            )}
          </div>
          {!isSignUp && (
            <label className="flex items-center gap-2 text-sm text-foreground select-none">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Keep me signed in
            </label>
          )}
          <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={loading}>
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold text-primary hover:underline">
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>

        <div className="text-center">
          <Link to="/driver/login" className="text-xs text-muted-foreground hover:text-foreground">
            Are you a driver? Sign in here →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
