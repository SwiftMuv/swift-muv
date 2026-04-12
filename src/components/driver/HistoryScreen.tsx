import { MapPin, Star, Calendar, DollarSign, ChevronDown } from "lucide-react";
import { useState } from "react";

interface CompletedJob {
  id: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  moveSize: "Small" | "Medium" | "Large";
  distance: string;
  date: string;
  duration: string;
  earnings: number;
  tip: number;
  rating: number;
}

const mockHistory: CompletedJob[] = [
  {
    id: "SG-4818",
    customerName: "Sophie Laurent",
    pickupAddress: "200 Rue Sherbrooke O, Montreal",
    dropoffAddress: "55 Avenue du Mont-Royal, Montreal",
    moveSize: "Large",
    distance: "6.8 km",
    date: "Today, 10:15 AM",
    duration: "48 min",
    earnings: 320,
    tip: 40,
    rating: 5,
  },
  {
    id: "SG-4815",
    customerName: "David Park",
    pickupAddress: "101 Spadina Ave, Toronto",
    dropoffAddress: "30 Bay St, Toronto",
    moveSize: "Medium",
    distance: "4.2 km",
    date: "Today, 7:30 AM",
    duration: "32 min",
    earnings: 185,
    tip: 20,
    rating: 5,
  },
  {
    id: "SG-4810",
    customerName: "Emma Wilson",
    pickupAddress: "75 Queen St W, Toronto",
    dropoffAddress: "400 University Ave, Toronto",
    moveSize: "Small",
    distance: "2.1 km",
    date: "Yesterday, 3:45 PM",
    duration: "18 min",
    earnings: 75,
    tip: 10,
    rating: 4,
  },
  {
    id: "SG-4806",
    customerName: "Lucas Martin",
    pickupAddress: "310 Rue Saint-Jacques, Montreal",
    dropoffAddress: "88 Rue de la Commune, Montreal",
    moveSize: "Large",
    distance: "9.5 km",
    date: "Yesterday, 11:00 AM",
    duration: "52 min",
    earnings: 290,
    tip: 35,
    rating: 5,
  },
  {
    id: "SG-4801",
    customerName: "Priya Sharma",
    pickupAddress: "22 College St, Toronto",
    dropoffAddress: "150 Dundas St W, Toronto",
    moveSize: "Medium",
    distance: "3.8 km",
    date: "Apr 10, 2:20 PM",
    duration: "28 min",
    earnings: 160,
    tip: 15,
    rating: 4,
  },
];

const moveSizeBadge: Record<string, string> = {
  Small: "bg-[hsl(var(--swift-info))]/15 text-[hsl(var(--swift-info))]",
  Medium: "bg-[hsl(var(--swift-warning))]/15 text-[hsl(var(--swift-warning))]",
  Large: "bg-[hsl(var(--swift-danger))]/15 text-[hsl(var(--swift-danger))]",
};

const HistoryCard = ({ job }: { job: CompletedJob }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl bg-card border p-4 space-y-3 transition-all">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{job.id}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${moveSizeBadge[job.moveSize]}`}>
            {job.moveSize}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: job.rating }).map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-[hsl(var(--swift-warning))] text-[hsl(var(--swift-warning))]" />
          ))}
        </div>
      </div>

      {/* Customer & date */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{job.customerName}</p>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {job.date}
        </span>
      </div>

      {/* Earnings */}
      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">${job.earnings}</span>
          {job.tip > 0 && (
            <span className="text-[10px] text-[hsl(var(--swift-success))] font-medium">+${job.tip} tip</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{job.duration} · {job.distance}</span>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
      >
        Route details
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Route details */}
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

const HistoryScreen = () => {
  const totalEarnings = mockHistory.reduce((sum, j) => sum + j.earnings + j.tip, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-2xl bg-card border p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Total Earned</p>
          <p className="text-2xl font-bold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            ${totalEarnings}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold">{mockHistory.length}</p>
        </div>
      </div>

      {/* Job list */}
      <div className="space-y-3">
        {mockHistory.map((job) => (
          <HistoryCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
};

export default HistoryScreen;
