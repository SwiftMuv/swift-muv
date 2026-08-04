import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

interface Props {
  role: "customer" | "driver";
}

const TermsAgreementModal = ({ role }: Props) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const table = role === "driver" ? "driver_profiles" : "customer_profiles";

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from(table)
        .select("terms_accepted_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (active && data && !data.terms_accepted_at) setOpen(true);
    })();
    return () => { active = false; };
  }, [user, table]);

  const accept = async () => {
    if (!user || !agreed) return;
    setSaving(true);
    const { error } = await supabase
      .from(table)
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error(t("bk.terms.saveFailed"));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* blocking */ }}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("bk.terms.title")}</DialogTitle>
          <DialogDescription>
            {t("bk.terms.description")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-56 rounded-md border p-3 text-sm leading-relaxed text-muted-foreground">
          {role === "driver" ? (
            <div className="space-y-2">
              <p>{t("bk.terms.driver.p1")}</p>
              <p>{t("bk.terms.driver.p2")}</p>
              <p>{t("bk.terms.driver.p3")}</p>
              <p>{t("bk.terms.driver.p4")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p>{t("bk.terms.customer.p1")}</p>
              <p>{t("bk.terms.customer.p2")}</p>
              <p>{t("bk.terms.customer.p3")}</p>
              <p>{t("bk.terms.customer.p4")}</p>
            </div>
          )}
        </ScrollArea>
        <p className="text-xs">
          {t("bk.terms.readFull")}{" "}
          <Link to="/terms" target="_blank" className="text-cyan-500 underline">
            {t("bk.terms.linkText")}
          </Link>.
        </p>
        <div className="flex items-start gap-2">
          <Checkbox id="agree-terms" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
          <label htmlFor="agree-terms" className="text-sm leading-tight cursor-pointer">
            {t("bk.terms.agreeLabel")}
          </label>
        </div>
        <DialogFooter>
          <Button disabled={!agreed || saving} onClick={accept} className="w-full">
            {saving ? t("bk.terms.saving") : t("bk.terms.agreeContinue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAgreementModal;
