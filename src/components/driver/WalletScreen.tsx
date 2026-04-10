import { DollarSign, ArrowUpRight, ArrowDownLeft, TrendingUp, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PayoutEntry {
  id: string;
  date: string;
  amount: number;
  type: "payout" | "earning";
  label: string;
  status: "completed" | "pending";
}

const mockPayouts: PayoutEntry[] = [
  { id: "1", date: "Today, 2:15 PM", amount: 185, type: "earning", label: "Job SG-4821 · Marie Dupont", status: "completed" },
  { id: "2", date: "Today, 11:30 AM", amount: 75, type: "earning", label: "Job SG-4818 · Leo Martin", status: "completed" },
  { id: "3", date: "Today, 9:00 AM", amount: 225, type: "earning", label: "Job SG-4815 · Sara Nguyen", status: "completed" },
  { id: "4", date: "Yesterday", amount: 450, type: "payout", label: "Withdrawal to ••4829", status: "completed" },
  { id: "5", date: "Yesterday", amount: 320, type: "earning", label: "Job SG-4810 · Aisha Khan", status: "completed" },
  { id: "6", date: "Yesterday", amount: 150, type: "earning", label: "Job SG-4808 · Paul Tremblay", status: "completed" },
  { id: "7", date: "Jun 8", amount: 600, type: "payout", label: "Withdrawal to ••4829", status: "completed" },
  { id: "8", date: "Jun 8", amount: 95, type: "earning", label: "Job SG-4801 · Kim Lee", status: "completed" },
];

const WalletScreen = () => {
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  const walletBalance = 1035;
  const pendingEarnings = 0;
  const thisWeekEarnings = 2340;
  const thisMonthEarnings = 8450;
  const platformFees = 845;

  return (
    <div className="space-y-5">
      {/* Balance Card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-5 text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-6 -translate-x-6" />
        <p className="text-xs font-medium uppercase tracking-wider opacity-80">Available Balance</p>
        <p className="text-4xl font-bold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          ${walletBalance.toLocaleString()}
          <span className="text-lg opacity-70">.00</span>
        </p>
        {pendingEarnings > 0 && (
          <p className="text-xs mt-1 opacity-70 flex items-center gap-1">
            <Clock className="w-3 h-3" /> ${pendingEarnings} pending
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => setShowWithdrawConfirm(!showWithdrawConfirm)}
            variant="secondary"
            className="rounded-xl h-10 px-5 font-semibold text-sm bg-white/20 hover:bg-white/30 text-primary-foreground border-0 backdrop-blur-sm"
          >
            <ArrowUpRight className="w-4 h-4 mr-1.5" />
            Withdraw
          </Button>
          <Button
            variant="secondary"
            className="rounded-xl h-10 px-5 font-semibold text-sm bg-white/10 hover:bg-white/20 text-primary-foreground border-0 backdrop-blur-sm"
          >
            <CreditCard className="w-4 h-4 mr-1.5" />
            Debit Card
          </Button>
        </div>
      </div>

      {/* Withdraw Confirmation */}
      {showWithdrawConfirm && (
        <div className="rounded-xl bg-card border p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-medium">Withdraw to Debit Card ••4829</p>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Amount</span>
            <span className="font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ${walletBalance.toLocaleString()}.00
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Instant transfer · Arrives in minutes</p>
          <div className="flex gap-2">
            <Button
              className="flex-1 rounded-xl h-11 font-semibold bg-primary hover:bg-primary/90"
              onClick={() => setShowWithdrawConfirm(false)}
            >
              Confirm Withdrawal
            </Button>
            <Button
              variant="outline"
              className="rounded-xl h-11"
              onClick={() => setShowWithdrawConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Earnings Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card border p-3 text-center">
          <DollarSign className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            ${thisWeekEarnings.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">This Week</p>
        </div>
        <div className="rounded-xl bg-card border p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto text-[hsl(var(--swift-success))] mb-1" />
          <p className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            ${thisMonthEarnings.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">This Month</p>
        </div>
        <div className="rounded-xl bg-card border p-3 text-center">
          <ArrowDownLeft className="w-4 h-4 mx-auto text-[hsl(var(--swift-warning))] mb-1" />
          <p className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            ${platformFees.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Fees</p>
        </div>
      </div>

      {/* Transaction History */}
      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Recent Activity
        </h2>
        <div className="rounded-xl bg-card border divide-y divide-border overflow-hidden">
          {mockPayouts.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 p-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  entry.type === "earning"
                    ? "bg-[hsl(var(--swift-success))]/15"
                    : "bg-[hsl(var(--swift-info))]/15"
                }`}
              >
                {entry.type === "earning" ? (
                  <ArrowDownLeft className="w-4 h-4 text-[hsl(var(--swift-success))]" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-[hsl(var(--swift-info))]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.label}</p>
                <p className="text-xs text-muted-foreground">{entry.date}</p>
              </div>
              <p
                className={`text-sm font-semibold tabular-nums ${
                  entry.type === "earning" ? "text-[hsl(var(--swift-success))]" : "text-foreground"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {entry.type === "earning" ? "+" : "−"}${entry.amount}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default WalletScreen;
