"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { SimpleTradingChart } from "@/components/trading/simple-trading-chart";
import { SimpleOrderPanel } from "@/components/trading/simple-order-panel";
import { TradeHistory } from "@/components/trading/trade-history";
import { SimpleSignalsBot } from "@/components/ai/simple-signals-bot";
import { startMarketUpdater, generateSignals } from "@/lib/market-updater";
import { UserAnnouncements } from "./announcements";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  History,
} from "lucide-react";
import { ForexCandles } from "@/components/trading/forex-candles";
import { Watchlist } from "@/components/trading/watchlist";
import { SignalsList } from "@/components/ai/signals-list";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useUser();
  const [selectedAsset, setSelectedAsset] = useState("BTC/USD");
  const [assets, setAssets] = useState<any[]>([]);
  const [balances, setBalances] = useState({
    account_balance: 0,
    profit_balance: 0,
    trading_balance: 0,
    funding_balance: 0,
    total_balance: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Start market updater on mount
    const stopUpdater = startMarketUpdater(5000);
    
    // Generate signals every 30 seconds
    const signalInterval = setInterval(generateSignals, 30000);
    generateSignals(); // Initial generation

    // Load assets
    loadAssets();

    return () => {
      if (stopUpdater) stopUpdater();
      clearInterval(signalInterval);
    };
  }, []);

  async function loadAssets() {
    const { data } = await supabase
      .from("market_data")
      .select("symbol, price, change_24h, category")
      .order("category")
      .order("symbol");

    if (data) {
      setAssets(data);
      if (data.length > 0 && !data.find(a => a.symbol === selectedAsset)) {
        setSelectedAsset(data[0].symbol);
      }
    }
  }

  useEffect(() => {
    if (!user?.id) return;

    async function loadData() {
      try {
        setLoading(true);
        console.log("Loading data for user:", user!.id);

        // Load balance - try new schema first, fallback to old
        const { data: balanceData, error: balanceError } = await supabase
          .from("user_balances")
          .select("*")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (balanceError) {
          console.error("Error loading balance:", balanceError?.message || balanceError?.code || JSON.stringify(balanceError));
          toast.error(`Balance load error: ${balanceError?.message || balanceError?.code || "Unknown error"}`);
          // Still show zeros so dashboard is usable
        } else if (balanceData) {
          console.log("Found balance record:", balanceData);

          // Calculate balances dynamically from transactions if fields don't exist
          const { data: allTransactions } = await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user!.id);

          let accountBalance =
            balanceData.account_balance || balanceData.balance || 0;
          let profitBalance = balanceData.profit_balance || 0;
          let tradingBalance = balanceData.trading_balance || 0;
          let fundingBalance = balanceData.funding_balance || 0;

          // If new columns don't exist, calculate from transactions
          if (!balanceData.account_balance && allTransactions) {
            accountBalance = allTransactions
              .filter((tx) =>
                ["deposit", "loan_disbursal", "funding_approval"].includes(
                  tx.type
                )
              )
              .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

            profitBalance = allTransactions
              .filter((tx) => tx.type === "profit")
              .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

            tradingBalance = accountBalance;
            fundingBalance = allTransactions
              .filter((tx) =>
                ["deposit", "loan_disbursal", "funding_approval"].includes(
                  tx.type
                )
              )
              .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
          }

          const totalBalance = accountBalance + profitBalance;

          setBalances({
            account_balance: accountBalance,
            profit_balance: profitBalance,
            trading_balance: tradingBalance,
            funding_balance: fundingBalance,
            total_balance: totalBalance,
          });
        } else {
          console.log("No balance record found, creating one...");
          const { error: insertError } = await supabase
            .from("user_balances")
            .insert({
              user_id: user!.id,
              account_balance: 0,
              profit_balance: 0,
              trading_balance: 0,
              funding_balance: 0,
              balance: 0,
            });

          if (insertError) {
            // Log the real error details (Supabase errors have .message and .code)
            console.error(
              "Error creating balance record:",
              insertError?.message || insertError?.code || JSON.stringify(insertError)
            );
            // Non-fatal: show $0 balances so dashboard still loads
            console.warn("Balance record creation blocked (likely RLS). Dashboard will show $0. Run database/supabase.fix-clerk-rls.sql in Supabase to fix.");
          }
          // Always set zeros so the dashboard renders
          setBalances({
            account_balance: 0,
            profit_balance: 0,
            trading_balance: 0,
            funding_balance: 0,
            total_balance: 0,
          });
        }

        // Load recent transactions
        const { data: transactionData, error: transactionError } =
          await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user!.id)
            .order("created_at", { ascending: false })
            .limit(20);

        if (transactionError) {
          console.error("Error loading transactions:", transactionError?.message || transactionError?.code || JSON.stringify(transactionError));
          toast.error(`Transaction load error: ${transactionError?.message || transactionError?.code || "Unknown error"}`);
          // Non-fatal
        } else {
          console.log("Loaded transactions:", transactionData);
          setTransactions(transactionData ?? []);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        toast.error("Error loading dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Set up real-time subscription for balance updates
    const balanceSubscription = supabase
      .channel("balance-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_balances",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Balance updated:", payload);
          if (payload.new) {
            const newData = payload.new as any;
            setBalances({
              account_balance: newData.account_balance || newData.balance || 0,
              profit_balance: newData.profit_balance || 0,
              trading_balance:
                newData.trading_balance ||
                newData.account_balance ||
                newData.balance ||
                0,
              funding_balance: newData.funding_balance || 0,
              total_balance:
                (newData.account_balance || newData.balance || 0) +
                (newData.profit_balance || 0),
            });
            toast.success("Balance updated!");
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for transaction updates
    const transactionSubscription = supabase
      .channel("transaction-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New transaction:", payload);
          if (payload.new) {
            setTransactions((prev) => [payload.new, ...prev.slice(0, 19)]);
            toast.success("New transaction recorded!");
            // Reload balances to recalculate
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      balanceSubscription.unsubscribe();
      transactionSubscription.unsubscribe();
    };
  }, [user?.id]);

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return "$0.00";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
      case "loan_disbursal":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case "withdrawal":
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      case "profit":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case "loss":
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      case "funding_approval":
        return <CreditCard className="w-5 h-5 text-blue-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: "Deposit",
      withdrawal: "Withdrawal",
      profit: "Profit",
      loss: "Loss",
      loan_disbursal: "Loan Disbursal",
      funding_approval: "Funding Approved",
    };
    return (
      labels[type] ||
      type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-6">
            <UserAnnouncements />

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Account Balance
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {loading ? (
                        <span className="inline-block w-24 h-7 bg-muted animate-pulse rounded" />
                      ) : (
                        formatCurrency(balances.account_balance)
                      )}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500" />
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Profit Balance
                    </p>
                    <p className="text-2xl font-bold text-green-500 mt-1">
                      {loading ? (
                        <span className="inline-block w-24 h-7 bg-muted animate-pulse rounded" />
                      ) : (
                        formatCurrency(balances.profit_balance)
                      )}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Trading Balance
                    </p>
                    <p className="text-2xl font-bold text-purple-500 mt-1">
                      {loading ? (
                        <span className="inline-block w-24 h-7 bg-muted animate-pulse rounded" />
                      ) : (
                        formatCurrency(balances.trading_balance)
                      )}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-purple-500" />
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Funding Balance
                    </p>
                    <p className="text-2xl font-bold text-cyan-500 mt-1">
                      {loading ? (
                        <span className="inline-block w-24 h-7 bg-muted animate-pulse rounded" />
                      ) : (
                        formatCurrency(balances.funding_balance)
                      )}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-cyan-500" />
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-[#00FE01]/10 to-[#00FE01]/20 border-[#00FE01]/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Balance
                    </p>
                    <p className="text-2xl font-bold text-[#00FE01] mt-1">
                      {loading ? (
                        <span className="inline-block w-24 h-7 bg-muted animate-pulse rounded" />
                      ) : (
                        formatCurrency(balances.total_balance)
                      )}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-[#00FE01]" />
                </div>
              </Card>
            </div>

            {/* CTA: GET FUNDED */}
            <div className="mb-2">
              <Link href="/dashboard/funding" className="block w-full max-w-xs">
                <span
                  className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl text-sm font-extrabold tracking-wide text-black shadow-lg
                  bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400
                  animate-[shimmer_2.2s_infinite]
                  [background-size:200%_100%]
                  hover:from-yellow-300 hover:via-amber-400 hover:to-yellow-500 transition-transform active:scale-[0.99]"
                  style={{
                    backgroundImage:
                      "linear-gradient(110deg, #FDE68A 8%, #FBBF24 18%, #FDE68A 33%)",
                    backgroundSize: "200% 100%",
                  }}
                >
                  GET FUNDED
                </span>
              </Link>
            </div>

            {/* Asset Selector */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-3">Select Asset</h2>
              <div className="max-w-sm">
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full bg-background border border-border rounded p-2 text-sm"
                >
                  {assets.map((a) => (
                    <option key={a.symbol} value={a.symbol}>
                      {a.symbol} — ${Number(a.price).toFixed(2)} ({Number(a.change_24h||0).toFixed(2)}%)
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-2 space-y-4">
                <SimpleTradingChart asset={selectedAsset} />
                {/* Forex live candlesticks */}
                <ForexCandles symbol={"EUR/USD"} />
                <div className="mt-4">
                  <SimpleSignalsBot />
                  <div className="mt-3"><SignalsList /></div>
                </div>
              </div>

              {/* Order Panel */}
              <div className="space-y-4">
                <SimpleOrderPanel asset={selectedAsset} />
                <Watchlist />
              </div>
            </div>

            {/* Trade History */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-3">Recent Trades</h2>
              <TradeHistory />
            </Card>

            {/* Transaction History - Full Width and Prominent */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6 text-[#00FE01]" />
                  <h2 className="text-2xl font-bold">Transaction History</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {transactions.length} transactions
                </span>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 animate-spin" />
                    <p className="text-lg">Loading transactions...</p>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 border-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-2 rounded-lg bg-muted">
                            {getTransactionIcon(tx.type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-base">
                              {getTransactionTypeLabel(tx.type)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {tx.description || "No description available"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(tx.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xl font-bold ${
                              tx.type === "deposit" ||
                              tx.type === "loan_disbursal" ||
                              tx.type === "profit" ||
                              tx.type === "funding_approval"
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
                            {tx.type === "deposit" ||
                            tx.type === "loan_disbursal" ||
                            tx.type === "profit" ||
                            tx.type === "funding_approval"
                              ? "+"
                              : "-"}
                            {formatCurrency(tx.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No transactions yet</p>
                    <p className="text-sm">
                      Your transaction history will appear here
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
