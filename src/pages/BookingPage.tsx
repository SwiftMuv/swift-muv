import { useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AddressInput from "@/components/booking/AddressInput";
import MoveSizeSelector, { type MoveSize } from "@/components/booking/MoveSizeSelector";
import PriceQuote from "@/components/booking/PriceQuote";

const BookingPage = () => {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [moveSize, setMoveSize] = useState<MoveSize | null>(null);

  const handleBook = () => {
    toast.success("Move booked successfully!", {
      description: "A driver will be assigned shortly.",
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Book a Move
        </h1>
      </header>

      <div className="flex-1 space-y-6 p-4 pb-8">
        {/* Date pill */}
        <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2.5">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Today, ASAP</span>
          <button className="ml-auto text-xs font-semibold text-primary">Schedule</button>
        </div>

        {/* Addresses */}
        <div className="space-y-4">
          <AddressInput
            label="Pickup"
            placeholder="Enter pickup address"
            value={pickup}
            onChange={setPickup}
            icon="pickup"
          />
          <div className="ml-5 border-l-2 border-dashed border-border h-4" />
          <AddressInput
            label="Drop-off"
            placeholder="Enter drop-off address"
            value={dropoff}
            onChange={setDropoff}
            icon="dropoff"
          />
        </div>

        {/* Move Size */}
        <MoveSizeSelector selected={moveSize} onSelect={setMoveSize} />

        {/* Price Quote */}
        <PriceQuote
          moveSize={moveSize}
          hasPickup={pickup.trim().length > 0}
          hasDropoff={dropoff.trim().length > 0}
          onBook={handleBook}
        />
      </div>
    </div>
  );
};

export default BookingPage;
