import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Phone, MessageCircle, Star, Clock, Shield, MapPin, ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DriverTrackingMap from "@/components/tracking/DriverTrackingMap";
import { StatusTimeline } from "@/components/tracking/StatusTimeline";
import { useDriverStatusUpdates } from "@/hooks/useDriverStatusUpdates";

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const total = searchParams.get("total") || "244.00";
  const moveSize = searchParams.get("size") || "Medium";

  const [eta, setEta] = useState(44);
  const [expanded, setExpanded] = useState(false);
  const { currentStatus, statusHistory, latestUpdate } = useDriverStatusUpdates();
  const prevStatusRef = useRef(currentStatus);

  const handleEtaUpdate = useCallback((minutes: number) => {
    setEta(Math.max(minutes, 2));
  }, []);

  // Fire toast notifications on status changes
  useEffect(() => {
    if (latestUpdate && latestUpdate.status !== prevStatusRef.current) {
      prevStatusRef.current = latestUpdate.status;
      const icons: Record<string, string> = { assigned: "✅", en_route: "🚛", arrived: "📍", completed: "🎉" };
      toast(latestUpdate.label, {
        description: latestUpdate.description,
        icon: icons[latestUpdate.status],
        duration: 5000,
      });
    }
  }, [latestUpdate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Map area */}
      <div className="relative h-[55vh] w-full">
        <DriverTrackingMap onEtaUpdate={handleEtaUpdate} />

        {/* Close button */}
        <button
          onClick={() => navigate("/")}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 shadow-md backdrop-blur-sm"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Bottom sheet */}
      <div className="relative -mt-4 flex flex-1 flex-col rounded-t-3xl bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {/* Handle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center py-3"
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </button>

        <div className="flex-1 space-y-5 px-5 pb-8">
          {/* ETA Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estimated arrival</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {eta} min
                </span>
                <span className="text-sm text-muted-foreground">ETA</span>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${
              currentStatus === "completed"
                ? "bg-[hsl(var(--swift-success))]/15 text-[hsl(var(--swift-success))]"
                : currentStatus === "arrived"
                ? "bg-[hsl(var(--swift-warning))]/15 text-[hsl(var(--swift-warning))]"
                : "bg-primary/10 text-primary"
            }`}>
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">
                {currentStatus === "assigned" && "Assigned"}
                {currentStatus === "en_route" && "En Route"}
                {currentStatus === "arrived" && "Arrived"}
                {currentStatus === "completed" && "Completed"}
              </span>
            </div>
          </div>

          {/* Driver card */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-secondary/30 p-4">
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                MR
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Shield className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Marcus Rivera</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                <span>4.9</span>
                <span>·</span>
                <span>Ford Transit</span>
              </div>
              <p className="text-xs text-muted-foreground">License: TX-4827K</p>
            </div>
            <div className="flex gap-2">
              <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20">
                <Phone className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20">
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Live Status</p>
            <StatusTimeline statusHistory={statusHistory} currentStatus={currentStatus} />
          </div>

          {/* Trip details (expandable) */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between text-sm"
          >
            <span className="font-semibold text-foreground">Trip Details</span>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expanded && (
            <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pickup</p>
                  <p className="font-medium text-foreground">123 Main St, Austin TX</p>
                </div>
              </div>
              <div className="ml-3 border-l-2 border-dashed border-border h-3" />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Drop-off</p>
                  <p className="font-medium text-foreground">456 Oak Ave, Dallas TX</p>
                </div>
              </div>
              <div className="my-2 border-t border-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{moveSize} move</span>
                <span className="font-semibold text-foreground">${total}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Fully insured · Tracking updates every 10s</span>
              </div>
            </div>
          )}

          {/* Cancel button */}
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="h-12 w-full rounded-xl text-sm font-semibold"
          >
            Cancel Booking
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
