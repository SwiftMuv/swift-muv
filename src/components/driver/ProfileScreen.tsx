import { User, Truck, FileCheck, ShieldCheck, Star, Phone, Mail, MapPin, ChevronRight, Camera, CheckCircle2, Clock, XCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const verifiedCount = documents.filter((d) => d.status === "verified").length;
  const allVerified = verifiedCount === documents.length;

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
          Alex Thompson
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
            <Star className="w-3 h-3 mr-1 text-[hsl(var(--swift-warning))]" /> 4.9
          </Badge>
        </div>
      </div>

      {/* Personal Info */}
      <section className="rounded-xl bg-card border overflow-hidden">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-2">
          Personal Info
        </h3>
        <div className="divide-y divide-border">
          {[
            { icon: Phone, label: "+1 (514) 555-0147" },
            { icon: Mail, label: "alex.t@email.com" },
            { icon: MapPin, label: "Montreal, QC" },
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
      </section>

      {/* Vehicle Details */}
      <section className="rounded-xl bg-card border overflow-hidden">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-2">
          Vehicle
        </h3>
        <div className="px-4 pb-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">2022 Ford Transit 250</p>
              <p className="text-xs text-muted-foreground">Cargo Van · White · QC ABC-1234</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Capacity", value: "3,500 lbs" },
              { label: "Cargo Space", value: "234 cu ft" },
              { label: "Fuel Type", value: "Gas" },
            ].map((spec) => (
              <div key={spec.label} className="rounded-lg bg-secondary p-2 text-center">
                <p className="text-xs font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{spec.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{spec.label}</p>
              </div>
            ))}
          </div>
        </div>
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
      <Button variant="ghost" className="w-full rounded-xl h-11 text-sm text-[hsl(var(--swift-danger))] hover:text-[hsl(var(--swift-danger))] hover:bg-[hsl(var(--swift-danger))]/10">
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};

export default ProfileScreen;
