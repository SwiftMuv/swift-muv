import { useCallback, useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BookNewMoveForm from "@/components/customer/BookNewMoveForm";
import { CustomerBottomNav } from "@/components/customer/CustomerBottomNav";
import CustomerHomeScreen from "@/components/customer/CustomerHomeScreen";
import CustomerAccountScreen from "@/components/customer/CustomerAccountScreen";

interface Booking {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  total_price: number;
  status: string;
  created_at: string;
}

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("home");

  const loadBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("id, pickup_address, dropoff_address, total_price, status, created_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setBookings(data as Booking[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const completed = bookings.filter((b) => b.status === "completed");

  const titles: Record<string, string> = {
    home: "SwiftMuv",
    bookings: "Book a Move",
    activities: "Activities",
    account: "Account",
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">{titles[activeTab]}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        {activeTab === "home" && <CustomerHomeScreen />}

        {activeTab === "bookings" && (
          <div className="pb-4">
            <BookNewMoveForm onBooked={loadBookings} />
          </div>
        )}

        {activeTab === "activities" && (
          <div className="space-y-3 pb-4">
            {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
            {!loading && completed.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  No completed trips yet.
                </CardContent>
              </Card>
            )}
            {completed.map((b) => (
              <Card key={b.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">${Number(b.total_price).toFixed(2)}</CardTitle>
                  <Badge variant="secondary">{b.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">From:</span> {b.pickup_address}</p>
                  <p><span className="text-muted-foreground">To:</span> {b.dropoff_address}</p>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("bookings")}
                      className="bg-primary/15 text-primary hover:bg-primary/25"
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                      Rebook
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "account" && <CustomerAccountScreen />}
      </main>

      <CustomerBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default CustomerDashboard;
