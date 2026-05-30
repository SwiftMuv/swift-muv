import { DollarSign, TrendingUp, CheckCircle2, Star } from "lucide-react";

interface DriverStatsProps {
  todayEarnings: number;
  weekEarnings: number;
  completedJobs: number;
  rating: number;
}

export const DriverStats = ({ todayEarnings, weekEarnings, completedJobs, rating }: DriverStatsProps) => {
  return (
    <div className="space-y-3">
      {/* Earnings Hero */}
      <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Today's Earnings</p>
        <p className="text-3xl font-bold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          ${todayEarnings.toFixed(2)}
        </p>
        <div className="flex items-center gap-1 mt-2 text-xs opacity-80">
          <TrendingUp className="w-3 h-3" />
          <span>+12% vs yesterday</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={<DollarSign className="w-4 h-4 text-primary" />} label="This Week" value={`$${weekEarnings}`} />
        <StatCard icon={<CheckCircle2 className="w-4 h-4 text-[hsl(var(--swift-success))]" />} label="Completed" value={`${completedJobs}`} />
        <StatCard icon={<Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />} label="Rating" value={`${rating}`} />
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
