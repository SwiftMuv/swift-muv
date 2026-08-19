import { Calendar, DollarSign, ChevronDown, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";

interface CompletedJob {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  moveSize: "Small" | "Medium" | "Large";
  date: string;
  earnings: number;
  tip: number;
}

const moveSizeBadge: Record<string, string> = {
  Small: "bg-[hsl(var(--swift-info))]/15 text-[hsl(var(--swift-info))]",
  Medium: "bg-[hsl(var(--swift-warning))]/15 text-[hsl(var(--swift-warning))]",
  Large: "bg-[hsl(var(--swift-danger))]/15 text-[hsl(var(--swift-danger))]",
};

const sizeLabel = (s?: string): CompletedJob["moveSize"] =>
  s === "small" ? "Small" : s === "large" ? "Large" : "Medium";

const HistoryCard = ({ job, onRebook }: { job: CompletedJob; onRebook: (job: CompletedJob) => void }) => {
  const { t, formatCurrency, formatDate } = useI18n();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl bg-card border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{job.id.slice(0, 8)}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${moveSizeBadge[job.moveSize]}`}>
            {t(`drv.moveSize.${job.moveSize.toLowerCase()}`)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {job.date ? formatDate(job.date, { hour: "numeric", minute: "numeric" }) : "—"}
        </span>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{formatCurrency(job.earnings)}</span>
          {job.tip > 0 && (
            <span className="text-[10px] text-[hsl(var(--swift-success))] font-medium">{t("drv.history.tip", { amount: formatCurrency(job.tip) })}</span>
          )}
        </div>
        <button
          onClick={() => onRebook(job)}
          className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary text-xs font-semibold px-3 py-1 hover:bg-primary/25 transition-colors"
        >
          <RotateCw className="w-3 h-3" />
          {t("common.rebook")}
        </button>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-center"
      >
        {t("history.routeDetails")}
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="space-y-2 pt-1">
          <div className="flex items-start gap-2">
            <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
            <p className="text-xs leading-tight text-muted-foreground">{job.pickupAddress}</p>
          </div>
          <div className="ml-[3px] w-[2px] h-2 bg-border" />
          <div className="flex items-start gap-2">
            <div className="mt-1 w-2 h-2 rounded-full bg-[hsl(var(--swift-danger))] shrink-0" />
            <p className="text-xs leading-tight text-muted-foreground">{job.dropoffAddress}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryScreen = ({ onRebook }: { onRebook?: () => void } = {}) => {
  const { user } = useAuth();
  const { t, formatCurrency } = useI18n();
  const [items, setItems] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, completed_at, tip_amount, bookings:booking_id(pickup_address,dropoff_address,move_size,total_price,status)")
        .eq("driver_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      const rows = (data ?? []).filter((r: any) => r.bookings?.status !== "cancelled").map((r: any) => ({
        id: r.id,
        pickupAddress: r.bookings?.pickup_address ?? "",
        dropoffAddress: r.bookings?.dropoff_address ?? "",
        moveSize: sizeLabel(r.bookings?.move_size),
        date: r.completed_at ?? "",
        earnings: Number(r.bookings?.total_price ?? 0),
        tip: Number(r.tip_amount ?? 0),
      }));
      setItems(rows);
      setLoading(false);
    })();
  }, [user]);

  const totalEarnings = items.reduce((sum, j) => sum + j.earnings + j.tip, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{t("history.totalEarned")}</p>
          <p className="text-2xl font-bold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {formatCurrency(totalEarnings)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t("history.completedTrips")}</p>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-xl bg-card border p-6 text-center">
            <p className="text-muted-foreground text-sm">{t("history.loading")}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-card border p-6 text-center">
            <p className="text-muted-foreground text-sm">{t("history.noTrips")}</p>
          </div>
        ) : (
          items.map((job) => <HistoryCard key={job.id} job={job} onRebook={() => onRebook?.()} />)
        )}
      </div>
    </div>
  );
};

export default HistoryScreen;
