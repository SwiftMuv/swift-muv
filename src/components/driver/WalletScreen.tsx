import { useCallback, useEffect, useState } from "react";
import { DollarSign, ArrowUpRight, TrendingUp, Clock, Loader2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BankDetailsForm from "@/components/driver/BankDetailsForm";
import { useI18n } from "@/contexts/I18nContext";

interface JobRow { id: string; driver_earnings: number; earnings_status: string; completed_at: string | null; }
interface PayoutRow { id: string; amount: number; status: string; created_at: string; }
interface BankRow { id: string; bank_name: string; account_last4: string; account_holder_name: string; }

const WalletScreen = () => {
  const { user } = useAuth();
  const { t, formatCurrency, formatDate } = useI18n();
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
      toast.error(t("wallet.linkBankFirst"));
      setShowBankForm(true);
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error(t("wallet.enterValidAmount"));
    if (amt > available) return toast.error(t("wallet.onlyAvailable", { amount: formatCurrency(available) }));
    setWithdrawing(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("driver-withdraw", {
      headers: { Authorization: `Bearer ${token}` },
      body: { amount: amt },
    });
    setWithdrawing(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? t("wallet.withdrawFailed"));
    toast.success(t("wallet.withdrawRequested", { amount: formatCurrency(amt) }));
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
        <p className="text-xs font-medium uppercase tracking-wider opacity-80">{t("wallet.availableBalance")}</p>
        <p className="text-4xl font-bold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(available)}</p>
        {pendingEarnings > 0 && (
          <p className="text-xs mt-1 opacity-70 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {t("wallet.pending", { amount: formatCurrency(pendingEarnings) })}
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
              <ArrowUpRight className="w-4 h-4 mr-1.5" /> {t("wallet.withdraw")}
            </Button>
          ) : (
            <Button onClick={() => setShowBankForm(true)} variant="secondary" className="rounded-xl h-10 px-5 font-semibold text-sm bg-white/20 hover:bg-white/30 text-primary-foreground border-0">
              <ArrowUpRight className="w-4 h-4 mr-1.5" /> {t("wallet.withdraw")}
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
          <p className="text-sm font-medium">{t("wallet.requestWithdrawal", { bank: `${bank?.bank_name} ••${bank?.account_last4}` })}</p>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("wallet.amount")} />
          <p className="text-xs text-muted-foreground">{t("wallet.pendingProcessing")}</p>
          <div className="flex gap-2">
            <Button onClick={handleWithdraw} disabled={withdrawing} className="flex-1 rounded-xl h-11 font-semibold">
              {withdrawing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}{t("wallet.requestPayout")}
            </Button>
            <Button variant="outline" className="rounded-xl h-11" onClick={() => setShowWithdraw(false)}>{t("common.cancel")}</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-card border p-3 text-center">
          <DollarSign className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(thisWeek, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{t("driver.thisWeek")}</p>
        </div>
        <div className="rounded-xl bg-card border p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto text-[hsl(var(--swift-success))] mb-1" />
          <p className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(thisMonth, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{t("wallet.thisMonth")}</p>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t("wallet.withdrawals")}</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("wallet.noWithdrawals")}</p>
        ) : (
          <div className="rounded-xl bg-card border divide-y divide-border overflow-hidden">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full bg-[hsl(var(--swift-info))]/15 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-[hsl(var(--swift-info))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t("wallet.withdrawal")}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.created_at)} · {p.status}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  −{formatCurrency(Number(p.amount))}
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
