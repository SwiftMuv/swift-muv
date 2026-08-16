import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { fetchPricingConfig, savePricingConfig, type PricingKey } from "@/lib/pricingConfig";

type Field = {
  key: PricingKey;
  label: string;
  hint: string;
  step: string;
  suffix?: string;
  fallback: number;
};

const FIELDS: Field[] = [
  { key: "suv_flat_local_cad", label: "SUV flat fee", hint: "Flat, tax-inclusive fee for trips under the included distance", step: "1", suffix: "CAD", fallback: 50 },
  { key: "flat_included_km", label: "Flat-rate distance", hint: "Kilometres covered by the flat fee", step: "1", suffix: "km", fallback: 50 },
  { key: "excess_per_km_cad", label: "Excess distance rate", hint: "Charged per kilometre beyond the flat-rate distance", step: "0.5", suffix: "CAD / km", fallback: 5 },
  { key: "suv_included_km", label: "SUV included distance (legacy)", hint: "Unused by the flat-rate model", step: "0.5", suffix: "km", fallback: 3 },

  { key: "per_km_rate_cad", label: "Distance rate", hint: "Charged per kilometre on every vehicle", step: "0.5", suffix: "CAD / km", fallback: 20 },
  { key: "base_fee_cad", label: "Base fee (smallest vehicle)", hint: "Scales up automatically for bigger vehicles", step: "1", suffix: "CAD", fallback: 20 },
  { key: "crew_member_rate_cad", label: "Crew member fee", hint: "Charged per extra helper", step: "1", suffix: "CAD", fallback: 15 },
  { key: "tax_rate", label: "Tax rate", hint: "Quebec default is 0.14975 (14.975%)", step: "0.00001", suffix: "ratio", fallback: 0.14975 },
];

const AdminPricingSettings = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const cfg = await fetchPricingConfig();
    const next: Record<string, string> = {};
    FIELDS.forEach((f) => {
      next[f.key] = String(cfg[f.key] ?? f.fallback);
    });
    setValues(next);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const payload: Partial<Record<PricingKey, number>> = {};
    for (const f of FIELDS) {
      const n = Number(values[f.key]);
      if (!Number.isFinite(n) || n < 0) {
        toast.error(`"${f.label}" must be a positive number`);
        return;
      }
      payload[f.key] = n;
    }
    setSaving(true);
    try {
      await savePricingConfig(payload);
      toast.success("Pricing updated — new bookings use these rates");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save pricing");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    const next: Record<string, string> = {};
    FIELDS.forEach((f) => (next[f.key] = String(f.fallback)));
    setValues(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4" /> Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key} className="text-sm">
                    {f.label}
                    {f.suffix && <span className="ml-1 text-xs text-muted-foreground">({f.suffix})</span>}
                  </Label>
                  <Input
                    id={f.key}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step={f.step}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">{f.hint}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save pricing
              </Button>
              <Button variant="outline" onClick={resetDefaults} disabled={saving}>
                <RotateCcw className="mr-2 h-4 w-4" /> Restore defaults
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Changes apply to new price estimates and every newly created or updated booking. Existing
              completed bookings keep the price they were charged.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPricingSettings;
