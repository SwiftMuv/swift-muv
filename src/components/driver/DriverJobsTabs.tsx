import { MapPin, DollarSign, Truck, ArrowRight, Loader2, Navigation, Clock, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/contexts/I18nContext";
import type { Job, JobStatus } from "@/pages/DriverDashboard";
import { cn } from "@/lib/utils";

interface Props {
  loading: boolean;
  available: Job[];
  activeJob: Job | null;
  onAccept: (jobId: string) => void;
  onUpdateStatus: (s: JobStatus) => void;
}

const nextLabel: Record<JobStatus, { label: string; next: JobStatus } | null> = {
  assigned: { label: "driver.markArrived", next: "arrived" },
  arrived: { label: "driver.markLoaded", next: "in_transit" },
  in_transit: { label: "driver.completeTrip", next: "completed" },
  completed: null,
};

const Row = ({ icon: Icon, text }: { icon: typeof MapPin; text: string }) => (
  <div className="flex items-start gap-2 text-sm">
    <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
    <span className="leading-tight">{text}</span>
  </div>
);

export const DriverJobsTabs = ({ loading, available, activeJob, onAccept, onUpdateStatus }: Props) => {
  const { t, formatCurrency } = useI18n();
  const step = activeJob ? nextLabel[activeJob.status as JobStatus] : null;

  return (
    <Tabs defaultValue="available" className="w-full">
      <TabsList className="grid grid-cols-2 w-full rounded-xl">
        <TabsTrigger value="available" className="rounded-lg">{t("driver.available")} ({available.length})</TabsTrigger>
        <TabsTrigger value="active" className="rounded-lg">{t("driver.myActive")} ({activeJob ? 1 : 0})</TabsTrigger>
      </TabsList>

      <TabsContent value="available" className="mt-4 space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </>
        ) : available.length === 0 ? (
          <div className="rounded-xl bg-card border p-6 text-center">
            <Truck className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t("driver.noJobs")}</p>
          </div>
        ) : (
          available.map((j, i) => {
            const closest = i === 0 && j.distanceKm != null;
            return (
              <div
                key={j.id}
                className={cn(
                  "rounded-2xl bg-card border p-4 space-y-3 animate-fade-in transition-shadow hover:shadow-md",
                  closest && "border-primary/60 shadow-[0_6px_20px_hsl(var(--primary)/0.18)]",
                )}
                style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
              >
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {j.moveSize}
                    </span>
                    {closest && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                        <Sparkles className="w-3 h-3" /> Closest
                      </span>
                    )}
                    {j.distanceKm != null && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground/70">
                        <Navigation className="w-3 h-3" /> {j.distanceKm.toFixed(1)} km
                      </span>
                    )}
                    {j.etaMinutes != null && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground/70">
                        <Clock className="w-3 h-3" /> {j.etaMinutes} min
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 font-bold text-primary shrink-0">
                    <DollarSign className="w-4 h-4" />{formatCurrency(j.price)}
                  </span>
                </div>
                <Row icon={MapPin} text={`${t("driver.pickup")} ${j.pickupAddress}`} />
                <Row icon={MapPin} text={`${t("driver.dropoff")} ${j.dropoffAddress}`} />
                <Button onClick={() => onAccept(j.id)} className="w-full rounded-xl h-11 gap-2">
                  {t("driver.acceptJob")} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            );
          })
        )}
      </TabsContent>

      <TabsContent value="active" className="mt-4 space-y-3">
        {loading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : !activeJob ? (
          <div className="rounded-xl bg-card border p-6 text-center">
            <Loader2 className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t("driver.noActiveJob")}</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary uppercase">
                {t(`status.${activeJob.status}`)}
              </span>
              <span className="flex items-center gap-1 font-bold text-primary">
                <DollarSign className="w-4 h-4" />{formatCurrency(activeJob.price)}
              </span>
            </div>
            <Row icon={MapPin} text={`${t("driver.pickup")} ${activeJob.pickupAddress}`} />
            <Row icon={MapPin} text={`${t("driver.dropoff")} ${activeJob.dropoffAddress}`} />
            <Row icon={Truck} text={`${t("driver.moveSize")} ${activeJob.moveSize}`} />
            {step && (
              <Button onClick={() => onUpdateStatus(step.next)} className="w-full rounded-xl h-11 gap-2">
                {t(step.label)} <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

