import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Truck,
  ArrowRight,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  Camera,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type DocType = Database["public"]["Enums"]["driver_document_type"];

type DocSlot = {
  key: "license_front" | "license_back" | "insurance";
  label: string;
  hint: string;
  docType: DocType;
  accept: string;
};

const DOC_SLOTS: DocSlot[] = [
  { key: "license_front", label: "Driver's License (Front)", hint: "Clear photo of the front", docType: "license", accept: "image/*" },
  { key: "license_back", label: "Driver's License (Back)", hint: "Clear photo of the back", docType: "license", accept: "image/*" },
  { key: "insurance", label: "Insurance Documents", hint: "PDF or image accepted", docType: "insurance", accept: "image/*,application/pdf" },
];

const DriverLogin = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, role } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);

  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Driver fields
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  // Files
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<DocSlot["key"], File | null>>({
    license_front: null,
    license_back: null,
    insurance: null,
  });
  const avatarRef = useRef<HTMLInputElement>(null);
  const vehiclePhotoRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
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
    if (user && role === "driver") {
      navigate("/driver/dashboard", { replace: true });
    }
  }, [user, role, navigate]);

  const onAvatar = (file: File | null) => {
    setAvatar(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  };

  const onVehiclePhoto = (file: File | null) => {
    setVehiclePhoto(file);
    if (vehiclePhotoPreview) URL.revokeObjectURL(vehiclePhotoPreview);
    setVehiclePhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const uploadDriverFiles = async (userId: string) => {
    // Avatar -> driver-avatars (public)
    if (avatar) {
      const ext = avatar.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("driver-avatars")
        .upload(path, avatar, { upsert: true });
      if (!error) {
        const { data: pub } = supabase.storage.from("driver-avatars").getPublicUrl(path);
        await supabase
          .from("driver_profiles")
          .update({ avatar_url: pub.publicUrl, profile_picture_url: pub.publicUrl })
          .eq("user_id", userId);
      }
    }

    // Vehicle photo -> driver-avatars (public)
    if (vehiclePhoto) {
      const ext = vehiclePhoto.name.split(".").pop() || "jpg";
      const path = `${userId}/vehicle-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("driver-avatars")
        .upload(path, vehiclePhoto, { upsert: true });
      if (!error) {
        const { data: pub } = supabase.storage.from("driver-avatars").getPublicUrl(path);
        await supabase
          .from("driver_profiles")
          .update({ vehicle_photo_url: pub.publicUrl })
          .eq("user_id", userId);
      }
    }

    // Documents -> driver-documents (private) + rows in driver_documents
    for (const slot of DOC_SLOTS) {
      const file = docs[slot.key];
      if (!file) continue;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${slot.key}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("driver-documents")
        .upload(path, file);
      if (upErr) {
        toast.error(`Upload failed: ${slot.label}`);
        continue;
      }
      await supabase.from("driver_documents").insert({
        driver_id: userId,
        document_type: slot.docType,
        file_path: path,
        status: "pending",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isSignUp) {
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
      setLoading(false);
      return;
    }

    // Sign up flow
    if (!fullName || !dob || !phone || !address || !licensePlate) {
      toast.error("Please complete all required fields");
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, "driver", fullName, {
      date_of_birth: dob,
      phone,
      address,
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // After signUp, session should be active (auto-confirm). Upload files.
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      try {
        await supabase
          .from("driver_profiles")
          .update({ license_plate: licensePlate })
          .eq("user_id", session.user.id);
        await uploadDriverFiles(session.user.id);
      } catch (err) {
        console.error(err);
      }
    }

    toast.success("Account created. Welcome aboard!");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 dark">
      <div className="w-full max-w-sm space-y-6 py-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Truck className="h-7 w-7 text-primary" />
          </div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {isSignUp ? "Become a Driver" : "Driver Login"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Join our fleet and start earning" : "Sign in to your driver dashboard"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  className="relative w-24 h-24 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden hover:bg-primary/15 transition"
                  aria-label="Upload profile picture"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-7 h-7 text-primary" />
                  )}
                </button>
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onAvatar(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">Profile picture (optional)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Full Name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full legal name" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob" className="text-foreground">Date of Birth</Label>
                <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required max={new Date().toISOString().split("T")[0]} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">Telephone Number</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-foreground">Current Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, Postal Code" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plate" className="text-foreground">Vehicle Registration Number</Label>
                <Input id="plate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value.toUpperCase())} placeholder="ABC-1234" required />
              </div>

              {/* Vehicle photo upload */}
              <div className="space-y-2">
                <Label className="text-foreground">Vehicle Photo</Label>
                <button
                  type="button"
                  onClick={() => vehiclePhotoRef.current?.click()}
                  className="w-full h-32 rounded-xl bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden hover:bg-primary/15 transition"
                  aria-label="Upload vehicle photo"
                >
                  {vehiclePhotoPreview ? (
                    <img src={vehiclePhotoPreview} alt="Vehicle" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-primary">
                      <Camera className="w-7 h-7" />
                      <span className="text-xs">Tap to upload photo of your vehicle</span>
                    </div>
                  )}
                </button>
                <input
                  ref={vehiclePhotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onVehiclePhoto(e.target.files?.[0] ?? null)}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
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

          {isSignUp && (
            <div className="space-y-2 pt-2">
              <Label className="text-foreground">Upload Documents</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Required for verification. You can also add these later from your profile.
              </p>
              <div className="space-y-2">
                {DOC_SLOTS.map((slot) => {
                  const file = docs[slot.key];
                  return (
                    <label
                      key={slot.key}
                      className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-3 py-2.5 cursor-pointer hover:bg-card transition"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {file ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <Upload className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{slot.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {file ? file.name : slot.hint}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept={slot.accept}
                        className="hidden"
                        onChange={(e) =>
                          setDocs((d) => ({ ...d, [slot.key]: e.target.files?.[0] ?? null }))
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </div>
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
          <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
            ← Customer login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DriverLogin;
