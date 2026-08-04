import { useState } from "react";
import { CreditCard, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";

const DriverStripeConnect = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!user) {
      toast({ title: t("drv.stripe.notSignedInTitle"), description: t("drv.stripe.notSignedInDesc"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { driverId: user.id, email: user.email },
      });

      if (error) throw error;

      const url: string | undefined = data?.url;
      const stripeConnectId: string | undefined = data?.stripe_connect_id ?? data?.accountId;

      if (!url) throw new Error(t("drv.stripe.noUrl"));

      if (stripeConnectId) {
        const { error: updateError } = await supabase
          .from("driver_profiles")
          .update({ stripe_connect_id: stripeConnectId })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Failed to save stripe_connect_id", updateError);
        }
      }

      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : t("drv.stripe.failedDefault");
      toast({ title: t("drv.stripe.failedTitle"), description: message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border/60 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CreditCard className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">{t("drv.stripe.setupPayouts")}</CardTitle>
        <CardDescription>
          {t("drv.stripe.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>{t("drv.stripe.secureNote")}</p>
        </div>
        <Button onClick={handleConnect} disabled={loading} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("drv.stripe.redirecting")}
            </>
          ) : (
            <>
              {t("drv.stripe.connect")}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DriverStripeConnect;
