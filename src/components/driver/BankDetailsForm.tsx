import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  onSaved?: () => void;
  onCancel?: () => void;
}

export const BankDetailsForm = ({ onSaved, onCancel }: Props) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    account_holder_name: "",
    bank_name: "",
    transit_number: "",
    institution_number: "",
    account_number: "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    if (!form.account_holder_name || !form.bank_name || !/^\d{5}$/.test(form.transit_number)
      || !/^\d{3}$/.test(form.institution_number) || !/^\d{4,17}$/.test(form.account_number)) {
      return toast.error("Please fill all fields correctly (5-digit transit, 3-digit institution, account 4-17 digits)");
    }
    setSaving(true);
    const { error } = await supabase.from("driver_bank_details").upsert({
      driver_id: user.id,
      account_holder_name: form.account_holder_name,
      bank_name: form.bank_name,
      transit_number: form.transit_number,
      institution_number: form.institution_number,
      account_last4: form.account_number.slice(-4),
    }, { onConflict: "driver_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Bank account linked");
    onSaved?.();
  };

  return (
    <div className="rounded-xl bg-card border p-4 space-y-3">
      <p className="text-sm font-semibold">Link your bank account</p>
      <div className="space-y-2">
        <Label className="text-xs">Account holder name</Label>
        <Input value={form.account_holder_name} onChange={(e) => setForm({ ...form, account_holder_name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Bank name</Label>
        <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Transit (5 digits)</Label>
          <Input inputMode="numeric" maxLength={5} value={form.transit_number} onChange={(e) => setForm({ ...form, transit_number: e.target.value.replace(/\D/g, "") })} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Institution (3 digits)</Label>
          <Input inputMode="numeric" maxLength={3} value={form.institution_number} onChange={(e) => setForm({ ...form, institution_number: e.target.value.replace(/\D/g, "") })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Account number</Label>
        <Input inputMode="numeric" maxLength={17} value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, "") })} />
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving} className="flex-1 rounded-xl h-11 font-semibold">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save
        </Button>
        {onCancel && (
          <Button variant="outline" className="rounded-xl h-11" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </div>
  );
};

export default BankDetailsForm;
