import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";

type Row = {
  id: string; pickup_address: string; dropoff_address: string; status: string;
  base_price: number; distance_fee: number; service_fee: number; tip_amount: number;
  total_price: number; distance_km: number | null; recommended_vehicle: string | null;
  created_at: string; updated_at: string;
};

const Receipt = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useI18n();
  const [b, setB] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    supabase
      .from("bookings")
      .select("id, pickup_address, dropoff_address, status, base_price, distance_fee, service_fee, tip_amount, total_price, distance_km, recommended_vehicle, created_at, updated_at")
      .eq("id", bookingId)
      .maybeSingle()
      .then(({ data }) => { setB(data as Row | null); setLoading(false); });
  }, [bookingId]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!b) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground"><p>Receipt not found.</p><Button onClick={() => navigate("/dashboard")}>Back</Button></div>;

  const line = (label: string, v: number) => (
    <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span>{formatCurrency(Number(v || 0))}</span></div>
  );
  const subtotal = Number(b.base_price) + Number(b.distance_fee) + Number(b.service_fee);
  const tax = Math.max(Number(b.total_price) - Number(b.tip_amount || 0) - subtotal, 0);

  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <CheckCircle2 className="h-10 w-10 text-primary" />
          <h1 className="text-xl font-bold">Trip receipt</h1>
          <p className="text-xs text-muted-foreground">#{b.id.slice(0, 8)} · {new Date(b.updated_at).toLocaleString()}</p>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">From:</span> {b.pickup_address}</p>
          <p><span className="text-muted-foreground">To:</span> {b.dropoff_address}</p>
          {b.distance_km != null && <p><span className="text-muted-foreground">Distance:</span> {Number(b.distance_km).toFixed(1)} km</p>}
          {b.recommended_vehicle && <p><span className="text-muted-foreground">Vehicle:</span> {b.recommended_vehicle}</p>}
        </div>
        <div className="space-y-2 border-t border-border pt-3">
          {line("Base fare", b.base_price)}
          {line("Distance", b.distance_fee)}
          {line("Crew", b.service_fee)}
          {line("Tax", tax)}
          {Number(b.tip_amount) > 0 && line("Tip", b.tip_amount)}
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span>{formatCurrency(Number(b.total_price))}</span></div>
        </div>
        <Button className="w-full" onClick={() => navigate("/dashboard")}>Done</Button>
      </div>
    </div>
  );
};

export default Receipt;
