import { Home, Wallet, Clock, User } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", labelKey: "nav.home", icon: Home },
  { id: "wallet", labelKey: "nav.wallet", icon: Wallet },
  { id: "history", labelKey: "nav.activity", icon: Clock },
  { id: "profile", labelKey: "nav.account", icon: User },
];

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
