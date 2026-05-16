import { Bell, Globe, DollarSign, MoreVertical, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface DriverHeaderProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  rating: number;
  driverName?: string | null;
  avatarUrl?: string | null;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "hi", label: "हिन्दी" },
  { code: "ru", label: "Русский" },
  { code: "tr", label: "Türkçe" },
];

const CURRENCIES = [
  { code: "CAD", label: "CAD $" },
  { code: "USD", label: "USD $" },
  { code: "EUR", label: "EUR €" },
  { code: "GBP", label: "GBP £" },
  { code: "AUD", label: "AUD $" },
  { code: "NZD", label: "NZD $" },
  { code: "CHF", label: "CHF" },
  { code: "JPY", label: "JPY ¥" },
  { code: "CNY", label: "CNY ¥" },
  { code: "INR", label: "INR ₹" },
  { code: "BRL", label: "BRL R$" },
  { code: "MXN", label: "MXN $" },
  { code: "ZAR", label: "ZAR R" },
  { code: "AED", label: "AED د.إ" },
  { code: "NGN", label: "NGN ₦" },
];

export const DriverHeader = ({ isOnline, driverName, avatarUrl }: DriverHeaderProps) => {
  const [lang, setLang] = useState("en");
  const [currency, setCurrency] = useState("CAD");
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
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Far-left: kebab menu + profile pic */}
        <div className="flex items-center gap-1.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="h-8 w-6 flex items-center justify-center rounded hover:bg-secondary/60 transition-colors"
              aria-label="Profile menu"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" strokeWidth={2.5} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-sm">
                  <Globe className="w-4 h-4 mr-2" /> Language
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="max-h-[60vh] overflow-y-auto">
                    <DropdownMenuRadioGroup value={lang} onValueChange={setLang}>
                      {LANGUAGES.map((l) => (
                        <DropdownMenuRadioItem key={l.code} value={l.code} className="text-sm">
                          {l.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-sm">
                  <DollarSign className="w-4 h-4 mr-2" /> Currency
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="max-h-[60vh] overflow-y-auto">
                    <DropdownMenuRadioGroup value={currency} onValueChange={setCurrency}>
                      {CURRENCIES.map((c) => (
                        <DropdownMenuRadioItem key={c.code} value={c.code} className="text-sm">
                          {c.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
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

          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center ring-2 ring-primary/30">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-foreground">{initials || "DR"}</span>
              )}
            </div>
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card bg-[hsl(var(--swift-success))] animate-pulse" />
            )}
          </div>
        </div>

        {/* Center: Driver name + online status */}
        <div className="min-w-0 flex-1 text-center">
          <h1
            className="text-lg font-bold tracking-tight truncate text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {displayName}
          </h1>
          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            {isOnline ? (
              <>
                <span className="relative inline-flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--swift-success))] opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--swift-success))]" />
                </span>
                <span className="text-[hsl(var(--swift-success))] font-semibold">Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span>Offline</span>
              </>
            )}
          </p>
        </div>

        {/* Far-right: Notifications */}
        <button
          className="relative w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[hsl(var(--swift-danger))]" />
        </button>
      </div>
    </header>
  );
};
