import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  role: "customer" | "driver";
}

const TermsAgreementModal = ({ role }: Props) => {
  const { user } = useAuth();
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
    if (error) return toast.error("Could not save. Please try again.");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* blocking */ }}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Terms &amp; Conditions</DialogTitle>
          <DialogDescription>
            Please review and accept to continue using SwiftMuv.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-56 rounded-md border p-3 text-sm leading-relaxed text-muted-foreground">
          {role === "driver" ? (
            <div className="space-y-2">
              <p>You are an independent contractor using SwiftMuv's platform to obtain bookings. SwiftMuv is not your employer.</p>
              <p>You must maintain a valid driver's licence, vehicle insurance, and clean background check at all times.</p>
              <p>You agree to uphold high standards of punctuality, safety, and professionalism. SwiftMuv collects a marketplace commission before net earnings are released to your wallet.</p>
              <p>Off-platform deals, cash side-payments, or attempts to circumvent the marketplace are prohibited.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p>SwiftMuv is a marketplace connecting you with independent logistics providers. SwiftMuv does not itself transport goods.</p>
              <p>You agree to pay the transparent upfront price calculated at booking and to declare all items accurately.</p>
              <p>Hazardous, illegal, or otherwise prohibited materials are strictly banned and may result in cancellation and suspension.</p>
              <p>All payments must be processed through the platform. Off-platform deals are prohibited.</p>
            </div>
          )}
        </ScrollArea>
        <p className="text-xs">
          Read the full{" "}
          <Link to="/terms" target="_blank" className="text-cyan-500 underline">
            Terms &amp; Conditions
          </Link>.
        </p>
        <div className="flex items-start gap-2">
          <Checkbox id="agree-terms" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
          <label htmlFor="agree-terms" className="text-sm leading-tight cursor-pointer">
            I have read and agree to the Terms &amp; Conditions.
          </label>
        </div>
        <DialogFooter>
          <Button disabled={!agreed || saving} onClick={accept} className="w-full">
            {saving ? "Saving…" : "Agree & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAgreementModal;
