import { useCallback, useEffect, useState } from "react";
import { DollarSign, ArrowUpRight, TrendingUp, Clock, Loader2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BankDetailsForm from "@/components/driver/BankDetailsForm";

interface JobRow { id: string; driver_earnings: number; earnings_status: string; completed_at: string | null; }
interface PayoutRow { id: string; amount: number; status: string; created_at: string; }
interface BankRow { id: string; bank_name: string; account_last4: string; account_holder_name: string; }

const WalletScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bank, setBank] = useState<BankRow | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [amount, setAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: jobsData }, { data: payoutsData }, { data: bankData }] = await Promise.all([
      supabase.from("jobs").select("id, driver_earnings, earnings_status, completed_at").eq("driver_id", user.id),
      supabase.from("driver_payouts").select("id, amount, status, created_at").eq("driver_id", user.id).order("created_at", { ascending: false }),
      supabase.from("driver_bank_details").select("id, bank_name, account_last4, account_holder_name").eq("driver_id", user.id).maybeSingle(),
    ]);
    setJobs((jobsData ?? []) as JobRow[]);
    setPayouts((payoutsData ?? []) as PayoutRow[]);
    setBank((bankData ?? null) as BankRow | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const pendingEarnings = jobs.filter((j) => j.earnings_status === "pending").reduce((s, j) => s + Number(j.driver_earnings ?? 0), 0);
  const releasedEarnings = jobs.filter((j) => j.earnings_status === "released").reduce((s, j) => s + Number(j.driver_earnings ?? 0), 0);
  const reservedPayouts = payouts.filter((p) => ["pending", "processing", "paid"].includes(p.status)).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const available = Math.max(0, Math.round((releasedEarnings - reservedPayouts) * 100) / 100);

  const thisWeek = jobs.filter((j) => {
    if (!j.completed_at) return false;
    const dt = new Date(j.completed_at);
    const start = new Date(); start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0);
    return dt >= start;
  }).reduce((s, j) => s + Number(j.driver_earnings ?? 0), 0);

  const thisMonth = jobs.filter((j) => {
    if (!j.completed_at) return false;
    const dt = new Date(j.completed_at);
    return dt.getMonth() === new Date().getMonth() && dt.getFullYear() === new Date().getFullYear();
  }).reduce((s, j) => s + Number(j.driver_earnings ?? 0), 0);

  const handleWithdraw = async () => {
    if (!bank) {
      toast.error("Link a bank account first");
      setShowBankForm(true);
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > available) return toast.error(`Only $${available.toFixed(2)} available`);
    setWithdrawing(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("driver-withdraw", {
      headers: { Authorization: `Bearer ${token}` },
      body: { amount: amt },
    });
    setWithdrawing(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Withdraw failed");
    toast.success(`Withdrawal of $${amt.toFixed(2)} requested`);
    setShowWithdraw(false);
    setAmount("");
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-5 text-primary-foreground relative overflow-hidden">
        <p className="text-xs font-medium uppercase tracking-wider opacity-80">Available Balance</p>
        <p className="text-4xl font-bold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>${available.toFixed(2)}</p>
        {pendingEarnings > 0 && (
          <p className="text-xs mt-1 opacity-70 flex items-center gap-1">
            <Clock className="w-3 h-3" /> ${pendingEarnings.toFixed(2)} pending (in-progress jobs)
          </p>
        )}
        <div className="mt-4 flex gap-2">
          {bank ? (
            <Button
              onClick={() => { setAmount(available.toFixed(2)); setShowWithdraw(true); }}
              variant="secondary"
              disabled={available <= 0}
              className="rounded-xl h-10 px-5 font-semibold text-sm bg-white/20 hover:bg-white/30 text-primary-foreground border-0"
            >
              <ArrowUpRight className="w-4 h-4 mr-1.5" /> Withdraw
            </Button>
          ) : (
            <Button onClick={() => setShowBankForm(true)} variant="secondary" className="rounded-xl h-10 px-5 font-semibold text-sm bg-white/20 hover:bg-white/30 text-primary-foreground border-0">
              <Landmark className="w-4 h-4 mr-1.5" /> Link bank account
            </Button>
          )}
        </div>
        {bank && (
          <p className="text-[11px] mt-2 opacity-80">{bank.bank_name} ••{bank.account_last4}</p>
        )}
      </div>

      {showBankForm && (
        <BankDetailsForm onSaved={() => { setShowBankForm(false); load(); }} onCancel={() => setShowBankForm(false)} />
      )}

      {showWithdraw && (
        <div className="rounded-xl bg-card border p-4 space-y-3">
          <p className="text-sm font-medium">Request withdrawal to {bank?.bank_name} ••{bank?.account_last4}</p>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
          <p className="text-xs text-muted-foreground">Pending — processed within 1-3 business days</p>
          <div className="flex gap-2">
            <Button onClick={handleWithdraw} disabled={withdrawing} className="flex-1 rounded-xl h-11 font-semibold">
              {withdrawing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Request payout
            </Button>
            <Button variant="outline" className="rounded-xl h-11" onClick={() => setShowWithdraw(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-card border p-3 text-center">
          <DollarSign className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>${thisWeek.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">This Week</p>
        </div>
        <div className="rounded-xl bg-card border p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto text-[hsl(var(--swift-success))] mb-1" />
          <p className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>${thisMonth.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">This Month</p>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Withdrawals</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No withdrawals yet</p>
        ) : (
          <div className="rounded-xl bg-card border divide-y divide-border overflow-hidden">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full bg-[hsl(var(--swift-info))]/15 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-[hsl(var(--swift-info))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Withdrawal</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()} · {p.status}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  −${Number(p.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default WalletScreen;
