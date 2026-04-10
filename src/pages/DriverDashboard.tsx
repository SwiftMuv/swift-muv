import { useState } from "react";
import { DriverHeader } from "@/components/driver/DriverHeader";
import { DriverStats } from "@/components/driver/DriverStats";
import { JobCard } from "@/components/driver/JobCard";
import { BottomNav } from "@/components/driver/BottomNav";
import { ActiveJobSheet } from "@/components/driver/ActiveJobSheet";
import WalletScreen from "@/components/driver/WalletScreen";
import ProfileScreen from "@/components/driver/ProfileScreen";

export type JobStatus = "available" | "accepted" | "arrived" | "loading" | "transit" | "completed";

export interface Job {
  id: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  moveSize: "Small" | "Medium" | "Large";
  distance: string;
  estimatedTime: string;
  price: number;
  status: JobStatus;
  completionCode?: string;
}

const mockJobs: Job[] = [
  {
    id: "SG-4821",
    customerName: "Marie Dupont",
    pickupAddress: "45 Rue Saint-Denis, Montreal",
    dropoffAddress: "120 Avenue du Parc, Montreal",
    moveSize: "Medium",
    distance: "8.2 km",
    estimatedTime: "35 min",
    price: 185,
    status: "available",
  },
  {
    id: "SG-4822",
    customerName: "James Chen",
    pickupAddress: "88 King St W, Toronto",
    dropoffAddress: "250 University Ave, Toronto",
    moveSize: "Small",
    distance: "3.1 km",
    estimatedTime: "15 min",
    price: 75,
    status: "available",
  },
  {
    id: "SG-4823",
    customerName: "Aisha Khan",
    pickupAddress: "15 Bloor St E, Toronto",
    dropoffAddress: "400 Lake Shore Blvd, Toronto",
    moveSize: "Large",
    distance: "12.5 km",
    estimatedTime: "55 min",
    price: 320,
    status: "available",
  },
];

const DriverDashboard = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const handleAcceptJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: "accepted" as JobStatus, completionCode: "4729" } : j))
    );
    const job = jobs.find((j) => j.id === jobId);
    if (job) setActiveJob({ ...job, status: "accepted", completionCode: "4729" });
  };

  const handleUpdateJobStatus = (nextStatus: JobStatus) => {
    if (!activeJob) return;
    const updated = { ...activeJob, status: nextStatus };
    setActiveJob(updated);
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    if (nextStatus === "completed") {
      setTimeout(() => setActiveJob(null), 2000);
    }
  };

  const todayEarnings = 485;
  const weekEarnings = 2340;
  const completedJobs = 12;
  const rating = 4.9;

  return (
    <div className="min-h-screen bg-background flex flex-col dark">
      <DriverHeader isOnline={isOnline} onToggleOnline={() => setIsOnline(!isOnline)} rating={rating} />

      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-2 space-y-5">
        {activeTab === "home" && (
          <>
            <DriverStats
              todayEarnings={todayEarnings}
              weekEarnings={weekEarnings}
              completedJobs={completedJobs}
              rating={rating}
            />

            {!isOnline && (
              <div className="rounded-xl bg-muted p-4 text-center">
                <p className="text-muted-foreground text-sm font-medium">You're currently offline</p>
                <p className="text-muted-foreground text-xs mt-1">Go online to receive job requests</p>
              </div>
            )}

            {isOnline && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Available Jobs</h2>
                <div className="space-y-3">
                  {jobs
                    .filter((j) => j.status === "available")
                    .map((job) => (
                      <JobCard key={job.id} job={job} onAccept={handleAcceptJob} />
                    ))}
                  {jobs.filter((j) => j.status === "available").length === 0 && (
                    <div className="rounded-xl bg-card border p-6 text-center">
                      <p className="text-muted-foreground text-sm">No jobs available nearby</p>
                      <p className="text-muted-foreground text-xs mt-1">New requests will appear here</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === "wallet" && <WalletScreen />}
        {activeTab === "profile" && <ProfileScreen />}
      </main>

      <ActiveJobSheet job={activeJob} onUpdateStatus={handleUpdateJobStatus} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default DriverDashboard;
