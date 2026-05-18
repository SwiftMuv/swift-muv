import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Item = { id: string; name: string; volume: number };

const ITEMS: Item[] = [
  { id: "sofa", name: "Sofa", volume: 35 },
  { id: "queen_bed", name: "Queen Bed", volume: 45 },
  { id: "dining_table", name: "Dining Table", volume: 30 },
  { id: "dresser", name: "Dresser", volume: 25 },
  { id: "wardrobe", name: "Wardrobe", volume: 40 },
  { id: "fridge", name: "Refrigerator", volume: 30 },
  { id: "washer", name: "Washer / Dryer", volume: 20 },
  { id: "tv", name: "TV", volume: 8 },
  { id: "box", name: "Moving Box", volume: 3 },
];

const BASE_RATE = 50;
const PER_KM = 2;
const PER_VOLUME = 5;
const PEAK_MULTIPLIER = 1.2;

const moveSizeFor = (vol: number): "small" | "medium" | "large" | "xlarge" => {
  if (vol < 50) return "small";
  if (vol < 150) return "medium";
  if (vol < 300) return "large";
  return "xlarge";
};

interface Props {
  onBooked?: () => void;
}

const BookNewMoveForm = ({ onBooked }: Props) => {
  const { user } = useAuth();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [distanceKm, setDistanceKm] = useState<number>(10);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>("09:00");
  const [submitting, setSubmitting] = useState(false);

  const setQty = (id: string, delta: number) =>
    setQuantities((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }));

  const scheduledAt = useMemo(() => {
    if (!date) return null;
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  }, [date, time]);

  const isWeekend = scheduledAt
    ? [0, 6].includes(scheduledAt.getDay())
    : false;

  const totalVolume = useMemo(
    () =>
      ITEMS.reduce((sum, it) => sum + (quantities[it.id] ?? 0) * it.volume, 0),
    [quantities],
  );

  const pricing = useMemo(() => {
    const base = BASE_RATE;
    const distance = distanceKm * PER_KM;
    const volume = totalVolume * PER_VOLUME;
    let subtotal = base + distance + volume;
    if (isWeekend) subtotal = subtotal * PEAK_MULTIPLIER;
    const service = Math.round(subtotal * 0.1 * 100) / 100;
    const total = Math.round((subtotal + service) * 100) / 100;
    return { base, distance, volume, service, total };
  }, [distanceKm, totalVolume, isWeekend]);

  const selectedItems = ITEMS.filter((i) => (quantities[i.id] ?? 0) > 0).map(
    (i) => ({ id: i.id, name: i.name, qty: quantities[i.id], volume: i.volume }),
  );

  const futureValid = scheduledAt ? scheduledAt.getTime() > Date.now() : false;

  const bookingSchema = z.object({
    pickup: z.string().trim().min(5, "Pickup address must be at least 5 characters").max(200),
    dropoff: z.string().trim().min(5, "Drop-off address must be at least 5 characters").max(200),
    distanceKm: z.number().min(1, "Distance must be at least 1 km").max(2000),
    itemCount: z.number().min(1, "Select at least one item to move"),
    scheduledAt: z
      .date({ required_error: "Pick a date and time" })
      .refine((d) => d.getTime() > Date.now() + 60_000, "Scheduled time must be in the future"),
  });

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be signed in to book a move.");
      return;
    }
    if (pickup.trim().length < 5) return toast.error("Enter a pickup address (min 5 chars).");
    if (dropoff.trim().length < 5) return toast.error("Enter a drop-off address (min 5 chars).");
    if (selectedItems.length === 0) return toast.error("Select at least one item to move.");
    if (!scheduledAt) return toast.error("Pick a date and time for your move.");
    if (!futureValid) return toast.error("Scheduled time must be in the future.");
    const parsed = bookingSchema.safeParse({
      pickup,
      dropoff,
      distanceKm,
      itemCount: selectedItems.reduce((s, i) => s + i.qty, 0),
      scheduledAt: scheduledAt ?? undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please fix the form errors");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      customer_id: user.id,
      pickup_address: parsed.data.pickup,
      dropoff_address: parsed.data.dropoff,
      move_size: moveSizeFor(totalVolume),
      base_price: pricing.base,
      distance_fee: pricing.distance,
      service_fee: pricing.service,
      total_price: pricing.total,
      scheduled_at: parsed.data.scheduledAt.toISOString(),
      items_summary: { items: selectedItems, total_volume: totalVolume, peak: isWeekend },
    });
    setSubmitting(false);
    if (error) {
      toast.error("Booking failed: " + error.message);
      return;
    }
    toast.success("Booking confirmed!", {
      description: `Your move is scheduled for ${format(parsed.data.scheduledAt, "PPP 'at' p")}. Total $${pricing.total.toFixed(2)}.`,
    });
    setPickup("");
    setDropoff("");
    setQuantities({});
    setDate(undefined);
    onBooked?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book a New Move</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Pickup address</Label>
          <Input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="123 Main St" />
        </div>
        <div className="space-y-2">
          <Label>Drop-off address</Label>
          <Input value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="456 Oak Ave" />
        </div>
        <div className="space-y-2">
          <Label>Estimated distance (km)</Label>
          <Input
            type="number"
            min={1}
            value={distanceKm}
            onChange={(e) => setDistanceKm(Math.max(1, Number(e.target.value) || 0))}
          />
        </div>

        <div className="space-y-2">
          <Label>Items to move</Label>
          <div className="space-y-2 rounded-lg border border-border p-3">
            {ITEMS.map((item) => {
              const qty = quantities[item.id] ?? 0;
              return (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">~{item.volume} cu ft</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(item.id, -1)} disabled={qty === 0}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(item.id, +1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PP") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        {date && !futureValid && (
          <p className="text-xs text-destructive">Please choose a future date and time.</p>
        )}

        <div className="rounded-lg bg-secondary p-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Base rate</span><span>${pricing.base.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Distance ({distanceKm} km)</span><span>${pricing.distance.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Volume ({totalVolume} cu ft)</span><span>${(totalVolume * PER_VOLUME).toFixed(2)}</span></div>
          {isWeekend && <div className="flex justify-between text-primary"><span>Weekend peak ×{PEAK_MULTIPLIER}</span><span></span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span>${pricing.service.toFixed(2)}</span></div>
          <div className="flex justify-between border-t border-border pt-2 font-bold text-base"><span>Total</span><span>${pricing.total.toFixed(2)}</span></div>
        </div>

        <Button onClick={handleSubmit} disabled={submitting || !user} className="w-full">
          {submitting ? "Booking…" : "Book Move"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BookNewMoveForm;
