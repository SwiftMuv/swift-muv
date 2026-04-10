import { Bell, User } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface DriverHeaderProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  rating: number;
}

export const DriverHeader = ({ isOnline, onToggleOnline, rating }: DriverHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                isOnline ? "bg-[hsl(var(--swift-success))]" : "bg-muted-foreground"
              }`}
            />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              SwiftGo
            </h1>
            <p className="text-xs text-muted-foreground">
              ⭐ {rating} · Pro Driver
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <Bell className="w-4 h-4 text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[hsl(var(--swift-danger))]" />
          </button>

          <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
            <span className={`text-xs font-semibold ${isOnline ? "text-[hsl(var(--swift-success))]" : "text-muted-foreground"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
            <Switch checked={isOnline} onCheckedChange={onToggleOnline} className="scale-75" />
          </div>
        </div>
      </div>
    </header>
  );
};
