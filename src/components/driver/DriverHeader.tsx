import { Globe, DollarSign, LogOut } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import logo from "@/assets/swiftmuv-logo.png";

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
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b px-3 sm:px-4 py-2 h-14 flex items-center">
      <div className="flex items-center justify-between gap-2 w-full">
        {/* Left: Logo */}
        <div className="flex items-center min-w-0 shrink-0">
          <img
            src={logo}
            alt="SwiftMuv"
            className="h-8 sm:h-9 w-auto object-contain"
          />
        </div>

        {/* Right: Notifications + Profile dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <NotificationBell />

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
        </div>
      </div>
    </header>
  );
};
