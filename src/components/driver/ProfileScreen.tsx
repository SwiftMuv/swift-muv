import { useEffect, useRef, useState } from "react";
import {
  User,
  Truck,
  FileCheck,
  ShieldCheck,
  Star,
  Phone,
  Mail,
  ChevronRight,
  Camera,
  CheckCircle2,
  Clock,
  XCircle,
  LogOut,
  Save,
  Upload,
  FileText,
  Landmark,
  IdCard,
  ShieldAlert,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Tables, Database } from "@/integrations/supabase/types";
import { VEHICLE_OPTIONS, type VehicleCategory } from "@/lib/booking";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DriverReviews from "@/components/DriverReviews";
import AppFeedbackScreen from "@/components/driver/AppFeedbackScreen";
import LangCurrencySettings from "@/components/LangCurrencySettings";


type DriverProfile = Tables<"driver_profiles">;
type DocRow = Tables<"driver_documents">;
type DocType = Database["public"]["Enums"]["driver_document_type"];

const statusConfig = {
  approved: { icon: CheckCircle2, label: "Verified", className: "text-[hsl(var(--swift-success))] bg-[hsl(var(--swift-success))]/15" },
  pending: { icon: Clock, label: "Pending", className: "text-[hsl(var(--swift-warning))] bg-[hsl(var(--swift-warning))]/15" },
  rejected: { icon: XCircle, label: "Rejected", className: "text-[hsl(var(--swift-danger))] bg-[hsl(var(--swift-danger))]/15" },
  missing: { icon: ShieldAlert, label: "Not uploaded", className: "text-muted-foreground bg-muted" },
} as const;

type DocSlot = {
  type: DocType;
  name: string;
  icon: typeof FileText;
  description: string;
};

