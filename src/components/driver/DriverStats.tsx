import { DollarSign, TrendingUp, CheckCircle2, Star, Clock } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface DriverStatsProps {
  todayEarnings: number;
  weekEarnings: number;
  completedJobs: number;
  rating: number;
  pendingEarnings?: number;
}

export const DriverStats = ({ todayEarnings, weekEarnings, completedJobs, rating, pendingEarnings = 0 }: DriverStatsProps) => {
  const { t, formatCurrency } = useI18n();

  return (
    <div className="space-y-3">
      {/* Earnings Hero */}
      <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <p className="text-xs font-medium opacity-80 uppercase tracking-wider">{t("driver.todayEarnings")}</p>
        <p className="text-3xl font-bold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {formatCurrency(todayEarnings)}
        </p>
        <div className="flex items-center gap-1 mt-2 text-xs opacity-80">
          <TrendingUp className="w-3 h-3" />
          <span>{t("driver.vsYesterday")}</span>
        </div>
        {pendingEarnings > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs bg-white/15 rounded-lg px-2.5 py-1.5 w-fit">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">{t("driver.pendingEarnings")}: {formatCurrency(pendingEarnings)}</span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={<DollarSign className="w-4 h-4 text-primary" />} label={t("driver.thisWeek")} value={formatCurrency(weekEarnings, { maximumFractionDigits: 0, minimumFractionDigits: 0 })} />
        <StatCard icon={<CheckCircle2 className="w-4 h-4 text-[hsl(var(--swift-success))]" />} label={t("driver.completed")} value={`${completedJobs}`} />
        <StatCard icon={<Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />} label={t("driver.rating")} value={`${rating}`} />
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl bg-card border p-3 text-center">
    <div className="flex justify-center mb-1.5">{icon}</div>
    <p className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
  </div>
);
