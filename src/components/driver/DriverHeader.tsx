import { Bell, Globe, ChevronDown, DollarSign } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import logo from "@/assets/swiftmuv-logo.png";

interface DriverHeaderProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  rating: number;
  driverName?: string | null;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
];

const CURRENCIES = [
  { code: "CAD", label: "CAD $" },
  { code: "USD", label: "USD $" },
  { code: "EUR", label: "EUR €" },
  { code: "GBP", label: "GBP £" },
];

export const DriverHeader = ({ isOnline, onToggleOnline, rating, driverName }: DriverHeaderProps) => {
  const [lang, setLang] = useState("en");
  const [currency, setCurrency] = useState("CAD");

  const displayName = driverName?.trim() || "Driver";

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Powerclipped SwiftMuv logo — clipped into a rounded badge */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-xl bg-primary/10 overflow-hidden flex items-center justify-center ring-1 ring-primary/20">
              <img
                src={logo}
                alt="SwiftMuv"
                width={44}
                height={44}
                loading="lazy"
                className="w-full h-full object-cover scale-150"
              />
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                isOnline ? "bg-[hsl(var(--swift-success))]" : "bg-muted-foreground"
              }`}
            />
          </div>
          <div className="min-w-0">
            <h1
              className="text-lg font-bold tracking-tight truncate"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {displayName}
            </h1>
            <p className="text-xs text-muted-foreground">⭐ {rating} · Verified Driver</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 bg-secondary rounded-full px-2.5 py-1.5 text-xs font-semibold hover:bg-secondary/80 transition-colors">
              <Globe className="w-3.5 h-3.5" />
              <span className="uppercase">{lang}</span>
              <span className="text-muted-foreground">·</span>
              <span>{currency}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                <Globe className="w-3.5 h-3.5" /> Language
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={lang} onValueChange={setLang}>
                {LANGUAGES.map((l) => (
                  <DropdownMenuRadioItem key={l.code} value={l.code} className="text-sm">
                    {l.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                <DollarSign className="w-3.5 h-3.5" /> Currency
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={currency} onValueChange={setCurrency}>
                {CURRENCIES.map((c) => (
                  <DropdownMenuRadioItem key={c.code} value={c.code} className="text-sm">
                    {c.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            className="relative w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[hsl(var(--swift-danger))]" />
          </button>

          <div className="flex items-center gap-1.5 bg-secondary rounded-full pl-2 pr-1 py-1">
            <span
              className={`text-[11px] font-semibold ${
                isOnline ? "text-[hsl(var(--swift-success))]" : "text-muted-foreground"
              }`}
            >
              {isOnline ? "On" : "Off"}
            </span>
            <Switch checked={isOnline} onCheckedChange={onToggleOnline} className="scale-75" />
          </div>
        </div>
      </div>
    </header>
  );
};
