import { Package, ArrowRight } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import type { Job } from "@/pages/DriverDashboard";

interface JobCardProps {
  job: Job;
  onAccept: (jobId: string) => void;
}

const moveSizeColor: Record<string, string> = {
  Small: "bg-[hsl(var(--swift-info))]/15 text-[hsl(var(--swift-info))]",
  Medium: "bg-[hsl(var(--swift-warning))]/15 text-[hsl(var(--swift-warning))]",
  Large: "bg-[hsl(var(--swift-danger))]/15 text-[hsl(var(--swift-danger))]",
};

export const JobCard = ({ job, onAccept }: JobCardProps) => {
  const { t, formatCurrency } = useI18n();
  return (
    <div className="rounded-2xl bg-card border p-4 space-y-3 transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{job.id}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${moveSizeColor[job.moveSize]}`}>
            {t(`drv.moveSize.${job.moveSize.toLowerCase()}`)}
          </span>
        </div>
        <p className="text-lg font-bold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {formatCurrency(job.price)}
        </p>
      </div>

      {/* Route */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
          <p className="text-sm leading-tight">{job.pickupAddress}</p>
        </div>
        <div className="ml-[3px] w-[2px] h-3 bg-border" />
        <div className="flex items-start gap-2">
          <div className="mt-1 w-2 h-2 rounded-full bg-[hsl(var(--swift-danger))] shrink-0" />
          <p className="text-sm leading-tight">{job.dropoffAddress}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Package className="w-3 h-3" /> {job.customerName}
        </span>
      </div>

      {/* Accept */}
      <Button onClick={() => onAccept(job.id)} className="w-full rounded-xl h-11 font-semibold gap-2">
        {t("drv.jobCard.accept")} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};
