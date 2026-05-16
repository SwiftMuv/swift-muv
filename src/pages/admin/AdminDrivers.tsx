import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Truck,
} from "lucide-react";

const DOC_LABEL: Record<string, string> = {
  police_check: "Police Background Check",
  license: "Driver's License",
  insurance: "Insurance",
  vehicle_registration: "Vehicle Registration",
  other: "Other",
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    approved: "bg-[hsl(var(--swift-success))]/15 text-[hsl(var(--swift-success))]",
    pending: "bg-[hsl(var(--swift-warning))]/15 text-[hsl(var(--swift-warning))]",
    rejected: "bg-[hsl(var(--swift-danger))]/15 text-[hsl(var(--swift-danger))]",
    active: "bg-[hsl(var(--swift-success))]/15 text-[hsl(var(--swift-success))]",
    offline: "bg-muted text-muted-foreground",
    suspended: "bg-[hsl(var(--swift-danger))]/15 text-[hsl(var(--swift-danger))]",
  };
  return map[s] ?? "bg-muted text-muted-foreground";
};

const driverDisplayStatus = (d: any) => {
  if (!d.is_verified) return "suspended";
  return d.is_online ? "active" : "offline";
};

const AdminDrivers = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docFilter, setDocFilter] = useState<string>("pending");
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejectDoc, setRejectDoc] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [docsDriver, setDocsDriver] = useState<any | null>(null);

  const load = async () => {
    const [d, docs] = await Promise.all([
      supabase.from("driver_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("driver_documents").select("*").order("created_at", { ascending: false }),
    ]);
    setDrivers(d.data ?? []);
    setDocuments(docs.data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const driverById = useMemo(() => {
    const m = new Map<string, any>();
    drivers.forEach((d) => m.set(d.user_id, d));
    return m;
  }, [drivers]);

  const filteredDocs = useMemo(
    () => documents.filter((d) => docFilter === "all" || d.status === docFilter),
    [documents, docFilter],
  );

  const pendingCount = documents.filter((d) => d.status === "pending").length;

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
    load();
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
    load();
  };

  const toggleVerification = async (d: any) => {
    const { error } = await supabase
      .from("driver_profiles")
      .update({ is_verified: !d.is_verified })
      .eq("user_id", d.user_id);
    if (error) toast.error(error.message);
    else {
      toast.success(!d.is_verified ? "Driver approved" : "Driver suspended");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered Drivers ({drivers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Background</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No drivers yet.
                  </TableCell>
                </TableRow>
              )}
              {drivers.map((d) => {
                const ds = driverDisplayStatus(d);
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Truck className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">{d.full_name || "Unnamed"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[d.vehicle_year, d.vehicle_make, d.vehicle_model].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] capitalize ${statusBadge(ds)}`}>
                        {ds}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] capitalize ${statusBadge(d.background_check_status ?? "pending")}`}
                      >
                        {d.background_check_status ?? "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">★ {Number(d.rating ?? 5).toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={d.is_verified ? "outline" : "default"}
                        onClick={() => toggleVerification(d)}
                      >
                        {d.is_verified ? "Suspend" : "Approve"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Driver Applications & Documents
            {pendingCount > 0 && (
              <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                {pendingCount} pending
              </span>
            )}
          </CardTitle>
          <Select value={docFilter} onValueChange={setDocFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {filteredDocs.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground text-center">No documents to review.</p>
            )}
            {filteredDocs.map((doc) => {
              const driver = driverById.get(doc.driver_id);
              return (
                <div key={doc.id} className="py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {DOC_LABEL[doc.document_type] ?? doc.document_type}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {driver?.full_name ?? "Driver"} · {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                    {doc.rejection_reason && (
                      <p className="text-[11px] text-[hsl(var(--swift-danger))] mt-1">
                        Reason: {doc.rejection_reason}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className={`text-[10px] capitalize ${statusBadge(doc.status)}`}>
                    {doc.status}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => openPreview(doc)}>
                    <Eye className="w-4 h-4 mr-1" /> Review
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
            <Button variant="outline" onClick={() => setRejectDoc(previewDoc)}>
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
            <Button onClick={() => previewDoc && approveDoc(previewDoc)}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button variant="ghost" onClick={() => setRejectDoc(null)}>
              Cancel
            </Button>
            <Button onClick={submitReject}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDrivers;
