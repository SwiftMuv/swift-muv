import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Package, Truck, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import type { Job } from "@/pages/DriverDashboard";

interface Props {
  job: Job | null;
  seconds?: number;
  onAccept: (jobId: string) => void;
  onReject: (jobId: string) => void;
}

const label = (key: string, fallback: string, t: (k: string) => string) => {
  const v = t(key);
  return !v || v === key ? fallback : v;
};

export const IncomingJobModal = ({ job, seconds = 30, onAccept, onReject }: Props) => {
  const { t, formatCurrency } = useI18n();
  const [left, setLeft] = useState(seconds);
  const rejectRef = useRef(onReject);
  rejectRef.current = onReject;

  useEffect(() => {
    if (!job) return;
    setLeft(seconds);
    const started = Date.now();
    const id = window.setInterval(() => {
      const remaining = seconds - Math.floor((Date.now() - started) / 1000);
      if (remaining <= 0) {
        window.clearInterval(id);
        setLeft(0);
        rejectRef.current(job.id);
      } else {
        setLeft(remaining);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [job, seconds]);

  if (!job) return null;

  const pct = Math.max(0, Math.min(100, (left / seconds) * 100));

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-primary/40 bg-card shadow-[0_20px_60px_hsl(var(--primary)/0.25)] overflow-hidden">
        {/* Countdown bar */}
        <div className="h-1.5 w-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {label("drv.incoming.title", "New move request", t)}
              </p>
              <p className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {formatCurrency(job.price)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-primary">{left}</p>
              <p className="text-[10px] text-muted-foreground uppercase">
                {label("drv.incoming.seconds", "seconds", t)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              <Truck className="w-3 h-3" /> {job.vehicleLabel ?? job.moveSize}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground/70">
              <Package className="w-3 h-3" /> {job.moveSize}
            </span>
            {job.distanceKm != null && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground/70">
                <Navigation className="w-3 h-3" /> {job.distanceKm.toFixed(1)} km
              </span>
            )}
            {job.etaMinutes != null && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground/70">
                {job.etaMinutes} min
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
              <p className="text-sm leading-tight">{job.pickupAddress}</p>
            </div>
            <div className="ml-[3px] w-[2px] h-3 bg-border" />
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-[hsl(var(--swift-danger))] shrink-0" />
              <p className="text-sm leading-tight">{job.dropoffAddress}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              variant="outline"
              className="h-12 rounded-xl gap-2"
              onClick={() => onReject(job.id)}
            >
              <X className="w-4 h-4" /> {label("drv.incoming.reject", "Reject", t)}
            </Button>
            <Button className="h-12 rounded-xl gap-2 font-semibold" onClick={() => onAccept(job.id)}>
              <Check className="w-4 h-4" /> {label("drv.incoming.accept", "Accept", t)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingJobModal;
