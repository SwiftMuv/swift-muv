import { useEffect, useState } from "react";
import { User, Truck, FileCheck, ShieldCheck, Star, Phone, Mail, MapPin, ChevronRight, Camera, CheckCircle2, Clock, XCircle, LogOut, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type DriverProfile = Tables<"driver_profiles">;

interface Document {
  name: string;
  status: "verified" | "pending" | "expired" | "missing";
  expiry?: string;
}

const documents: Document[] = [
  { name: "Government ID", status: "verified", expiry: "Dec 2027" },
  { name: "Commercial Insurance", status: "verified", expiry: "Mar 2026" },
  { name: "Background Check", status: "pending" },
  { name: "Vehicle Inspection", status: "expired", expiry: "Jan 2025" },
];

const statusConfig = {
  verified: { icon: CheckCircle2, label: "Verified", className: "text-[hsl(var(--swift-success))] bg-[hsl(var(--swift-success))]/15" },
  pending: { icon: Clock, label: "Pending", className: "text-[hsl(var(--swift-warning))] bg-[hsl(var(--swift-warning))]/15" },
  expired: { icon: XCircle, label: "Expired", className: "text-[hsl(var(--swift-danger))] bg-[hsl(var(--swift-danger))]/15" },
  missing: { icon: XCircle, label: "Missing", className: "text-muted-foreground bg-muted" },
};

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [cargoCapacity, setCargoCapacity] = useState("");
  const [cargoSpace, setCargoSpace] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("driver_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast.error("Failed to load profile");
      } else if (data) {
        setProfile(data);
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setVehicleMake(data.vehicle_make ?? "");
        setVehicleModel(data.vehicle_model ?? "");
        setVehicleYear(data.vehicle_year?.toString() ?? "");
        setVehicleColor(data.vehicle_color ?? "");
        setLicensePlate(data.license_plate ?? "");
        setCargoCapacity(data.cargo_capacity_lbs?.toString() ?? "");
        setCargoSpace(data.cargo_space_cuft?.toString() ?? "");
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("driver_profiles")
      .update({
        full_name: fullName || null,
        phone: phone || null,
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        vehicle_year: vehicleYear ? parseInt(vehicleYear) : null,
        vehicle_color: vehicleColor || null,
        license_plate: licensePlate || null,
        cargo_capacity_lbs: cargoCapacity ? parseInt(cargoCapacity) : null,
        cargo_space_cuft: cargoSpace ? parseInt(cargoSpace) : null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile updated!");
      setEditing(false);
      // Refresh profile
      const { data } = await supabase
        .from("driver_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile(data);
    }
    setSaving(false);
  };

  const verifiedCount = documents.filter((d) => d.status === "verified").length;
  const allVerified = profile?.is_verified ?? false;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">Loading profile…</p>
      </div>
    );
  }

  const vehicleLabel = [profile?.vehicle_year, profile?.vehicle_make, profile?.vehicle_model]
    .filter(Boolean)
    .join(" ") || "No vehicle set";
  const vehicleMeta = [
    profile?.vehicle_color,
    profile?.license_plate,
  ].filter(Boolean).join(" · ") || "Add vehicle details";

  return (
    <div className="space-y-5">
      {/* Avatar & Name */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-10 h-10 text-primary" />
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background">
            <Camera className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
          {allVerified && (
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[hsl(var(--swift-success))] flex items-center justify-center border-2 border-background">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
        <h2 className="text-lg font-bold mt-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {profile?.full_name || "Driver"}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant="secondary"
            className={`text-xs font-semibold ${
              allVerified
                ? "bg-[hsl(var(--swift-success))]/15 text-[hsl(var(--swift-success))]"
                : "bg-[hsl(var(--swift-warning))]/15 text-[hsl(var(--swift-warning))]"
            }`}
          >
            <ShieldCheck className="w-3 h-3 mr-1" />
            {allVerified ? "Pro Verified" : "Verification Pending"}
          </Badge>
          <Badge variant="secondary" className="text-xs font-semibold">
            <Star className="w-3 h-3 mr-1 text-[hsl(var(--swift-warning))]" /> {profile?.rating?.toString() ?? "5.0"}
          </Badge>
        </div>
      </div>

      {/* Edit toggle */}
      <div className="flex justify-end">
        {!editing ? (
          <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-xl text-xs" onClick={handleSave} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Personal Info */}
      <section className="rounded-xl bg-card border overflow-hidden">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-2">
          Personal Info
        </h3>
        {editing ? (
          <div className="px-4 pb-3 space-y-3">
            <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {[
              { icon: Phone, label: profile?.phone || "No phone set" },
              { icon: Mail, label: user?.email || "No email" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm flex-1">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vehicle Details */}
      <section className="rounded-xl bg-card border overflow-hidden">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-2">
          Vehicle
        </h3>
        {editing ? (
          <div className="px-4 pb-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Make" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} />
              <Input placeholder="Model" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Year" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} />
              <Input placeholder="Color" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} />
              <Input placeholder="Plate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Capacity (lbs)" value={cargoCapacity} onChange={(e) => setCargoCapacity(e.target.value)} />
              <Input placeholder="Space (cu ft)" value={cargoSpace} onChange={(e) => setCargoSpace(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="px-4 pb-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{vehicleLabel}</p>
                <p className="text-xs text-muted-foreground">{vehicleMeta}</p>
              </div>
            </div>
            {(profile?.cargo_capacity_lbs || profile?.cargo_space_cuft) && (
              <div className="grid grid-cols-2 gap-2">
                {profile.cargo_capacity_lbs && (
                  <div className="rounded-lg bg-secondary p-2 text-center">
                    <p className="text-xs font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {profile.cargo_capacity_lbs.toLocaleString()} lbs
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Capacity</p>
                  </div>
                )}
                {profile.cargo_space_cuft && (
                  <div className="rounded-lg bg-secondary p-2 text-center">
                    <p className="text-xs font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {profile.cargo_space_cuft} cu ft
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Cargo Space</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Document Verification */}
      <section className="rounded-xl bg-card border overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Documents
          </h3>
          <span className="text-xs text-muted-foreground">
            {verifiedCount}/{documents.length} verified
          </span>
        </div>
        <div className="divide-y divide-border">
          {documents.map((doc) => {
            const config = statusConfig[doc.status];
            const StatusIcon = config.icon;
            return (
              <div key={doc.name} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.className}`}>
                  <StatusIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{doc.name}</p>
                  {doc.expiry && (
                    <p className="text-xs text-muted-foreground">Expires {doc.expiry}</p>
                  )}
                </div>
                <Badge variant="outline" className={`text-[10px] ${config.className} border-0`}>
                  {config.label}
                </Badge>
              </div>
            );
          })}
        </div>
        <div className="px-4 pb-3 pt-1">
          <Button variant="outline" className="w-full rounded-xl h-10 text-sm font-medium">
            <FileCheck className="w-4 h-4 mr-2" />
            Upload Documents
          </Button>
        </div>
      </section>

      {/* Sign Out */}
      <Button variant="ghost" className="w-full rounded-xl h-11 text-sm text-[hsl(var(--swift-danger))] hover:text-[hsl(var(--swift-danger))] hover:bg-[hsl(var(--swift-danger))]/10" onClick={signOut}>
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};

export default ProfileScreen;
