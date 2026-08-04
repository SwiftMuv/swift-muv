import { Home, Calendar, Activity, User } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", labelKey: "nav.home", icon: Home },
  { id: "bookings", labelKey: "nav.bookings", icon: Calendar },
  { id: "activities", labelKey: "nav.activities", icon: Activity },
  { id: "account", labelKey: "nav.account", icon: User },
];

export const CustomerBottomNav = ({ activeTab, onTabChange }: Props) => {
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t safe-bottom">
      <div className="flex items-center justify-around px-2 pt-1 pb-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0 py-0.5 px-2 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`w-[18px] h-[18px] ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[9px] font-medium leading-tight">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
