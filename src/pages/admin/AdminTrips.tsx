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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_VARIANTS: Record<string, string> = {
  pending: "bg-[hsl(var(--swift-warning))]/15 text-[hsl(var(--swift-warning))]",
  assigned: "bg-primary/15 text-primary",
  accepted: "bg-primary/15 text-primary",
  in_transit: "bg-[hsl(var(--swift-success))]/15 text-[hsl(var(--swift-success))]",
  in_progress: "bg-[hsl(var(--swift-success))]/15 text-[hsl(var(--swift-success))]",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-[hsl(var(--swift-danger))]/15 text-[hsl(var(--swift-danger))]",
};

const FILTERS = ["all", "pending", "assigned", "in_transit", "completed", "cancelled"];

const AdminTrips = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const [b, j, d] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("jobs").select("*"),
        supabase.from("driver_profiles").select("user_id, full_name"),
      ]);
      setBookings(b.data ?? []);
      setJobs(j.data ?? []);
      setDrivers(d.data ?? []);
    })();
  }, []);

  const driverByUserId = useMemo(() => {
    const m = new Map<string, any>();
    drivers.forEach((d) => m.set(d.user_id, d));
    return m;
  }, [drivers]);

  const jobByBooking = useMemo(() => {
    const m = new Map<string, any>();
    jobs.forEach((j) => m.set(j.booking_id, j));
    return m;
  }, [jobs]);

  const filtered = useMemo(
    () => (filter === "all" ? bookings : bookings.filter((b) => b.status === filter)),
    [bookings, filter],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">All Trips ({filtered.length})</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => (
                <SelectItem key={f} value={f} className="capitalize">
                  {f.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No trips found.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((b) => {
                const job = jobByBooking.get(b.id);
                const driver = job ? driverByUserId.get(job.driver_id) : null;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="max-w-[280px]">
                      <p className="text-sm font-medium truncate">{b.pickup_address}</p>
                      <p className="text-xs text-muted-foreground truncate">→ {b.dropoff_address}</p>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{b.move_size}</TableCell>
                    <TableCell className="text-sm">
                      {driver?.full_name ?? <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] capitalize ${STATUS_VARIANTS[b.status] ?? ""}`}
                      >
                        {b.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold">
                      ${Number(b.total_price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTrips;
