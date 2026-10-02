import { useEffect, useState } from "react";
import { Copy, Gift, Share2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const REWARD_AMOUNT = 10;

const ReferralCard = () => {
  const { user } = useAuth();
  const { t, formatCurrency } = useI18n();
  const [code, setCode] = useState<string | null>(null);
  const [credit, setCredit] = useState(0);
  const [joined, setJoined] = useState(0);
  const [rewarded, setRewarded] = useState(0);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("referral_code, credit_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        setCode(profile.referral_code);
        setCredit(Number(profile.credit_balance ?? 0));
      }
      const { data: refs } = await supabase
        .from("referrals")
        .select("status")
        .eq("referrer_id", user.id);
      if (refs) {
        setJoined(refs.length);
        setRewarded(refs.filter((r) => r.status === "completed").length);
      }
    })();
  }, [user]);

  if (!code) return null;

  const shareText = t("referral.subtitle", { amount: REWARD_AMOUNT }) + ` — ${code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t("referral.copied"));
    } catch {
      toast.error(code);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "SwiftMuv", text: shareText });
        return;
      } catch { /* user cancelled */ }
    }
    handleCopy();
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <p className="font-semibold text-foreground">{t("referral.title")}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("referral.subtitle", { amount: formatCurrency(REWARD_AMOUNT) })}
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg border border-dashed border-primary/50 bg-card px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("referral.yourCode")}</p>
            <p className="text-lg font-bold tracking-widest text-foreground">{code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-1.5" />
            {t("referral.copy")}
          </Button>
          <Button size="sm" className="flex-1" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1.5" />
            {t("referral.share")}
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">{t("referral.creditBalance")}</span>
          <span className="font-semibold text-primary">{formatCurrency(credit)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>{joined} {t("referral.friendsJoined")} · {rewarded} {t("referral.rewarded")}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
