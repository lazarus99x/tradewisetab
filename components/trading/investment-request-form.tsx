"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { TrendingUp, Wallet, Building2 } from "lucide-react";

export function InvestmentRequestForm() {
  const { user } = useUser();
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [selectedStock, setSelectedStock] = useState("");
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadData() {
      // Load stocks
      const { data: stockData } = await supabase
        .from("market_data")
        .select("symbol, price")
        .eq("category", "stock")
        .order("symbol");

      if (stockData) {
        setStocks(stockData);
        if (stockData.length > 0 && !selectedStock) {
          setSelectedStock(stockData[0].symbol);
          setCurrentPrice(Number(stockData[0].price));
        }
      }

      // Load balance
      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("account_balance, balance")
        .eq("user_id", user.id)
        .single();

      if (balanceData) {
        setAvailableBalance(Number(balanceData.account_balance || balanceData.balance || 0));
      }
    }

    loadData();

    // Subscribe to price updates
    const channel = supabase
      .channel("investment-stock-prices")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "market_data",
          filter: "category=eq.stock",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedStock]);

  useEffect(() => {
    // Update current price when stock changes
    const stock = stocks.find((s) => s.symbol === selectedStock);
    if (stock) {
      setCurrentPrice(Number(stock.price));
    }
  }, [selectedStock, stocks]);

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }

    const amount = Number(investmentAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid investment amount");
      return;
    }

    if (amount > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!selectedStock) {
      toast.error("Please select a stock");
      return;
    }

    setLoading(true);

    try {
      const targetShares = amount / currentPrice;

      const { error } = await supabase.from("investment_requests").insert({
        user_id: user.id,
        symbol: selectedStock,
        investment_amount: amount,
        target_shares: targetShares,
        current_price: currentPrice,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Investment request submitted! Awaiting admin approval.");
      setInvestmentAmount("");

      // Refresh balance
      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("account_balance, balance")
        .eq("user_id", user.id)
        .single();

      if (balanceData) {
        setAvailableBalance(Number(balanceData.account_balance || balanceData.balance || 0));
      }
    } catch (error: any) {
      console.error("Error submitting investment:", error);
      toast.error(error.message || "Failed to submit investment request");
    } finally {
      setLoading(false);
    }
  };

  const estimatedShares = investmentAmount && currentPrice > 0
    ? (Number(investmentAmount) / currentPrice).toFixed(4)
    : "0";

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Invest in Stocks</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Stock</label>
          <select
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md"
          >
            <option value="">Choose a stock...</option>
            {stocks.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol} - ${Number(stock.price).toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {selectedStock && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Current Price:</span>
              <span className="font-semibold">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-2 block">Investment Amount (USD)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            max={availableBalance}
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(e.target.value)}
            placeholder="0.00"
            className="text-lg"
          />
          <button
            onClick={() => setInvestmentAmount(availableBalance.toString())}
            className="text-xs text-primary mt-1 hover:underline"
          >
            Use Max: ${availableBalance.toFixed(2)}
          </button>
        </div>

        {investmentAmount && Number(investmentAmount) > 0 && selectedStock && (
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated Shares:</span>
              <span className="font-semibold">{estimatedShares}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Investment Amount:</span>
              <span className="font-semibold">
                ${Number(investmentAmount).toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                ⚠️ Final share count and price will be determined upon admin approval
              </p>
            </div>
          </div>
        )}

        <LoadingButton
          onClick={handleSubmit}
          loading={loading}
          className="w-full"
          disabled={!investmentAmount || !selectedStock || Number(investmentAmount) <= 0}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Submit Investment Request
        </LoadingButton>

        <div className="pt-4 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Available Balance:</span>
            <span className="text-foreground font-semibold">
              ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
