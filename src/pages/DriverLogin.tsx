import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Truck, ArrowRight, Camera } from "lucide-react";

const DriverLogin = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user && role === "driver") navigate("/driver", { replace: true });
  }, [user, role, navigate]);

  const handleFile = (f: File | null) => {
    setAvatarFile(f);
    setAvatarPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isSignUp) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); setLoading(false); }
      return;
    }

    try {
      let profile_picture_url: string | null = null;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `signup/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("driver-avatars")
          .upload(path, avatarFile, { upsert: false, contentType: avatarFile.type });
        if (upErr) throw upErr;
        profile_picture_url = supabase.storage.from("driver-avatars").getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            role: "driver",
            full_name: `${firstName} ${lastName}`.trim(),
            phone,
            address,
            profile_picture_url,
          },
        },
      });
      if (error) throw error;
      toast.success("Account created! You're signed in.");
    } catch (err: any) {
      toast.error(err.message ?? "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 dark">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Truck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {isSignUp ? "Become a Driver" : "Driver Login"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Join our fleet and start earning" : "Sign in to your driver dashboard"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative h-20 w-20 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fn">First Name</Label>
                  <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ln">Last Name</Label>
                  <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telephone</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Current Address</Label>
                <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, Province" rows={2} required />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>

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
          <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
            ← Customer login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DriverLogin;