const DOC_SLOTS: DocSlot[] = [
  { type: "license", name: "Driver's License", icon: IdCard, description: "Front & back of valid license" },
  { type: "insurance", name: "Insurance Documents", icon: ShieldCheck, description: "Commercial vehicle insurance" },
  { type: "vehicle_registration", name: "Vehicle Registration", icon: FileText, description: "Current registration" },
  { type: "police_check", name: "Background Check", icon: FileCheck, description: "Police clearance certificate" },
  { type: "other", name: "Bank Details", icon: Landmark, description: "Void cheque or direct deposit form" },
];

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState<DocType | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const docTypeRef = useRef<DocType | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string; isPdf: boolean } | null>(null);
  const [previewLoading, setPreviewLoading] = useState<DocType | null>(null);
  const [thumbs, setThumbs] = useState<Partial<Record<DocType, { url: string; isPdf: boolean }>>>({});

  const THUMB_TYPES: DocType[] = ["license", "insurance", "police_check"];

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [cargoCapacity, setCargoCapacity] = useState("");
  const [cargoSpace, setCargoSpace] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory | "">("");

  const loadAll = async () => {
    if (!user) return;
    let { data: prof, error: e1 } = await supabase
      .from("driver_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Safety net: ensure a driver_profiles row exists so the UI renders
    if (!prof && !e1) {
      const { data: created } = await supabase
        .from("driver_profiles")
        .insert({
          user_id: user.id,
          full_name: (user.user_metadata as any)?.full_name ?? null,
          phone: (user.user_metadata as any)?.phone ?? null,
        })
        .select()
        .maybeSingle();
      prof = created ?? null;
    }

    const { data: dl, error: e2 } = await supabase
      .from("driver_documents")
      .select("*")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false });

    if (e1) toast.error("Failed to load profile");
    if (e2) toast.error("Failed to load documents");
    if (prof) {
      setProfile(prof);
      setFullName(prof.full_name ?? "");
      setPhone(prof.phone ?? "");
      setAddress(prof.address ?? "");
      setVehicleMake(prof.vehicle_make ?? "");
      setVehicleModel(prof.vehicle_model ?? "");
      setVehicleYear(prof.vehicle_year?.toString() ?? "");
      setVehicleColor(prof.vehicle_color ?? "");
      setLicensePlate(prof.license_plate ?? "");
      setCargoCapacity(prof.cargo_capacity_lbs?.toString() ?? "");
      setCargoSpace(prof.cargo_space_cuft?.toString() ?? "");
      setVehicleCategory((prof.vehicle_category as VehicleCategory) ?? "");
    }
    setDocs(dl ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Generate signed-URL thumbnails for key documents
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Partial<Record<DocType, { url: string; isPdf: boolean }>> = {};
      for (const t of THUMB_TYPES) {
        const latest = docs.find((d) => d.document_type === t);
        if (!latest) continue;
        const { data } = await supabase.storage
          .from("driver-documents")
          .createSignedUrl(latest.file_path, 60 * 30);
        if (data?.signedUrl) {
          next[t] = { url: data.signedUrl, isPdf: latest.file_path.toLowerCase().endsWith(".pdf") };
        }
      }
      if (!cancelled) setThumbs(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("driver_profiles")
      .update({
        full_name: fullName || null,
        phone: phone || null,
        address: address || null,
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        vehicle_year: vehicleYear ? parseInt(vehicleYear) : null,
        vehicle_color: vehicleColor || null,
        license_plate: licensePlate || null,
        cargo_capacity_lbs: cargoCapacity ? parseInt(cargoCapacity) : null,
        cargo_space_cuft: cargoSpace ? parseInt(cargoSpace) : null,
        vehicle_category: (vehicleCategory || null) as VehicleCategory | null,
      })
      .eq("user_id", user.id);

    if (error) toast.error("Failed to save profile");
    else {
      toast.success("Profile updated");
      setEditing(false);
      loadAll();
    }
    setSaving(false);
  };

  const handleSaveVehicle = async () => {
    if (!user) return;
    setSavingVehicle(true);
    const { error } = await supabase
      .from("driver_profiles")
      .update({
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        vehicle_year: vehicleYear ? parseInt(vehicleYear) : null,
        vehicle_color: vehicleColor || null,
        license_plate: licensePlate || null,
        cargo_capacity_lbs: cargoCapacity ? parseInt(cargoCapacity) : null,
        cargo_space_cuft: cargoSpace ? parseInt(cargoSpace) : null,
        vehicle_category: (vehicleCategory || null) as VehicleCategory | null,
      })
      .eq("user_id", user.id);

    if (error) toast.error("Failed to save vehicle details");
    else {
      toast.success("Vehicle details updated");
      setEditingVehicle(false);
      loadAll();
    }
    setSavingVehicle(false);
  };

  const handleAvatarChange = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("driver-avatars").upload(path, file, { upsert: true });
    if (upErr) {
      toast.error("Avatar upload failed");
      setUploadingAvatar(false);
      return;
    }
    const { data: pub } = supabase.storage.from("driver-avatars").getPublicUrl(path);
    const { error: updErr } = await supabase
      .from("driver_profiles")
      .update({ avatar_url: pub.publicUrl, profile_picture_url: pub.publicUrl })
      .eq("user_id", user.id);
    if (updErr) toast.error("Failed to save avatar");
    else {
      toast.success("Profile picture updated");
      loadAll();
    }
    setUploadingAvatar(false);
  };

  const handleDocChange = async (file: File) => {
    if (!user || !docTypeRef.current) return;
    const docType = docTypeRef.current;
    setUploadingType(docType);
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("driver-documents").upload(path, file);
    if (upErr) {
      toast.error("Upload failed");
      setUploadingType(null);
      return;
    }
    const { error: insErr } = await supabase.from("driver_documents").insert({
      driver_id: user.id,
      document_type: docType,
      file_path: path,
      status: "pending",
    });
    if (insErr) toast.error("Failed to save document");
    else {
      toast.success("Document uploaded");
      loadAll();
    }
    setUploadingType(null);
    docTypeRef.current = null;
  };

  const triggerDocUpload = (type: DocType) => {
    docTypeRef.current = type;
    docInputRef.current?.click();
  };

  const handlePreview = async (slot: DocSlot) => {
    const latest = docs.find((d) => d.document_type === slot.type);
    if (!latest) return;
    setPreviewLoading(slot.type);
    const { data, error } = await supabase.storage
      .from("driver-documents")
      .createSignedUrl(latest.file_path, 60 * 10);
    setPreviewLoading(null);
    if (error || !data?.signedUrl) {
      toast.error("Could not load document");
      return;
    }
    setPreviewDoc({
      name: slot.name,
      url: data.signedUrl,
      isPdf: latest.file_path.toLowerCase().endsWith(".pdf"),
    });
  };

  const docStatusFor = (type: DocType): keyof typeof statusConfig => {
    const latest = docs.find((d) => d.document_type === type);
    if (!latest) return "missing";
    return (latest.status as keyof typeof statusConfig) ?? "pending";
  };

  const allVerified = profile?.is_verified ?? false;
  const verifiedCount = DOC_SLOTS.filter((s) => docStatusFor(s.type) === "approved").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">Loading profile…</p>
      </div>
    );
  }

  const vehicleLabel =
    [profile?.vehicle_year, profile?.vehicle_make, profile?.vehicle_model].filter(Boolean).join(" ") ||
    "No vehicle set";
  const vehicleMeta =
    [profile?.vehicle_color, profile?.license_plate].filter(Boolean).join(" · ") || "Add vehicle details";

  const avatarUrl = profile?.avatar_url || profile?.profile_picture_url;

  return (
    <div className="space-y-5">
      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleAvatarChange(e.target.files[0])}
      />
      <input
        ref={docInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleDocChange(e.target.files[0])}
      />

      {/* Avatar & Name */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-primary" />
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-background disabled:opacity-50"
            aria-label="Upload profile picture"
          >
            <Camera className="w-4 h-4 text-primary-foreground" />
          </button>
          {allVerified && (
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[hsl(var(--swift-success))] flex items-center justify-center border-2 border-background">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold mt-3 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
          {typeof profile?.rating === "number" && profile.rating > 0 && (
            <Badge variant="secondary" className="text-xs font-semibold">
              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />{" "}
              {profile.rating.toString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Edit toggle */}
      <div className="flex justify-end">
        {!editing ? (
          <Button variant="outline" size="sm" className="rounded-xl text-xs bg-orange-500 hover:bg-orange-600 border-orange-500 text-white hover:text-white" onClick={() => setEditing(true)}>
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
            <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {[
              { icon: Phone, label: profile?.phone || "No phone set" },
              { icon: Mail, label: user?.email || "No email" },
              { icon: User, label: profile?.address || "No address set" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm flex-1 truncate">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vehicle Details */}
      <section className="rounded-xl bg-card border overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vehicle
          </h3>
          {editing ? null : editingVehicle ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg h-7 text-xs"
                onClick={() => {
                  setEditingVehicle(false);
                  // reset to last loaded values
                  setVehicleMake(profile?.vehicle_make ?? "");
                  setVehicleModel(profile?.vehicle_model ?? "");
                  setVehicleYear(profile?.vehicle_year?.toString() ?? "");
                  setVehicleColor(profile?.vehicle_color ?? "");
                  setLicensePlate(profile?.license_plate ?? "");
                  setCargoCapacity(profile?.cargo_capacity_lbs?.toString() ?? "");
                  setCargoSpace(profile?.cargo_space_cuft?.toString() ?? "");
                  setVehicleCategory((profile?.vehicle_category as VehicleCategory) ?? "");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-lg h-7 text-xs"
                onClick={handleSaveVehicle}
                disabled={savingVehicle}
              >
                <Save className="w-3 h-3 mr-1" />
                {savingVehicle ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg h-7 text-xs bg-orange-500 hover:bg-orange-600 border-orange-500 text-white hover:text-white"
              onClick={() => setEditingVehicle(true)}
            >
              {profile?.vehicle_make || profile?.vehicle_category ? "Edit" : "Add details"}
            </Button>
          )}
        </div>
        {editing || editingVehicle ? (
          <div className="px-4 pb-3 space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vehicle category</label>
              <Select value={vehicleCategory || undefined} onValueChange={(v) => setVehicleCategory(v as VehicleCategory)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select vehicle type" /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name} — {o.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            {profile?.vehicle_category ? (
              <Badge variant="secondary" className="text-[11px]">
                {VEHICLE_OPTIONS.find((o) => o.id === profile.vehicle_category)?.name ?? profile.vehicle_category}
              </Badge>
            ) : (
              <div className="rounded-lg bg-[hsl(var(--swift-warning))]/15 text-[hsl(var(--swift-warning))] text-xs px-3 py-2">
                Pick a vehicle category in edit mode — jobs are filtered by category.
              </div>
            )}
            {(profile?.cargo_capacity_lbs || profile?.cargo_space_cuft) && (
              <div className="grid grid-cols-2 gap-2">
                {profile?.cargo_capacity_lbs && (
                  <div className="rounded-lg bg-secondary p-2 text-center">
                    <p className="text-xs font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {profile.cargo_capacity_lbs.toLocaleString()} lbs
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Capacity</p>
                  </div>
                )}
                {profile?.cargo_space_cuft && (
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

      {/* Documents */}
      <section className="rounded-xl bg-card border overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documents & Verification</h3>
          <span className="text-xs text-muted-foreground">
            {verifiedCount}/{DOC_SLOTS.length} verified
          </span>
        </div>
        <div className="divide-y divide-border">
          {DOC_SLOTS.map((slot) => {
            const status = docStatusFor(slot.type);
            const config = statusConfig[status];
            const StatusIcon = config.icon;
            const SlotIcon = slot.icon;
            const isUploading = uploadingType === slot.type;
            const hasDoc = status !== "missing";
            const isLoadingPreview = previewLoading === slot.type;
            return (
              <div key={slot.name} className="flex items-center gap-2 px-4 py-3">
                {(() => {
                  const thumb = thumbs[slot.type];
                  if (thumb && !thumb.isPdf) {
                    return (
                      <button
                        type="button"
                        onClick={() => handlePreview(slot)}
                        className="w-9 h-9 rounded-xl overflow-hidden shrink-0 ring-1 ring-border hover:ring-primary transition"
                        aria-label={`Preview ${slot.name}`}
                      >
                        <img src={thumb.url} alt={slot.name} className="w-full h-full object-cover" />
                      </button>
                    );
                  }
                  if (thumb && thumb.isPdf) {
                    return (
                      <button
                        type="button"
                        onClick={() => handlePreview(slot)}
                        className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/20 transition"
                        aria-label={`Preview ${slot.name}`}
                      >
                        <FileText className="w-4 h-4 text-primary" />
                      </button>
                    );
                  }
                  return (
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <SlotIcon className="w-4 h-4 text-foreground" />
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{slot.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{slot.description}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${config.className} border-0 shrink-0`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
                {hasDoc && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg h-8 px-2 shrink-0"
                    onClick={() => handlePreview(slot)}
                    disabled={isLoadingPreview}
                    aria-label={`Preview ${slot.name}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg h-8 px-2 shrink-0 bg-green-300 hover:bg-green-400 text-green-900"
                  onClick={() => triggerDocUpload(slot.type)}
                  disabled={isUploading}
                  aria-label={`Upload ${slot.name}`}
                >
                  <Upload className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </section>
      {/* Customer reviews */}
      {user && (
        <section className="space-y-3">
          <DriverReviews driverId={user.id} title="What customers are saying" />
        </section>
      )}

      {/* Language & currency */}
      <LangCurrencySettings />

      {/* App Feedback */}

      <AppFeedbackScreen />

      {/* Sign Out */}
      <Button
        variant="ghost"
        className="w-full rounded-xl h-11 text-sm text-[hsl(var(--swift-danger))] hover:text-[hsl(var(--swift-danger))] hover:bg-[hsl(var(--swift-danger))]/10 active:scale-[0.98] transition"
        onClick={async () => {
          try {
            await signOut();
          } finally {
            window.location.href = "/driver/login";
          }
        }}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>

      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base">{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="w-full h-[70vh] bg-muted">
              {previewDoc.isPdf ? (
                <iframe src={previewDoc.url} className="w-full h-full" title={previewDoc.name} />
              ) : (
                <img src={previewDoc.url} alt={previewDoc.name} className="w-full h-full object-contain" />
              )}
            </div>
          )}
          {previewDoc && (
            <div className="px-4 py-3 border-t flex justify-end">
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline"
              >
                Open in new tab
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileScreen;
