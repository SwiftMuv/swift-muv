import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Truck,
  ClipboardList,
  Users,
  FileCheck,
  Activity,
} from "lucide-react";

type Stats = {
  customers: number;
  drivers: number;
  verifiedDrivers: number;
  bookings: number;
  activeTrips: number;
  revenue: number;
  pendingDocs: number;
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any;
  label: string;
  value: any;
  sub?: string;
  accent?: string;
}) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p
            className="text-3xl font-bold mt-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {value}
          </p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ?? "bg-primary/10 text-primary"}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ACTIVE_STATUSES = new Set(["assigned", "in_transit", "in_progress", "accepted"]);

const AdminOverview = () => {
  const [stats, setStats] = useState<Stats>({
    customers: 0,
    drivers: 0,
    verifiedDrivers: 0,
    bookings: 0,
    activeTrips: 0,
    revenue: 0,
    pendingDocs: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [c, d, b, docs] = await Promise.all([
        supabase.from("customer_profiles").select("id", { count: "exact", head: true }),
        supabase.from("driver_profiles").select("is_verified"),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("driver_documents").select("status"),
      ]);
      const drivs = d.data ?? [];
      const books = b.data ?? [];
      const dcs = docs.data ?? [];
      setStats({
        customers: c.count ?? 0,
        drivers: drivs.length,
        verifiedDrivers: drivs.filter((x: any) => x.is_verified).length,
        bookings: books.length,
        activeTrips: books.filter((x: any) => ACTIVE_STATUSES.has(x.status)).length,
        revenue: books.reduce((s: number, x: any) => s + Number(x.total_price ?? 0), 0),
        pendingDocs: dcs.filter((x: any) => x.status === "pending").length,
      });
      setRecent(books.slice(0, 5));
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`$${stats.revenue.toFixed(2)}`}
          sub={`${stats.bookings} bookings`}
          accent="bg-[hsl(var(--swift-success))]/15 text-[hsl(var(--swift-success))]"
        />
        <StatCard
          icon={Activity}
          label="Active Trips"
          value={stats.activeTrips}
          sub="Currently in progress"
        />
        <StatCard
          icon={Truck}
          label="Total Drivers"
          value={stats.drivers}
          sub={`${stats.verifiedDrivers} verified`}
        />
        <StatCard
          icon={FileCheck}
          label="Pending Approvals"
          value={stats.pendingDocs}
          sub="Documents to review"
          accent="bg-[hsl(var(--swift-warning))]/15 text-[hsl(var(--swift-warning))]"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <StatCard icon={Users} label="Customers" value={stats.customers} />
        <StatCard icon={ClipboardList} label="Total Bookings" value={stats.bookings} />
        <StatCard
          icon={DollarSign}
          label="Avg Booking Value"
          value={`$${(stats.revenue / Math.max(1, stats.bookings)).toFixed(2)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="divide-y">
              {recent.map((b) => (
                <Link
                  key={b.id}
                  to="/admin/trips"
                  className="flex items-center justify-between py-3 hover:bg-muted/40 rounded px-2 -mx-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {b.pickup_address} → {b.dropoff_address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.move_size} · {new Date(b.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {b.status}
                    </Badge>
                    <span className="text-sm font-bold">${Number(b.total_price).toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
