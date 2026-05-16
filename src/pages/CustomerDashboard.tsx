import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookNewMoveForm from "@/components/customer/BookNewMoveForm";

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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Customer Dashboard</h1>
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="book">Book a New Move</TabsTrigger>
          </TabsList>
          <TabsContent value="bookings" className="space-y-4">
            {loading && <p className="text-muted-foreground">Loading…</p>}
            {!loading && bookings.length === 0 && (
              <p className="text-muted-foreground">No bookings yet.</p>
            )}
            {bookings.map((b) => (
              <Card key={b.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">
                    ${Number(b.total_price).toFixed(2)}
                  </CardTitle>
                  <Badge variant="secondary">{b.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">From:</span> {b.pickup_address}</p>
                  <p><span className="text-muted-foreground">To:</span> {b.dropoff_address}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(b.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="book">
            <BookNewMoveForm onBooked={loadBookings} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerDashboard;
