"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Building2, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminInvestmentsPage() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approvedShares, setApprovedShares] = useState("");

  useEffect(() => {
    loadInvestments();

    const channel = supabase
      .channel("admin_investments_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investment_requests",
        },
        () => loadInvestments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus]);

  async function loadInvestments() {
    setFetching(true);
    try {
      let query = supabase
        .from("investment_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user details
      const investmentsWithUsers = await Promise.all(
        (data || []).map(async (inv) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", inv.user_id)
            .single();

          return {
            ...inv,
            user_name: profile?.full_name || inv.user_id,
            user_email: profile?.email || "N/A",
          };
        })
      );

      setInvestments(investmentsWithUsers);
    } catch (error: any) {
      console.error("Error loading investments:", error);
      toast.error("Failed to load investments");
    } finally {
      setFetching(false);
    }
  }

  async function handleInvestmentAction(
    investmentId: string,
    action: "approve" | "reject",
    reason?: string
  ) {
    setLoading(true);
    try {
      const { data: investment } = await supabase
        .from("investment_requests")
        .select("*")
        .eq("id", investmentId)
        .single();

      if (!investment) throw new Error("Investment not found");

      if (action === "approve") {
        // Check balance
        const { data: balance } = await supabase
          .from("user_balances")
          .select("account_balance, balance")
          .eq("user_id", investment.user_id)
          .single();

        const currentBalance = Number(balance?.account_balance || balance?.balance || 0);
        const finalAmount = approvedAmount ? Number(approvedAmount) : Number(investment.investment_amount);
        const finalShares = approvedShares ? Number(approvedShares) : Number(investment.target_shares);

        if (currentBalance < finalAmount) {
          toast.error("User has insufficient balance");
          setLoading(false);
          return;
        }

        // Get current stock price
        const { data: stockData } = await supabase
          .from("market_data")
          .select("price")
          .eq("symbol", investment.symbol)
          .single();

        const currentPrice = stockData ? Number(stockData.price) : Number(investment.current_price);

        // Deduct from balance
        const newBalance = currentBalance - finalAmount;
        await supabase
          .from("user_balances")
          .upsert({
            user_id: investment.user_id,
            account_balance: newBalance,
            balance: newBalance,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        // Add to holdings (stocks)
        const { data: existingHolding } = await supabase
          .from("user_holdings")
          .select("*")
          .eq("user_id", investment.user_id)
          .eq("symbol", investment.symbol)
          .single();

        if (existingHolding) {
          const newAmount = Number(existingHolding.amount) + finalShares;
          const newAvgPrice =
            (Number(existingHolding.average_buy_price || 0) * Number(existingHolding.amount) +
              currentPrice * finalShares) /
            newAmount;

          await supabase
            .from("user_holdings")
            .update({
              amount: newAmount,
              average_buy_price: newAvgPrice,
              total_invested: Number(existingHolding.total_invested) + finalAmount,
              last_updated: new Date().toISOString(),
            })
            .eq("id", existingHolding.id);
        } else {
          await supabase.from("user_holdings").insert({
            user_id: investment.user_id,
            symbol: investment.symbol,
            amount: finalShares,
            average_buy_price: currentPrice,
            total_invested: finalAmount,
            last_updated: new Date().toISOString(),
          });
        }

        // Create transaction record
        await supabase.from("transactions").insert({
          user_id: investment.user_id,
          type: "investment",
          amount: -finalAmount,
          description: `Invested $${finalAmount.toFixed(2)} in ${investment.symbol} (${finalShares} shares)`,
        });

        // Update investment request
        await supabase
          .from("investment_requests")
          .update({
            status: "approved",
            approved_amount: finalAmount,
            approved_shares: finalShares,
            approved_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", investmentId);

        toast.success("Investment approved and processed");
      } else {
        // Reject investment
        await supabase
          .from("investment_requests")
          .update({
            status: "rejected",
            rejection_reason: reason || "Investment rejected by admin",
            updated_at: new Date().toISOString(),
          })
          .eq("id", investmentId);

        toast.success("Investment rejected");
      }

      setApprovingId(null);
      setApprovedAmount("");
      setApprovedShares("");
      loadInvestments();
    } catch (error: any) {
      console.error("Error processing investment:", error);
      toast.error(error.message || "Failed to process investment");
    } finally {
      setLoading(false);
    }
  }

  const pendingCount = investments.filter((i) => i.status === "pending").length;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Investment Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Review and approve stock investment requests
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
      ) : investments.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No investment requests found
        </Card>
      ) : (
        <div className="space-y-4">
          {investments.map((investment) => (
            <Card key={investment.id} className="p-4 sm:p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">
                      {investment.symbol} Investment
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        investment.status === "approved" || investment.status === "completed"
                          ? "bg-green-500/20 text-green-500"
                          : investment.status === "rejected"
                          ? "bg-red-500/20 text-red-500"
                          : "bg-yellow-500/20 text-yellow-500"
                      }`}
                    >
                      {investment.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    User: {investment.user_name} ({investment.user_email})
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    Requested: ${Number(investment.investment_amount).toFixed(2)} | 
                    Estimated Shares: {Number(investment.target_shares).toFixed(4)}
                  </p>
                  {investment.approved_amount && (
                    <p className="text-sm text-green-500 mb-1">
                      Approved: ${Number(investment.approved_amount).toFixed(2)} | 
                      Shares: {Number(investment.approved_shares).toFixed(4)}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mb-1">
                    Price at request: ${Number(investment.current_price).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(investment.created_at).toLocaleString()}
                  </p>
                  {investment.rejection_reason && (
                    <p className="text-sm text-red-500 mt-2">
                      Reason: {investment.rejection_reason}
                    </p>
                  )}
                </div>

                {investment.status === "pending" && (
                  <div className="flex flex-col gap-2">
                    {approvingId === investment.id ? (
                      <div className="space-y-2 p-3 bg-muted rounded">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Approved amount"
                          value={approvedAmount}
                          onChange={(e) => setApprovedAmount(e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="Approved shares"
                          value={approvedShares}
                          onChange={(e) => setApprovedShares(e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <LoadingButton
                            onClick={() => handleInvestmentAction(investment.id, "approve")}
                            loading={loading}
                            size="sm"
                          >
                            Confirm
                          </LoadingButton>
                          <Button
                            onClick={() => {
                              setApprovingId(null);
                              setApprovedAmount("");
                              setApprovedShares("");
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <LoadingButton
                          onClick={() => {
                            setApprovingId(investment.id);
                            setApprovedAmount(investment.investment_amount);
                            setApprovedShares(investment.target_shares);
                          }}
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
                              handleInvestmentAction(investment.id, "reject", reason);
                            }
                          }}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
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
