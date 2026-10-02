import { useCallback, useEffect, useState } from "react";
import { Tag, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type PromoCode = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
};

const AdminPromoCodes = () => {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_codes")
      .select("id, code, discount_type, discount_value, max_uses, uses_count, expires_at, is_active")
      .order("created_at", { ascending: false });
    if (!error && data) setCodes(data as PromoCode[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const trimmed = code.trim().toUpperCase();
    const numValue = Number(value);
    if (!trimmed || !numValue || numValue <= 0) {
      toast.error("Enter a code and a valid discount value");
      return;
    }
    if (type === "percent" && numValue > 100) {
      toast.error("Percent discount cannot exceed 100");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("promo_codes").insert({
      code: trimmed,
      discount_type: type,
      discount_value: numValue,
      max_uses: maxUses ? parseInt(maxUses, 10) : null,
      expires_at: expires ? new Date(expires).toISOString() : null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That code already exists" : error.message);
      return;
    }
    toast.success(`Promo code ${trimmed} created`);
    setCode(""); setValue(""); setMaxUses(""); setExpires("");
    load();
  };

  const toggle = async (p: PromoCode) => {
    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag className="h-4 w-4" /> Promo codes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="promo-code" className="text-xs">Code</Label>
            <Input
              id="promo-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="WELCOME10"
              className="uppercase"
              maxLength={20}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "percent" | "fixed")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent off</SelectItem>
                <SelectItem value="fixed">Fixed amount ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="promo-value" className="text-xs">{type === "percent" ? "Percent" : "Amount ($)"}</Label>
            <Input id="promo-value" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "percent" ? "10" : "15.00"} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="promo-max" className="text-xs">Max uses (optional)</Label>
            <Input id="promo-max" type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label htmlFor="promo-exp" className="text-xs">Expires (optional)</Label>
            <Input id="promo-exp" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={saving} className="w-full" size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
          Create promo code
        </Button>

        <div className="space-y-2 pt-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : codes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No promo codes yet.</p>
          ) : (
            codes.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{p.code}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.discount_type === "percent" ? `${p.discount_value}% off` : `$${p.discount_value} off`}
                    {" · "}{p.uses_count}{p.max_uses ? `/${p.max_uses}` : ""} used
                    {p.expires_at ? ` · expires ${new Date(p.expires_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.is_active ? "default" : "secondary"}>
                    {p.is_active ? "Active" : "Disabled"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => toggle(p)}>
                    {p.is_active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPromoCodes;
