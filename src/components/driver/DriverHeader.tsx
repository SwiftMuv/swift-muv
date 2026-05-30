import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/swiftmuv-logo.png";
import { LangCurrencyMenu } from "@/components/LangCurrencyMenu";

interface DriverHeaderProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  rating: number;
  driverName?: string | null;
  avatarUrl?: string | null;
}

export const DriverHeader = ({ isOnline, driverName, avatarUrl }: DriverHeaderProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = driverName?.trim() || "Driver";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/driver/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b px-3 sm:px-4 py-2 flex items-center">
      <div className="relative flex items-center justify-between gap-2 w-full">
        {/* Left: Circular logo */}
        <div className="flex items-center min-w-0 shrink-0">
          <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-primary/30 bg-card shrink-0">
            <img src={logo} alt="SwiftMuv" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Center: Lang/Currency above name */}
        <div className="absolute left-1/2 -translate-x-1/2 max-w-[60%] flex flex-col items-center gap-1">
          <LangCurrencyMenu />
          <p className="truncate text-center text-lg sm:text-xl font-bold text-foreground max-w-full">
            {displayName}
          </p>
        </div>

        {/* Right: Profile dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Profile menu"
            >
              <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center ring-2 ring-primary/30">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-foreground">{initials || "DR"}</span>
                )}
              </div>
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card bg-[hsl(var(--swift-success))] animate-pulse" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {isOnline ? "Online" : "Offline"}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-sm text-[hsl(var(--swift-danger))] focus:text-[hsl(var(--swift-danger))]"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
