import { useEffect, useState } from "react";
import { Upload, FileText, CheckCircle2, Clock, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "police_check", label: "Police Background Check" },
  { value: "license", label: "Driver's License" },
  { value: "insurance", label: "Insurance" },
  { value: "vehicle_registration", label: "Vehicle Registration" },
  { value: "other", label: "Other" },
];

const statusIcon = {
  approved: { icon: CheckCircle2, cls: "text-[hsl(var(--swift-success))] bg-[hsl(var(--swift-success))]/15" },
  pending: { icon: Clock, cls: "text-[hsl(var(--swift-warning))] bg-[hsl(var(--swift-warning))]/15" },
  rejected: { icon: XCircle, cls: "text-[hsl(var(--swift-danger))] bg-[hsl(var(--swift-danger))]/15" },
};

const DriverDocumentsSection = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [type, setType] = useState("police_check");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("driver_documents")
      .select("*")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false });
    setDocs(data ?? []);
  };

  useEffect(() => { load(); }, [user?.id]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${type}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("driver-documents").upload(path, file);
    if (up.error) { toast.error(up.error.message); setUploading(false); return; }
    const { error } = await supabase.from("driver_documents").insert({
      driver_id: user.id,
      document_type: type as any,
      file_path: path,
    });
    if (error) toast.error(error.message);
    else toast.success("Uploaded — pending review");
    setUploading(false);
    e.target.value = "";
    load();
  };

  return (
    <section className="rounded-xl bg-card border overflow-hidden">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-2">
        My Documents
      </h3>

      <div className="px-4 pb-3 space-y-2">
        <div className="flex gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="flex-1 h-10 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button asChild className="rounded-xl h-10" disabled={uploading}>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4 mr-1" />
              {uploading ? "Uploading…" : "Upload"}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} disabled={uploading} />
            </label>
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {docs.length === 0 && (
          <p className="px-4 py-6 text-xs text-muted-foreground text-center">No documents uploaded yet.</p>
        )}
        {docs.map((d) => {
          const cfg = statusIcon[d.status as keyof typeof statusIcon];
          const Icon = cfg.icon;
          return (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.cls}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {DOC_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
                {d.rejection_reason && (
                  <p className="text-[11px] text-[hsl(var(--swift-danger))] mt-0.5">Reason: {d.rejection_reason}</p>
                )}
              </div>
              <Badge variant="outline" className={`text-[10px] ${cfg.cls} border-0`}>{d.status}</Badge>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default DriverDocumentsSection;
