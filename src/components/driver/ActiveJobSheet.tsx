import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, MessageSquare, Navigation, CheckCircle2, Truck } from "lucide-react";
import type { Job, JobStatus } from "@/pages/DriverDashboard";
import { useI18n } from "@/contexts/I18nContext";

interface ActiveJobSheetProps {
  job: Job | null;
  onUpdateStatus: (status: JobStatus) => void;
}

const statusFlow: { status: JobStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: "arrived", label: "driver.arrivedPickup", icon: <MapPin className="w-4 h-4" />, color: "bg-[hsl(var(--swift-info))]" },
  { status: "in_transit", label: "driver.startTrip", icon: <Truck className="w-4 h-4" />, color: "bg-primary" },
  { status: "completed", label: "driver.completeTrip", icon: <CheckCircle2 className="w-4 h-4" />, color: "bg-[hsl(var(--swift-success))]" },
];

export const ActiveJobSheet = ({ job, onUpdateStatus }: ActiveJobSheetProps) => {
  const { t, formatCurrency } = useI18n();
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);

  if (!job) return null;

  const currentStepIdx = statusFlow.findIndex((s) => s.status === job.status);
  const nextStep = statusFlow.find((_, i) => i > currentStepIdx) ?? statusFlow[statusFlow.length - 1];
  const isCompleteStep = nextStep.status === "completed";

  const handleNext = () => {
    if (isCompleteStep) {
      if (codeInput !== job.completionCode) {
        setCodeError(true);
        return;
      }
      setCodeError(false);
    }
    onUpdateStatus(nextStep.status);
    setCodeInput("");
  };

  if (job.status === "completed") {
    return (
      <Sheet open>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8">
          <SheetHeader className="text-center pt-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <SheetTitle className="text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t("driver.jobCompleted")}</SheetTitle>
            <p className="text-sm text-muted-foreground">{t("driver.earningsWallet")}</p>
            <p className="text-2xl font-bold text-primary mt-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(job.price)}</p>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto pb-8">
        <SheetHeader className="pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t("driver.activeJob")} · {job.id}
            </SheetTitle>
            <span className="text-lg font-bold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {formatCurrency(job.price)}
            </span>
          </div>
        </SheetHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {statusFlow.map((step, i) => (
            <div
              key={step.status}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i <= currentStepIdx ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Customer + Route */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{job.customerName}</p>
            <div className="flex gap-2">
              <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-4 h-4 text-primary" />
              </button>
              <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </button>
              <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Navigation className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-secondary p-3 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
              <p>{job.pickupAddress}</p>
            </div>
            <div className="ml-[3px] w-[2px] h-2 bg-border" />
            <div className="flex items-start gap-2">
              <div className="mt-1.5 w-2 h-2 rounded-full bg-[hsl(var(--swift-danger))] shrink-0" />
              <p>{job.dropoffAddress}</p>
            </div>
          </div>
        </div>

        {/* Completion Code */}
        {isCompleteStep && (
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              {t("driver.enterCode")}
            </label>
            <Input
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value);
                setCodeError(false);
              }}
              placeholder="_ _ _ _"
              maxLength={4}
              className={`text-center text-2xl tracking-[0.5em] font-mono h-14 rounded-xl ${
                codeError ? "border-destructive" : ""
              }`}
            />
            {codeError && <p className="text-xs text-destructive mt-1">{t("driver.invalidCode")}</p>}
          </div>
        )}

        {/* Next Action */}
        <Button
          onClick={handleNext}
          className={`w-full rounded-xl h-12 font-semibold gap-2 text-white ${nextStep.color} hover:opacity-90`}
        >
          {nextStep.icon}
          {t(nextStep.label)}
        </Button>
      </SheetContent>
    </Sheet>
  );
};
