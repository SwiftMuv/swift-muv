import { Globe, DollarSign } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCIES, LANGUAGES, useI18n } from "@/contexts/I18nContext";

interface Props {
  className?: string;
}

export const LangCurrencyMenu = ({ className }: Props) => {
  const { lang, currency, setLang, setCurrency } = useI18n();

  const currentLang = lang.toUpperCase();

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-1 rounded-full bg-secondary/70 hover:bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Language"
        >
          <Globe className="w-3.5 h-3.5" />
          {currentLang}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-[60vh] overflow-y-auto z-[60]">
          <DropdownMenuRadioGroup value={lang} onValueChange={setLang}>
            {LANGUAGES.map((l) => (
              <DropdownMenuRadioItem key={l.code} value={l.code} className="text-sm">
                {l.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-1 rounded-full bg-secondary/70 hover:bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Currency"
        >
          <DollarSign className="w-3.5 h-3.5" />
          {currency}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-[60vh] overflow-y-auto z-[60]">
          <DropdownMenuRadioGroup value={currency} onValueChange={setCurrency}>
            {CURRENCIES.map((c) => (
              <DropdownMenuRadioItem key={c.code} value={c.code} className="text-sm">
                {c.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
