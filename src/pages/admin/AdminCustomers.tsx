import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Eye } from "lucide-react";

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const [c, b] = await Promise.all([
        supabase.from("customer_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      ]);
      setCustomers(c.data ?? []);
      setBookings(b.data ?? []);
    })();
  }, []);

  const bookingsByCustomer = useMemo(() => {
    const m = new Map<string, any[]>();
    bookings.forEach((b) => {
      const arr = m.get(b.customer_id) ?? [];
      arr.push(b);
      m.set(b.customer_id, arr);
    });
    return m;
  }, [bookings]);

  const selectedBookings = selected ? bookingsByCustomer.get(selected.user_id) ?? [] : [];
  const selectedTotal = selectedBookings.reduce((s, b) => s + Number(b.total_price ?? 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No customers yet.
                  </TableCell>
                </TableRow>
              )}
              {customers.map((c) => {
                const cb = bookingsByCustomer.get(c.user_id) ?? [];
                const total = cb.reduce((s, b) => s + Number(b.total_price ?? 0), 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">{c.full_name || "Unnamed"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {cb.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-bold">${total.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(c)}>
                        <Eye className="w-4 h-4 mr-1" /> History
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.full_name || "Customer"} — Booking History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{selectedBookings.length} bookings</span>
              <span className="font-bold">Total: ${selectedTotal.toFixed(2)}</span>
            </div>
            <div className="divide-y border rounded-lg max-h-[60vh] overflow-y-auto">
              {selectedBookings.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground text-center">No bookings.</p>
              )}
              {selectedBookings.map((b) => (
                <div key={b.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {b.pickup_address} → {b.dropoff_address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.move_size} · {new Date(b.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">${Number(b.total_price).toFixed(2)}</p>
                    <Badge variant="secondary" className="text-[10px] capitalize mt-1">
                      {b.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomers;
