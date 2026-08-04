import { Globe, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, LANGUAGES, useI18n } from "@/contexts/I18nContext";

interface Props {
  className?: string;
}

/** Global language + currency preferences. Lives on the Account page only. */
export const LangCurrencySettings = ({ className }: Props) => {
  const { lang, currency, setLang, setCurrency } = useI18n();

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-4 border-b">
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Language</p>
          </div>
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger className="w-[150px] h-9 text-sm" aria-label="Language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[50vh] z-[60]">
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code} className="text-sm">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 p-4">
          <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Currency</p>
          </div>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-[150px] h-9 text-sm" aria-label="Currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[50vh] z-[60]">
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code} className="text-sm">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default LangCurrencySettings;
