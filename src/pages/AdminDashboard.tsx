import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  LogOut, Users, Package, DollarSign, CheckCircle2, XCircle, Shield, Loader2,
  TrendingUp, UserCheck, Truck, RefreshCw,
} from "lucide-react";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

type Booking = {
  id: string;
  customer_id: string;
  status: string;
  total_price: number;
  pickup_address: string;
  dropoff_address: string;
  move_size: string;
  vehicle_category: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  created_at: string;
};

type PendingDriver = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  verification_status: string;
  is_verified: boolean | null;
  created_at: string;
};

type VehicleCategoryRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  display_order: number;
};

const fmtCAD = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n || 0);

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriver[]>([]);
  const [activeDrivers, setActiveDrivers] = useState(0);
  const [vehicleCats, setVehicleCats] = useState<VehicleCategoryRow[]>([]);
  const [driverVehicles, setDriverVehicles] = useState<(string | null)[]>([]);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [bookingFilter, setBookingFilter] = useState<"all" | "pending" | "completed" | "cancelled">("all");
  const [activeTab, setActiveTab] = useState<string>("overview");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [bRes, pRes, dRes, adRes, vRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, customer_id, status, total_price, pickup_address, dropoff_address, move_size, vehicle_category, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.rpc("get_profiles"),
        supabase
          .from("driver_profiles")
          .select("user_id, full_name, phone, verification_status, is_verified, created_at")
          .or("is_verified.eq.false,verification_status.eq.pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("driver_profiles")
          .select("user_id", { count: "exact", head: true })
          .eq("is_verified", true)
          .eq("is_online", true),
        supabase
          .from("vehicle_categories")
          .select("id, code, name, description, is_active, display_order")
          .order("display_order", { ascending: true }),
      ]);
      if (bRes.error) throw bRes.error;
      if (pRes.error) throw pRes.error;
      if (dRes.error) throw dRes.error;
      setBookings((bRes.data as Booking[]) ?? []);
      setProfiles(((pRes.data as Profile[]) ?? []).slice(0, 100));
      setPendingDrivers((dRes.data as PendingDriver[]) ?? []);
      setActiveDrivers(adRes.count ?? 0);
      setVehicleCats((vRes.data as VehicleCategoryRow[]) ?? []);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const stats = useMemo(() => {
    const totalRevenue = bookings
      .filter((b) => b.status === "completed")
      .reduce((acc, b) => acc + Number(b.total_price || 0), 0);
    const completed = bookings.filter((b) => b.status === "completed").length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const cancelled = bookings.filter((b) => b.status === "cancelled").length;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayRevenue = bookings
      .filter((b) => b.status === "completed" && new Date(b.created_at) >= todayStart)
      .reduce((acc, b) => acc + Number(b.total_price || 0), 0);
    return { totalRevenue, completed, pending, cancelled, totalBookings: bookings.length, todayRevenue };
  }, [bookings]);

  // Last 7 days revenue sparkline
  const last7 = useMemo(() => {
    const days: { label: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const revenue = bookings
        .filter((b) => b.status === "completed")
        .filter((b) => {
          const c = new Date(b.created_at);
          return c >= d && c < next;
        })
        .reduce((s, b) => s + Number(b.total_price || 0), 0);
      days.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), revenue });
    }
    return days;
  }, [bookings]);
  const sparklineMax = Math.max(1, ...last7.map((d) => d.revenue));

  // Booking distribution by vehicle category — stable color per category code
  const CATEGORY_COLORS: Record<string, string> = {
    suv: "hsl(14 100% 57%)",            // vibrant orange
    pickup_truck: "hsl(45 100% 51%)",   // amber
    cargo_van: "hsl(210 100% 52%)",     // blue
    box_truck: "hsl(152 76% 40%)",      // green
    moving_truck_16: "hsl(280 65% 60%)",// purple
    moving_truck_26: "hsl(340 82% 56%)",// pink
    unspecified: "hsl(222 15% 55%)",    // slate
  };
  const FALLBACK_COLORS = [
    "hsl(14 100% 57%)", "hsl(45 100% 51%)", "hsl(210 100% 52%)",
    "hsl(152 76% 40%)", "hsl(280 65% 60%)", "hsl(340 82% 56%)",
    "hsl(190 85% 45%)", "hsl(28 90% 50%)",
  ];
  const colorForCategory = (code: string, idx: number) =>
    CATEGORY_COLORS[code] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  const categoryLabel = (code: string) => {
    const row = vehicleCats.find((c) => c.code === code);
    return row?.name || code.replace(/_/g, " ");
  };
  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookings) {
      const k = b.vehicle_category || "unspecified";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([code, value]) => ({ code, name: categoryLabel(code), value }))
      .sort((a, b) => b.value - a.value);
  }, [bookings, vehicleCats]);


  const filteredBookings = useMemo(() => {
    if (bookingFilter === "all") return bookings;
    return bookings.filter((b) => b.status === bookingFilter);
  }, [bookings, bookingFilter]);

  const recentOrders = useMemo(() => bookings.slice(0, 8), [bookings]);

  const selectTile = (filter: typeof bookingFilter) => {
    setBookingFilter(filter);
    setActiveTab("bookings");
  };

  const handleApprove = async (driverId: string, approve: boolean) => {
    setActioningId(driverId);
    try {
      const { error } = await supabase
        .from("driver_profiles")
        .update({ is_verified: approve, verification_status: approve ? "approved" : "rejected" })
        .eq("user_id", driverId);
      if (error) throw error;
      toast.success(approve ? "Driver approved" : "Driver rejected");
      setPendingDrivers((prev) => prev.filter((d) => d.user_id !== driverId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActioningId(null);
    }
  };

  const updateBookingStatus = async (id: string, status: "completed" | "cancelled") => {
    setActioningId(id);
    try {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success(`Booking marked ${status}`);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActioningId(null);
    }
  };

  const toggleVehicleCat = async (cat: VehicleCategoryRow) => {
    setActioningId(cat.id);
    try {
      const { error } = await supabase
        .from("vehicle_categories")
        .update({ is_active: !cat.is_active })
        .eq("id", cat.id);
      if (error) throw error;
      setVehicleCats((prev) => prev.map((c) => (c.id === cat.id ? { ...c, is_active: !c.is_active } : c)));
      toast.success(`${cat.name} ${!cat.is_active ? "enabled" : "disabled"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActioningId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
            <Button size="sm" variant="outline" onClick={loadAll} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Stat tiles */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Bookings" value={String(stats.totalBookings)} icon={<Package className="h-4 w-4" />} onClick={() => selectTile("all")} active={activeTab === "bookings" && bookingFilter === "all"} />
          <StatCard label="Pending" value={String(stats.pending)} icon={<Loader2 className="h-4 w-4" />} onClick={() => selectTile("pending")} active={activeTab === "bookings" && bookingFilter === "pending"} />
          <StatCard label="Completed" value={String(stats.completed)} icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => selectTile("completed")} active={activeTab === "bookings" && bookingFilter === "completed"} />
          <StatCard label="Revenue" value={fmtCAD(stats.totalRevenue)} icon={<DollarSign className="h-4 w-4" />} />
          <StatCard label="Today" value={fmtCAD(stats.todayRevenue)} icon={<TrendingUp className="h-4 w-4" />} />
          <StatCard label="Active drivers" value={String(activeDrivers)} icon={<UserCheck className="h-4 w-4" />} />
          <StatCard label="Pending drivers" value={String(pendingDrivers.length)} icon={<Users className="h-4 w-4" />} onClick={() => setActiveTab("drivers")} active={activeTab === "drivers"} />
          <StatCard label="Cancelled" value={String(stats.cancelled)} icon={<XCircle className="h-4 w-4" />} onClick={() => selectTile("cancelled")} active={activeTab === "bookings" && bookingFilter === "cancelled"} />
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="drivers">
              Drivers
              {pendingDrivers.length > 0 && (
                <Badge variant="secondary" className="ml-2">{pendingDrivers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" /> Revenue · last 7 days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-32 items-end gap-2">
                  {last7.map((d, i) => {
                    const h = Math.max(4, (d.revenue / sparklineMax) * 100);
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-primary/60 to-primary transition-all"
                          style={{ height: `${h}%` }}
                          title={fmtCAD(d.revenue)}
                        />
                        <span className="text-[10px] text-muted-foreground">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4 text-primary" /> Bookings by vehicle category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryBreakdown.length === 0 ? (
                  <Empty label="No booking data yet" />
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={3}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        >
                          {categoryBreakdown.map((entry, i) => (
                            <Cell key={i} fill={colorForCategory(entry.code, i)} />
                          ))}

                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 12,
                            fontSize: 12,
                          }}
                          formatter={(value: number, name: string) => {
                            const total = categoryBreakdown.reduce((s, x) => s + x.value, 0);
                            const pct = total ? ((value / total) * 100).toFixed(1) : "0";
                            return [`${value} (${pct}%)`, name];
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>


            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <SkeletonRows />
                ) : recentOrders.length === 0 ? (
                  <Empty label="No bookings yet" />
                ) : (
                  recentOrders.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{b.pickup_address} → {b.dropoff_address}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(b.created_at).toLocaleString()} · {b.move_size}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={b.status === "completed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>
                          {b.status}
                        </Badge>
                        <span className="font-semibold">{fmtCAD(Number(b.total_price))}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base capitalize">
                  {bookingFilter === "all" ? "All bookings" : `${bookingFilter} bookings`}
                </CardTitle>
                {bookingFilter !== "all" && (
                  <Button size="sm" variant="ghost" onClick={() => setBookingFilter("all")}>Clear filter</Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <SkeletonRows />
                ) : filteredBookings.length === 0 ? (
                  <Empty label="No bookings" />
                ) : (
                  filteredBookings.map((b) => (
                    <div key={b.id} className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{b.pickup_address} → {b.dropoff_address}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(b.created_at).toLocaleString()} · {b.move_size}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={b.status === "completed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>
                          {b.status}
                        </Badge>
                        <span className="font-semibold">{fmtCAD(Number(b.total_price))}</span>
                        {b.status !== "completed" && b.status !== "cancelled" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateBookingStatus(b.id, "completed")} disabled={actioningId === b.id}>
                              Complete
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateBookingStatus(b.id, "cancelled")} disabled={actioningId === b.id}>
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending driver applications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <SkeletonRows />
                ) : pendingDrivers.length === 0 ? (
                  <Empty label="No pending applications" />
                ) : (
                  pendingDrivers.map((d) => (
                    <div key={d.user_id} className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-medium">{d.full_name || "Unnamed driver"}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.phone || "No phone"} · Applied {new Date(d.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{d.verification_status}</Badge>
                        <Button size="sm" onClick={() => handleApprove(d.user_id, true)} disabled={actioningId === d.user_id}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleApprove(d.user_id, false)} disabled={actioningId === d.user_id}>
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profiles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <SkeletonRows />
                ) : profiles.length === 0 ? (
                  <Empty label="No users" />
                ) : (
                  profiles.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.full_name || p.email || p.id}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.email} {p.phone ? `· ${p.phone}` : ""}</div>
                      </div>
                      <Badge variant="outline">{p.role}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4" /> Vehicle categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <SkeletonRows />
                ) : vehicleCats.length === 0 ? (
                  <Empty label="No vehicle categories" />
                ) : (
                  vehicleCats.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium">{c.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{c.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.is_active ? "default" : "secondary"}>
                          {c.is_active ? "Active" : "Disabled"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleVehicleCat(c)}
                          disabled={actioningId === c.id}
                        >
                          {c.is_active ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, icon, onClick, active }: { label: string; value: string; icon: React.ReactNode; onClick?: () => void; active?: boolean }) => (
  <Card
    onClick={onClick}
    className={`${onClick ? "cursor-pointer transition hover:border-primary/60 hover:shadow-sm" : ""} ${active ? "border-primary ring-1 ring-primary/40" : ""}`}
  >
    <CardContent className="flex items-center justify-between p-4">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
      <div className="text-muted-foreground">{icon}</div>
    </CardContent>
  </Card>
);

const SkeletonRows = () => (
  <div className="space-y-2">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
    ))}
  </div>
);

const Empty = ({ label }: { label: string }) => (
  <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
    {label}
  </div>
);

export default AdminDashboard;
