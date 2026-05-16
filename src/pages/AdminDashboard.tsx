import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, Truck, ClipboardList, DollarSign, FileCheck,
  CheckCircle2, XCircle, Clock, LogOut, ShieldCheck, FileText, Eye,
} from "lucide-react";

type Stats = {
  customers: number;
  drivers: number;
  verifiedDrivers: number;
  bookings: number;
  revenue: number;
  pendingDocs: number;
};

const DOC_LABEL: Record<string, string> = {
  police_check: "Police Background Check",
  license: "Driver's License",
  insurance: "Insurance",
  vehicle_registration: "Vehicle Registration",
  other: "Other",
};

const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    customers: 0, drivers: 0, verifiedDrivers: 0, bookings: 0, revenue: 0, pendingDocs: 0,
  });
  const [drivers, setDrivers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docFilter, setDocFilter] = useState<string>("pending");
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejectDoc, setRejectDoc] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadAll = async () => {
    const [c, d, b, docs] = await Promise.all([
      supabase.from("customer_profiles").select("id", { count: "exact", head: true }),
      supabase.from("driver_profiles").select("*"),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("driver_documents").select("*").order("created_at", { ascending: false }),
    ]);

    const drivs = d.data ?? [];
    const books = b.data ?? [];
    const dcs = docs.data ?? [];

    setDrivers(drivs);
    setBookings(books);
    setDocuments(dcs);
    setStats({
      customers: c.count ?? 0,
      drivers: drivs.length,
      verifiedDrivers: drivs.filter((x: any) => x.is_verified).length,
      bookings: books.length,
      revenue: books.reduce((s: number, x: any) => s + Number(x.total_price ?? 0), 0),
      pendingDocs: dcs.filter((x: any) => x.status === "pending").length,
    });
  };

  useEffect(() => { loadAll(); }, []);

  const filteredDocs = useMemo(
    () => documents.filter((d) => docFilter === "all" || d.status === docFilter),
    [documents, docFilter],
  );

  const driverById = useMemo(() => {
    const m = new Map<string, any>();
    drivers.forEach((d) => m.set(d.user_id, d));
    return m;
  }, [drivers]);

  const openPreview = async (doc: any) => {
    setPreviewDoc(doc);
    setPreviewUrl(null);
    const { data, error } = await supabase.storage
      .from("driver-documents")
      .createSignedUrl(doc.file_path, 60 * 10);
    if (error) toast.error("Could not load file");
    else setPreviewUrl(data.signedUrl);
  };

  const approveDoc = async (doc: any) => {
    const { error } = await supabase
      .from("driver_documents")
      .update({
        status: "approved",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", doc.id);
    if (error) return toast.error(error.message);

    if (doc.document_type === "police_check") {
      await supabase
        .from("driver_profiles")
        .update({ background_check_status: "approved" as any })
        .eq("user_id", doc.driver_id);
    }
    toast.success("Document approved");
    setPreviewDoc(null);
    loadAll();
  };

  const submitReject = async () => {
    if (!rejectDoc) return;
    if (!rejectReason.trim()) return toast.error("Add a reason");
    const { error } = await supabase
      .from("driver_documents")
      .update({
        status: "rejected",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectReason.trim(),
      })
      .eq("id", rejectDoc.id);
    if (error) return toast.error(error.message);

    if (rejectDoc.document_type === "police_check") {
      await supabase
        .from("driver_profiles")
        .update({ background_check_status: "rejected" as any })
        .eq("user_id", rejectDoc.driver_id);
    }
    toast.success("Document rejected");
    setRejectDoc(null);
    setRejectReason("");
    setPreviewDoc(null);
    loadAll();
  };

  const toggleDriverVerification = async (d: any) => {
    const { error } = await supabase
      .from("driver_profiles")
      .update({ is_verified: !d.is_verified })
      .eq("user_id", d.user_id);
    if (error) toast.error(error.message);
    else { toast.success(!d.is_verified ? "Driver approved" : "Verification revoked"); loadAll(); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      approved: "bg-[hsl(var(--swift-success))]/15 text-[hsl(var(--swift-success))]",
      pending: "bg-[hsl(var(--swift-warning))]/15 text-[hsl(var(--swift-warning))]",
      rejected: "bg-[hsl(var(--swift-danger))]/15 text-[hsl(var(--swift-danger))]",
    };
    return map[s] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Admin Dashboard
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="documents">
              Documents{stats.pendingDocs > 0 && <span className="ml-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">{stats.pendingDocs}</span>}
            </TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard icon={Users} label="Customers" value={stats.customers} />
              <StatCard icon={Truck} label="Drivers" value={stats.drivers} sub={`${stats.verifiedDrivers} verified`} />
              <StatCard icon={ClipboardList} label="Bookings" value={stats.bookings} />
              <StatCard icon={DollarSign} label="Revenue" value={`$${stats.revenue.toFixed(2)}`} />
              <StatCard icon={FileCheck} label="Pending Docs" value={stats.pendingDocs} />
            </div>
          </TabsContent>

          {/* Drivers */}
          <TabsContent value="drivers">
            <div className="rounded-xl border bg-card divide-y">
              {drivers.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">No drivers yet.</p>}
              {drivers.map((d) => (
                <div key={d.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{d.full_name || "Unnamed driver"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[d.vehicle_year, d.vehicle_make, d.vehicle_model].filter(Boolean).join(" ") || "No vehicle"}
                    </p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="secondary" className={`text-[10px] ${d.is_verified ? statusBadge("approved") : statusBadge("pending")}`}>
                        {d.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                      <Badge variant="secondary" className={`text-[10px] ${statusBadge(d.background_check_status ?? "pending")}`}>
                        Background: {d.background_check_status ?? "pending"}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" variant={d.is_verified ? "outline" : "default"} onClick={() => toggleDriverVerification(d)}>
                    {d.is_verified ? "Revoke" : "Approve"}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Driver Documents</h3>
              <Select value={docFilter} onValueChange={setDocFilter}>
                <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border bg-card divide-y">
              {filteredDocs.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground text-center">No documents to review.</p>
              )}
              {filteredDocs.map((doc) => {
                const driver = driverById.get(doc.driver_id);
                return (
                  <div key={doc.id} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{DOC_LABEL[doc.document_type] ?? doc.document_type}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {driver?.full_name ?? "Driver"} · {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                      <Badge variant="secondary" className={`text-[10px] mt-1 ${statusBadge(doc.status)}`}>
                        {doc.status}
                      </Badge>
                      {doc.rejection_reason && (
                        <p className="text-[11px] text-[hsl(var(--swift-danger))] mt-1">Reason: {doc.rejection_reason}</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openPreview(doc)}>
                      <Eye className="w-4 h-4 mr-1" /> Review
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings">
            <div className="rounded-xl border bg-card divide-y">
              {bookings.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">No bookings yet.</p>}
              {bookings.map((b) => (
                <div key={b.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{b.pickup_address} → {b.dropoff_address}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {b.move_size} · {new Date(b.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">${Number(b.total_price).toFixed(2)}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1">{b.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Revenue */}
          <TabsContent value="revenue" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={DollarSign} label="Total Revenue" value={`$${stats.revenue.toFixed(2)}`} />
              <StatCard
                icon={DollarSign}
                label="Service Fees"
                value={`$${bookings.reduce((s, b) => s + Number(b.service_fee ?? 0), 0).toFixed(2)}`}
              />
              <StatCard icon={ClipboardList} label="Avg Booking" value={`$${(stats.revenue / Math.max(1, stats.bookings)).toFixed(2)}`} />
              <StatCard icon={CheckCircle2} label="Completed" value={bookings.filter(b => b.status === "completed").length} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Preview dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {previewDoc && (DOC_LABEL[previewDoc.document_type] ?? previewDoc.document_type)}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg overflow-hidden bg-muted min-h-[300px] flex items-center justify-center">
            {!previewUrl && <p className="text-sm text-muted-foreground">Loading…</p>}
            {previewUrl && /\.(png|jpe?g|webp|gif)$/i.test(previewDoc?.file_path ?? "") && (
              <img src={previewUrl} alt="Document" className="max-h-[60vh] object-contain" />
            )}
            {previewUrl && !/\.(png|jpe?g|webp|gif)$/i.test(previewDoc?.file_path ?? "") && (
              <iframe src={previewUrl} title="Document" className="w-full h-[60vh]" />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectDoc(previewDoc); }}>
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
            <Button onClick={() => previewDoc && approveDoc(previewDoc)}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject reason */}
      <Dialog open={!!rejectDoc} onOpenChange={(o) => !o && setRejectDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Tell the driver why this is being rejected…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDoc(null)}>Cancel</Button>
            <Button onClick={submitReject}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: any; sub?: string }) => (
  <div className="rounded-xl border bg-card p-4">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-4 h-4" />
      <span className="text-xs uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl font-bold mt-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

export default AdminDashboard;
