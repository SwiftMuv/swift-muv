import { CheckCircle2, Truck, MapPin, Package, Clock } from "lucide-react";
import type { DriverStatus } from "@/hooks/useDriverStatusUpdates";

interface StatusUpdate {
  status: DriverStatus;
  label: string;
  description: string;
  timestamp: Date;
}

const STATUS_ICONS: Record<DriverStatus, React.ReactNode> = {
  assigned: <CheckCircle2 className="h-4 w-4" />,
  en_route: <Truck className="h-4 w-4" />,
  arrived: <MapPin className="h-4 w-4" />,
  completed: <Package className="h-4 w-4" />,
};

const ALL_STATUSES: { status: DriverStatus; label: string }[] = [
  { status: "assigned", label: "Driver Assigned" },
  { status: "en_route", label: "En Route" },
  { status: "arrived", label: "Arrived at Pickup" },
  { status: "completed", label: "Move Completed" },
];

export const StatusTimeline = ({
  statusHistory,
  currentStatus,
}: {
  statusHistory: StatusUpdate[];
  currentStatus: DriverStatus;
}) => {
  const currentIdx = ALL_STATUSES.findIndex((s) => s.status === currentStatus);

  return (
    <div className="space-y-0">
      {ALL_STATUSES.map((step, i) => {
        const historyEntry = statusHistory.find((h) => h.status === step.status);
        const isCompleted = i <= currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <div key={step.status} className="flex gap-3">
            {/* Vertical line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${
                  isCompleted
                    ? isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-primary/80 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {STATUS_ICONS[step.status]}
              </div>
              {i < ALL_STATUSES.length - 1 && (
                <div
                  className={`w-0.5 flex-1 min-h-[24px] ${
                    i < currentIdx ? "bg-primary/60" : "bg-border"
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 ${!isCompleted ? "opacity-40" : ""}`}>
              <p className={`text-sm font-semibold ${isCurrent ? "text-primary" : "text-foreground"}`}>
                {step.label}
              </p>
              {historyEntry && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {historyEntry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
