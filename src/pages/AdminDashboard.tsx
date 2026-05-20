import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Users, Package, DollarSign, CheckCircle2, XCircle, Shield, Loader2 } from "lucide-react";

type Booking = {
  id: string;
  customer_id: string;
  status: string;
  total_price: number;
  pickup_address: string;
  dropoff_address: string;
  move_size: string;
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

const formatCurrency = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n || 0);

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriver[]>([]);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [bookingFilter, setBookingFilter] = useState<"all" | "pending" | "completed">("all");
  const [activeTab, setActiveTab] = useState<string>("bookings");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [bRes, pRes, dRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, customer_id, status, total_price, pickup_address, dropoff_address, move_size, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.rpc("get_profiles"),
        supabase
          .from("driver_profiles")
          .select("user_id, full_name, phone, verification_status, is_verified, created_at")
          .or("is_verified.eq.false,verification_status.eq.pending")
          .order("created_at", { ascending: false }),
      ]);
      if (bRes.error) throw bRes.error;
      if (pRes.error) throw pRes.error;
      if (dRes.error) throw dRes.error;
      setBookings((bRes.data as Booking[]) ?? []);
      setProfiles(((pRes.data as Profile[]) ?? []).slice(0, 50));
      setPendingDrivers((dRes.data as PendingDriver[]) ?? []);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = bookings
      .filter((b) => b.status === "completed")
      .reduce((acc, b) => acc + Number(b.total_price || 0), 0);
    const completed = bookings.filter((b) => b.status === "completed").length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    return { totalRevenue, completed, pending, totalBookings: bookings.length };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (bookingFilter === "all") return bookings;
    return bookings.filter((b) => b.status === bookingFilter);
  }, [bookings, bookingFilter]);

  const selectTile = (filter: "all" | "pending" | "completed") => {
    setBookingFilter(filter);
    setActiveTab("bookings");
  };

  const handleApprove = async (driverId: string, approve: boolean) => {
    setActioningId(driverId);
    try {
      const { error } = await supabase
        .from("driver_profiles")
        .update({
          is_verified: approve,
          verification_status: approve ? "approved" : "rejected",
        })
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
            <Button size="sm" variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Bookings" value={String(stats.totalBookings)} icon={<Package className="h-4 w-4" />} onClick={() => selectTile("all")} active={activeTab === "bookings" && bookingFilter === "all"} />
          <StatCard label="Pending" value={String(stats.pending)} icon={<Loader2 className="h-4 w-4" />} onClick={() => selectTile("pending")} active={activeTab === "bookings" && bookingFilter === "pending"} />
          <StatCard label="Completed" value={String(stats.completed)} icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => selectTile("completed")} active={activeTab === "bookings" && bookingFilter === "completed"} />
          <StatCard label="Revenue" value={formatCurrency(stats.totalRevenue)} icon={<DollarSign className="h-4 w-4" />} onClick={() => selectTile("completed")} active={activeTab === "bookings" && bookingFilter === "completed"} />
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="drivers">
              Drivers
              {pendingDrivers.length > 0 && (
                <Badge variant="secondary" className="ml-2">{pendingDrivers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  {bookingFilter === "all" ? "All bookings" : bookingFilter === "pending" ? "Pending bookings" : "Completed bookings"}
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
                    <div key={b.id} className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{b.pickup_address} → {b.dropoff_address}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(b.created_at).toLocaleString()} • {b.move_size}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={b.status === "completed" ? "default" : "secondary"}>{b.status}</Badge>
                        <span className="font-semibold">{formatCurrency(Number(b.total_price))}</span>
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
                          {d.phone || "No phone"} • Applied {new Date(d.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{d.verification_status}</Badge>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(d.user_id, true)}
                          disabled={actioningId === d.user_id}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(d.user_id, false)}
                          disabled={actioningId === d.user_id}
                        >
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
                <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Users</CardTitle>
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
                        <div className="font-medium truncate">{p.full_name || p.email || p.id}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.email} {p.phone ? `• ${p.phone}` : ""}</div>
                      </div>
                      <Badge variant="outline">{p.role}</Badge>
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
