import { useState, useEffect, useCallback } from "react";

export type DriverStatus = "assigned" | "en_route" | "arrived" | "completed";

interface StatusUpdate {
  status: DriverStatus;
  label: string;
  description: string;
  timestamp: Date;
}

const STATUS_CONFIG: Record<DriverStatus, { label: string; description: string; delayMs: number }> = {
  assigned: { label: "Driver Assigned", description: "Marcus Rivera accepted your request", delayMs: 0 },
  en_route: { label: "Driver En Route", description: "Your driver is on the way to pickup", delayMs: 8000 },
  arrived: { label: "Driver Arrived", description: "Your driver has arrived at the pickup location", delayMs: 25000 },
  completed: { label: "Move Completed", description: "Your items have been delivered successfully", delayMs: 50000 },
};

const STATUS_ORDER: DriverStatus[] = ["assigned", "en_route", "arrived", "completed"];

export function useDriverStatusUpdates() {
  const [currentStatus, setCurrentStatus] = useState<DriverStatus>("assigned");
  const [statusHistory, setStatusHistory] = useState<StatusUpdate[]>([
    {
      status: "assigned",
      label: STATUS_CONFIG.assigned.label,
      description: STATUS_CONFIG.assigned.description,
      timestamp: new Date(),
    },
  ]);
  const [latestUpdate, setLatestUpdate] = useState<StatusUpdate | null>(null);

  const advanceStatus = useCallback((status: DriverStatus) => {
    const config = STATUS_CONFIG[status];
    const update: StatusUpdate = {
      status,
      label: config.label,
      description: config.description,
      timestamp: new Date(),
    };
    setCurrentStatus(status);
    setStatusHistory((prev) => [...prev, update]);
    setLatestUpdate(update);
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STATUS_ORDER.slice(1).forEach((status) => {
      const timer = setTimeout(() => advanceStatus(status), STATUS_CONFIG[status].delayMs);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [advanceStatus]);

  return { currentStatus, statusHistory, latestUpdate };
}
