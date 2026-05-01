"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { CheckCircle, XCircle, TrendingUp, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminProfitsPage() {
  const [profits, setProfits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");

  useEffect(() => {
    loadProfits();

    const channel = supabase
      .channel("admin_profits_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profit_records",
        },
        () => loadProfits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus]);

  async function loadProfits() {
    setFetching(true);
    try {
      let query = supabase
        .from("profit_records")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user details
      const profitsWithUsers = await Promise.all(
        (data || []).map(async (profit) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", profit.user_id)
            .single();

          return {
            ...profit,
            user_name: profile?.full_name || profit.user_id,
            user_email: profile?.email || "N/A",
          };
        })
      );

      setProfits(profitsWithUsers);
    } catch (error: any) {
      console.error("Error loading profits:", error);
      toast.error("Failed to load profit records");
    } finally {
      setFetching(false);
    }
  }

  async function handleProfitAction(
    profitId: string,
    action: "approve" | "reject",
    reason?: string
  ) {
    setLoading(true);
    try {
      const { data: profit } = await supabase
        .from("profit_records")
        .select("*")
        .eq("id", profitId)
        .single();

      if (!profit) throw new Error("Profit record not found");

      if (action === "approve") {
        // Add profit to user balance
        const { data: balance } = await supabase
          .from("user_balances")
          .select("account_balance, balance, profit_balance")
          .eq("user_id", profit.user_id)
          .single();

        const currentAccount = Number(balance?.account_balance || balance?.balance || 0);
        const currentProfit = Number(balance?.profit_balance || 0);
        const profitAmount = Number(profit.profit_amount);

        const newAccountBalance = currentAccount + profitAmount;
        const newProfitBalance = currentProfit + profitAmount;

        await supabase
          .from("user_balances")
          .upsert({
            user_id: profit.user_id,
            account_balance: newAccountBalance,
            balance: newAccountBalance,
            profit_balance: newProfitBalance,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        // Create transaction record
        await supabase.from("transactions").insert({
          user_id: profit.user_id,
          type: "profit",
          amount: profitAmount,
          description: `Profit from ${profit.symbol} trade/investment (${Number(profit.profit_percentage).toFixed(2)}% gain)`,
        });

        // Update profit record
        await supabase
          .from("profit_records")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
          })
          .eq("id", profitId);

        toast.success("Profit approved and added to user balance");
      } else {
        // Reject profit
        await supabase
          .from("profit_records")
          .update({
            status: "rejected",
            rejection_reason: reason || "Profit rejected by admin",
            updated_at: new Date().toISOString(),
          })
          .eq("id", profitId);

        toast.success("Profit rejected");
      }

      loadProfits();
    } catch (error: any) {
      console.error("Error processing profit:", error);
      toast.error(error.message || "Failed to process profit");
    } finally {
      setLoading(false);
    }
  }

  const pendingCount = profits.filter((p) => p.status === "pending").length;
  const totalPendingProfit = profits
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.profit_amount), 0);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Profit Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Review and approve profit distributions
        </p>
        {totalPendingProfit > 0 && (
          <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm font-semibold text-yellow-600">
              Total Pending Profit: ${totalPendingProfit.toFixed(2)}
            </p>
          </div>
        )}
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
      ) : profits.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No profit records found
        </Card>
      ) : (
        <div className="space-y-4">
          {profits.map((profit) => (
            <Card key={profit.id} className="p-4 sm:p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-lg">
                      {profit.symbol} Profit
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        profit.status === "approved"
                          ? "bg-green-500/20 text-green-500"
                          : profit.status === "rejected"
                          ? "bg-red-500/20 text-red-500"
                          : "bg-yellow-500/20 text-yellow-500"
                      }`}
                    >
                      {profit.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    User: {profit.user_name} ({profit.user_email})
                  </p>
                  <div className="flex items-center gap-4 mb-2 flex-wrap">
                    <p className="text-2xl font-bold text-green-500">
                      +${Number(profit.profit_amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ({Number(profit.profit_percentage).toFixed(2)}% gain)
                    </p>
                  </div>
                  {profit.trade_id && (
                    <p className="text-xs text-muted-foreground mb-1">
                      Related Trade: {profit.trade_id.substring(0, 8)}...
                    </p>
                  )}
                  {profit.investment_id && (
                    <p className="text-xs text-muted-foreground mb-1">
                      Related Investment: {profit.investment_id.substring(0, 8)}...
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(profit.created_at).toLocaleString()}
                  </p>
                  {profit.rejection_reason && (
                    <p className="text-sm text-red-500 mt-2">
                      Reason: {profit.rejection_reason}
                    </p>
                  )}
                  {profit.approved_at && (
                    <p className="text-sm text-green-500 mt-2">
                      Approved: {new Date(profit.approved_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {profit.status === "pending" && (
                  <div className="flex flex-col gap-2">
                    <LoadingButton
                      onClick={() => handleProfitAction(profit.id, "approve")}
                      loading={loading}
                      className="text-sm bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Profit
                    </LoadingButton>
                    <Button
                      onClick={() => {
                        const reason = prompt("Enter rejection reason:");
                        if (reason) {
                          handleProfitAction(profit.id, "reject", reason);
                        }
                      }}
                      variant="destructive"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
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
