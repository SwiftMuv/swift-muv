import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { jsPDF } from "jspdf";

type Row = {
  id: string; pickup_address: string; dropoff_address: string; status: string;
  base_price: number; distance_fee: number; service_fee: number; tip_amount: number;
  total_price: number; distance_km: number | null; recommended_vehicle: string | null;
  created_at: string; updated_at: string; stripe_payment_intent_id: string | null;
  pickup_lat?: number | null; dropoff_lat?: number | null;
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
      .select("id, pickup_address, dropoff_address, status, base_price, distance_fee, service_fee, tip_amount, total_price, distance_km, recommended_vehicle, created_at, updated_at, stripe_payment_intent_id")
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

  const paid = Boolean(b.stripe_payment_intent_id) || b.status === "completed";
  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const money = (v: number) => `$${Number(v || 0).toFixed(2)}`;
    let y = 60;
    doc.setFont("helvetica", "bold").setFontSize(22).text("SwiftMuv", 50, y);
    doc.setFontSize(14).text("Trip receipt", 50, (y += 24));
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(`Receipt #${b.id.slice(0, 8).toUpperCase()}`, 50, (y += 20));
    doc.text(`Booked: ${new Date(b.created_at).toLocaleString()}`, 50, (y += 14));
    doc.text(`Completed: ${new Date(b.updated_at).toLocaleString()}`, 50, (y += 14));
    doc.text(`Status: ${b.status}`, 50, (y += 14));
    doc.setFont("helvetica", "bold").text(`Payment: ${paid ? "PAID" : "UNPAID"}`, 50, (y += 14));
    if (b.stripe_payment_intent_id) doc.setFont("helvetica", "normal").text(`Payment ref: ${b.stripe_payment_intent_id}`, 50, (y += 14));
    doc.setFont("helvetica", "bold").setFontSize(12).text("Trip details", 50, (y += 30));
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.splitTextToSize(`From: ${b.pickup_address}`, 495).forEach((l: string) => doc.text(l, 50, (y += 14)));
    doc.splitTextToSize(`To: ${b.dropoff_address}`, 495).forEach((l: string) => doc.text(l, 50, (y += 14)));
    if (b.distance_km != null) doc.text(`Distance: ${Number(b.distance_km).toFixed(1)} km`, 50, (y += 14));
    if (b.recommended_vehicle) doc.text(`Vehicle: ${b.recommended_vehicle}`, 50, (y += 14));
    doc.setFont("helvetica", "bold").setFontSize(12).text("Fare", 50, (y += 30));
    doc.setFont("helvetica", "normal").setFontSize(10);
    const rows: [string, number][] = [["Base fare", b.base_price], ["Distance", b.distance_fee], ["Crew", b.service_fee], ["Tax", tax]];
    if (Number(b.tip_amount) > 0) rows.push(["Tip", b.tip_amount]);
    rows.forEach(([k, v]) => { y += 16; doc.text(k, 50, y); doc.text(money(v), 545, y, { align: "right" }); });
    doc.line(50, (y += 10), 545, y);
    doc.setFont("helvetica", "bold").setFontSize(12);
    y += 18; doc.text("Total", 50, y); doc.text(money(b.total_price), 545, y, { align: "right" });
    doc.setFont("helvetica", "normal").setFontSize(9).text("Thank you for moving with SwiftMuv · support@swiftmuv.com", 50, 800);
    doc.save(`swiftmuv-receipt-${b.id.slice(0, 8)}.pdf`);
  };

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
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payment</span><span className={paid ? "font-semibold text-primary" : "font-semibold text-destructive"}>{paid ? "Paid" : "Unpaid"}</span></div>
          {line("Base fare", b.base_price)}
          {line("Distance", b.distance_fee)}
          {line("Crew", b.service_fee)}
          {line("Tax", tax)}
          {Number(b.tip_amount) > 0 && line("Tip", b.tip_amount)}
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span>{formatCurrency(Number(b.total_price))}</span></div>
        </div>
        <Button variant="outline" className="w-full" onClick={downloadPdf}>Download PDF receipt</Button>
        <Button className="w-full" onClick={() => navigate("/dashboard")}>Done</Button>
      </div>
    </div>
  );
};

export default Receipt;
