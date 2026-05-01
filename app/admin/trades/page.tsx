"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminTradesPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [editingTrade, setEditingTrade] = useState<string | null>(null);
  const [profitAmount, setProfitAmount] = useState("");
  const [profitPercentage, setProfitPercentage] = useState("");

  useEffect(() => {
    loadTrades();

    const channel = supabase
      .channel("admin_trades_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_trades",
        },
        () => loadTrades()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus]);

  async function loadTrades() {
    setFetching(true);
    try {
      let query = supabase
        .from("user_trades")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user details for each trade
      const tradesWithUsers = await Promise.all(
        (data || []).map(async (trade) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", trade.user_id)
            .single();

          return {
            ...trade,
            user_name: profile?.full_name || trade.user_id,
            user_email: profile?.email || "N/A",
          };
        })
      );

      setTrades(tradesWithUsers);
    } catch (error: any) {
      console.error("Error loading trades details:", JSON.stringify(error, null, 2), error);
      toast.error(error?.message || error?.details || "Failed to load trades");
    } finally {
      setFetching(false);
    }
  }

  async function handleAddProfitLoss(tradeId: string, userId: string, isLoss: boolean) {
    if (!profitAmount || isNaN(Number(profitAmount))) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setLoading(true);
    try {
      const amount = Number(profitAmount);
      const adjustment = isLoss ? -amount : amount;

      // Update trade profit_loss
      const { data: trade } = await supabase
        .from("user_trades")
        .select("profit_loss, invested_amount")
        .eq("id", tradeId)
        .single();
      
      const currentProfit = Number(trade?.profit_loss || 0);
      const newProfit = currentProfit + adjustment;

      await supabase
        .from("user_trades")
        .update({ profit_loss: newProfit })
        .eq("id", tradeId);

      // Update user balance
      const { data: balance } = await supabase
        .from("user_balances")
        .select("account_balance, balance, profit_balance")
        .eq("user_id", userId)
        .single();
        
      const currentBalance = Number(balance?.account_balance || balance?.balance || 0);
      const newBalance = currentBalance + adjustment;
      const currentProfitBalance = Number(balance?.profit_balance || 0);
      const newProfitBalance = currentProfitBalance + adjustment;

      await supabase
        .from("user_balances")
        .upsert({
          user_id: userId,
          account_balance: newBalance,
          balance: newBalance,
          profit_balance: newProfitBalance,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      // Record transaction
      await supabase.from("transactions").insert({
        user_id: userId,
        type: isLoss ? "loss" : "profit",
        amount: adjustment,
        description: `Admin added ${isLoss ? "loss" : "profit"} to trade`,
      });

      toast.success(`Successfully added ${isLoss ? "loss" : "profit"}`);
      setEditingTrade(null);
      setProfitAmount("");
      loadTrades();
    } catch (error: any) {
      console.error("Error updating profit/loss:", error);
      toast.error(error.message || "Failed to update profit/loss");
    } finally {
      setLoading(false);
    }
  }

  async function handleTradeAction(
    tradeId: string,
    action: "approve" | "reject",
    reason?: string
  ) {
    setLoading(true);
    try {
      const { data: trade } = await supabase
        .from("user_trades")
        .select("*")
        .eq("id", tradeId)
        .single();

      if (!trade) throw new Error("Trade not found");

      // Enhanced approval flow for bot session trades
      if (trade.status === "ready" && trade.risk_level) {
        const invested = Number(trade.invested_amount || 0);
        // Only allow rejection for HIGH risk
        if ((trade.risk_level === "LOW" || trade.risk_level === "NORMAL") && action === "reject") {
          toast.error("Low/Normal risk trades cannot be rejected");
          setLoading(false);
          return;
        }
        if (action === "approve") {
          // Credit profit to user
          const { data: balance } = await supabase
            .from("user_balances")
            .select("account_balance, balance, profit_balance")
            .eq("user_id", trade.user_id)
            .single();
          const profit = Number(trade.profit_loss);
          const curr = Number(balance?.account_balance || balance?.balance || 0);
          const currProfitBalance = Number(balance?.profit_balance || 0);
          await supabase
            .from("user_balances")
            .upsert({
              user_id: trade.user_id,
              account_balance: curr + profit,
              balance: curr + profit,
              profit_balance: currProfitBalance + profit,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
          // Update trade status
          await supabase
            .from("user_trades")
            .update({ status: "approved", executed_at: new Date().toISOString(), approved_at: new Date().toISOString() })
            .eq("id", tradeId);
          toast.success("Profit approved and paid to user.");
        } else if (action === "reject" && trade.risk_level === "HIGH") {
          // Set profit_loss to -invested_amount (full loss)
          await supabase
            .from("user_trades")
            .update({
              status: "rejected",
              profit_loss: -invested,
              rejection_reason: reason || "Rejected by admin (high risk session)",
              approved_at: new Date().toISOString(),
              executed_at: new Date().toISOString()
            })
            .eq("id", tradeId);
          toast.success("AI trade rejected: full loss applied.");
        }
        loadTrades();
        setLoading(false);
        setEditingTrade(null);
        return;
      }

      if (action === "approve") {
        // Check balance for buy orders
        if (trade.trade_type === "BUY") {
          const { data: balance } = await supabase
            .from("user_balances")
            .select("account_balance, balance")
            .eq("user_id", trade.user_id)
            .single();

          const currentBalance = Number(balance?.account_balance || balance?.balance || 0);
          const totalCost = Number(trade.total_value) * 1.001; // Including fee

          if (currentBalance < totalCost) {
            toast.error("User has insufficient balance");
            setLoading(false);
            return;
          }

          // Deduct from balance
          const newBalance = currentBalance - totalCost;
          await supabase
            .from("user_balances")
            .upsert({
              user_id: trade.user_id,
              account_balance: newBalance,
              balance: newBalance,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

          // Add to holdings
          const { data: existingHolding } = await supabase
            .from("user_holdings")
            .select("*")
            .eq("user_id", trade.user_id)
            .eq("symbol", trade.symbol)
            .single();

          if (existingHolding) {
            const newAmount = Number(existingHolding.amount) + Number(trade.amount);
            const newAvgPrice =
              (Number(existingHolding.average_buy_price || 0) * Number(existingHolding.amount) +
                Number(trade.price) * Number(trade.amount)) /
              newAmount;

            await supabase
              .from("user_holdings")
              .update({
                amount: newAmount,
                average_buy_price: newAvgPrice,
                total_invested: Number(existingHolding.total_invested) + Number(trade.total_value),
                last_updated: new Date().toISOString(),
              })
              .eq("id", existingHolding.id);
          } else {
            await supabase.from("user_holdings").insert({
              user_id: trade.user_id,
              symbol: trade.symbol,
              amount: trade.amount,
              average_buy_price: trade.price,
              total_invested: trade.total_value,
              last_updated: new Date().toISOString(),
            });
          }

          // Create transaction record
          await supabase.from("transactions").insert({
            user_id: trade.user_id,
            type: "trade",
            amount: -totalCost,
            description: `Buy ${trade.amount} ${trade.symbol} at $${trade.price}`,
          });

          toast.success("Trade approved and balance updated");
        } else {
          // SELL order - check holdings
          const { data: holding } = await supabase
            .from("user_holdings")
            .select("*")
            .eq("user_id", trade.user_id)
            .eq("symbol", trade.symbol)
            .single();

          if (!holding || Number(holding.amount) < Number(trade.amount)) {
            toast.error("User has insufficient holdings");
            setLoading(false);
            return;
          }

          // Update holdings
          const newAmount = Number(holding.amount) - Number(trade.amount);
          const sellValue = Number(trade.total_value) * 0.999; // After fee

          if (newAmount > 0) {
            await supabase
              .from("user_holdings")
              .update({
                amount: newAmount,
                last_updated: new Date().toISOString(),
              })
              .eq("id", holding.id);
          } else {
            await supabase.from("user_holdings").delete().eq("id", holding.id);
          }

          // Add to balance
          const { data: balance } = await supabase
            .from("user_balances")
            .select("account_balance, balance")
            .eq("user_id", trade.user_id)
            .single();

          const currentBalance = Number(balance?.account_balance || balance?.balance || 0);
          const newBalance = currentBalance + sellValue;

          await supabase
            .from("user_balances")
            .upsert({
              user_id: trade.user_id,
              account_balance: newBalance,
              balance: newBalance,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

          // Create transaction record
          await supabase.from("transactions").insert({
            user_id: trade.user_id,
            type: "trade",
            amount: sellValue,
            description: `Sell ${trade.amount} ${trade.symbol} at $${trade.price}`,
          });

          // Calculate profit/loss
          const profit = sellValue - (Number(holding.average_buy_price) * Number(trade.amount));
          
          if (profit > 0) {
            // Create profit record for admin approval
            await supabase.from("profit_records").insert({
              user_id: trade.user_id,
              trade_id: tradeId,
              symbol: trade.symbol,
              profit_amount: profit,
              profit_percentage: (profit / (Number(holding.average_buy_price) * Number(trade.amount))) * 100,
              status: "pending",
            });
          }

          toast.success("Sell order approved and balance updated");
        }

        // Update trade status
        await supabase
          .from("user_trades")
          .update({
            status: "approved",
            executed_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
          })
          .eq("id", tradeId);
      } else {
        // Reject trade
        await supabase
          .from("user_trades")
          .update({
            status: "rejected",
            rejection_reason: reason || "Trade rejected by admin",
            updated_at: new Date().toISOString(),
          })
          .eq("id", tradeId);

        toast.success("Trade rejected");
      }

      loadTrades();
    } catch (error: any) {
      console.error("Error processing trade:", error);
      toast.error(error.message || "Failed to process trade");
    } finally {
      setLoading(false);
      setEditingTrade(null);
      setProfitAmount("");
      setProfitPercentage("");
    }
  }

  const pendingCount = trades.filter((t) => t.status === "pending").length;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Trade Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Review and approve user trades
        </p>
      </div>

      <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {fetching ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : trades.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No trades found
        </Card>
      ) : (
        <div className="space-y-4">
          {trades.map((trade) => (
            <Card key={trade.id} className="p-4 sm:p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">
                      {trade.trade_type} {trade.amount} {trade.symbol}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        trade.status === "approved" || trade.status === "completed"
                          ? "bg-green-500/20 text-green-500"
                          : trade.status === "rejected"
                          ? "bg-red-500/20 text-red-500"
                          : "bg-yellow-500/20 text-yellow-500"
                      }`}
                    >
                      {trade.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    User: {trade.user_name} ({trade.user_email})
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    Price: ${Number(trade.price).toFixed(2)} | Total: ${Number(trade.total_value).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    Order Type: {trade.order_type}
                    {trade.limit_price && ` | Limit: $${Number(trade.limit_price).toFixed(2)}`}
                  </p>
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(trade.created_at).toLocaleString()}
                  </p>
                  {trade.rejection_reason && (
                    <p className="text-sm text-red-500 mt-2">
                      Reason: {trade.rejection_reason}
                    </p>
                  )}
                  {/* Risk block for AI trades */}
                  {trade.risk_level && (
                    <div className="text-sm mb-1 flex flex-wrap gap-2 items-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-white ${trade.risk_level === 'HIGH' ? 'bg-red-600' : trade.risk_level === 'NORMAL' ? 'bg-yellow-500' : 'bg-green-500'}`}>
                        {trade.risk_level} risk
                      </span>
                      <span>Invested: ${trade.invested_amount}</span>
                      <span>ROI: {trade.roi}%</span>
                      <span>Profit/Loss: <b className={Number(trade.profit_loss) < 0 ? 'text-red-500' : 'text-green-500'}>{Number(trade.profit_loss) >= 0 ? '+' : ''}{trade.profit_loss}</b></span>
                      {trade.admin_must_approve !== undefined && (
                        <span className="bg-gray-800 px-2 py-1 rounded text-xs ml-2">Approval control: {trade.admin_must_approve ? 'Admin must decide' : 'Auto-approve'}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Approve/Reject controls for bot session trades */}
                {trade.status === "ready" && trade.risk_level ? (
                  <div className="flex flex-col gap-2">
                    <LoadingButton
                      onClick={() => handleTradeAction(trade.id, "approve")}
                      loading={loading}
                      className="text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </LoadingButton>
                    {trade.risk_level === "HIGH" && (
                      <Button
                        onClick={() => {
                          const reason = prompt("Enter rejection reason:");
                          if (reason) {
                            handleTradeAction(trade.id, "reject", reason);
                          }
                        }}
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    )}
                  </div>
                ) : trade.status === "pending" ? (
                  <div className="flex flex-col gap-2">
                    <LoadingButton
                      onClick={() => handleTradeAction(trade.id, "approve")}
                      loading={loading}
                      className="text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </LoadingButton>
                    <Button
                      onClick={() => {
                        const reason = prompt("Enter rejection reason:");
                        if (reason) {
                          handleTradeAction(trade.id, "reject", reason);
                        }
                      }}
                      variant="destructive"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    {editingTrade === trade.id ? (
                      <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                        <Input
                          type="number"
                          placeholder="Amount ($)"
                          value={profitAmount}
                          onChange={(e) => setProfitAmount(e.target.value)}
                          className="h-8"
                        />
                        <div className="flex gap-2">
                          <LoadingButton
                            onClick={() => handleAddProfitLoss(trade.id, trade.user_id, false)}
                            loading={loading}
                            className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
                          >
                            Add Profit
                          </LoadingButton>
                          <LoadingButton
                            onClick={() => handleAddProfitLoss(trade.id, trade.user_id, true)}
                            loading={loading}
                            className="flex-1 bg-red-600 hover:bg-red-700 h-8 text-xs"
                          >
                            Add Loss
                          </LoadingButton>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-8 text-xs"
                          onClick={() => setEditingTrade(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => setEditingTrade(trade.id)} 
                        variant="outline" 
                        size="sm"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Manage Profit/Loss
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
