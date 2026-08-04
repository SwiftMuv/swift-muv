import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import StripeCheckoutModal from "@/components/booking/StripeCheckoutModal";
import { useI18n } from "@/contexts/I18nContext";

interface Props {
  open: boolean;
  jobId: string | null;
  driverId: string | null;
  onClose: () => void;
}

const QUICK_TIPS = [5, 10, 20];

export const RatingModal = ({ open, jobId, driverId, onClose }: Props) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"rate" | "tip">("rate");
  const [tip, setTip] = useState<number | "">("");
  const [tipLoading, setTipLoading] = useState(false);
  const [checkout, setCheckout] = useState<{ clientSecret: string; publishableKey: string } | null>(null);

  useEffect(() => {
    if (open) {
      setStars(5);
      setComment("");
      setStep("rate");
      setTip("");
      setCheckout(null);
    }
  }, [open]);

  const submitRating = async () => {
    if (!user || !jobId || !driverId) return;
    setSubmitting(true);
    const { error } = await supabase.from("ratings").insert({
      job_id: jobId, rater_id: user.id, ratee_id: driverId, stars, comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(t("cust.rating.thanks"));
    setStep("tip");
  };

  const submitTip = async () => {
    if (!jobId) return;
    const amount = typeof tip === "number" ? tip : Number(tip);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("cust.rating.chooseTip"));
      return;
    }
    setTipLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke("tip-driver", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: { jobId, amount },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const { clientSecret, publishableKey } = data as { clientSecret: string; publishableKey: string };
      if (!clientSecret || !publishableKey) throw new Error("Stripe is not configured");
      setCheckout({ clientSecret, publishableKey });
    } catch (e: any) {
      toast.error(e?.message ?? t("cust.rating.tipFailed"));
    } finally {
      setTipLoading(false);
    }
  };

  const closeAll = () => {
    setCheckout(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open && !checkout} onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{step === "rate" ? t("cust.rating.title") : t("cust.rating.tipTitle")}</DialogTitle>
          </DialogHeader>

          {step === "rate" && (
            <>
              <div className="flex justify-center gap-2 py-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setStars(n)}>
                    <Star className={`h-8 w-8 ${n <= stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("cust.rating.notePlaceholder")}
                maxLength={500}
              />
              <DialogFooter>
                <Button onClick={submitRating} disabled={submitting} className="w-full">
                  {submitting ? t("cust.rating.submitting") : t("cust.rating.submitRating")}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "tip" && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground text-center">
                {t("cust.rating.allTipGoes")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_TIPS.map((amt) => (
                  <Button
                    key={amt}
                    variant={tip === amt ? "default" : "outline"}
                    onClick={() => setTip(amt)}
                    className="h-12 text-base font-bold"
                  >
                    ${amt}
                  </Button>
                ))}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t("cust.rating.customAmount")}</label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  step="0.01"
                  placeholder="0.00"
                  value={typeof tip === "number" && !QUICK_TIPS.includes(tip) ? tip : tip === "" ? "" : QUICK_TIPS.includes(tip as number) ? "" : tip}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTip(v === "" ? "" : Number(v));
                  }}
                />
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
                  {t("cust.rating.skip")}
                </Button>
                <Button onClick={submitTip} disabled={tipLoading || !tip} className="w-full">
                  {tipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (tip ? t("cust.rating.submitTipAmount", { amount: tip }) : t("cust.rating.submitTip"))}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StripeCheckoutModal
        open={!!checkout}
        clientSecret={checkout?.clientSecret ?? null}
        publishableKey={checkout?.publishableKey ?? null}
        onClose={closeAll}
      />
    </>
  );
};

export default RatingModal;
