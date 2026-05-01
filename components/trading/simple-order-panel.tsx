"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { Copy, TrendingUp, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface SimpleOrderPanelProps {
  asset: string;
}

export function SimpleOrderPanel({ asset }: SimpleOrderPanelProps) {
  const { user } = useUser();
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showFundDialog, setShowFundDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user?.id || !asset) return;

    loadData();

    // Subscribe to price and balance updates
    const channel = supabase
      .channel("order-panel-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "market_data",
          filter: `symbol=eq.${asset}`,
        },
        (payload) => {
          const data = payload.new as any;
          setPrice(Number(data.price || 0));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_balances",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadBalance()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, asset]);

  async function loadData() {
    if (!user?.id) return;

    // Load price
    const { data: marketData } = await supabase
      .from("market_data")
      .select("price")
      .eq("symbol", asset)
      .single();

    if (marketData) {
      setPrice(Number(marketData.price || 0));
    }

    // Load balance
    await loadBalance();
  }

  async function loadBalance() {
    if (!user?.id) return;
    const { data } = await supabase
      .from("user_balances")
      .select("account_balance, balance")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setBalance(Number(data.account_balance || data.balance || 0));
    }
  }

  async function placeOrder(type: "BUY" | "SELL") {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }

    const usdAmount = Number(amount);
    if (!usdAmount || usdAmount <= 0) {
      toast.error("Enter a valid USD amount");
      return;
    }
    
    if (price <= 0) {
      toast.error("Waiting for price data...");
      return;
    }

    const cryptoAmount = usdAmount / price;
    const totalCost = usdAmount * 1.001; // Including fee based on USD

    if (type === "BUY" && totalCost > balance) {
      setShowFundDialog(true);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("user_trades").insert({
        user_id: user.id,
        symbol: asset,
        trade_type: type,
        amount: cryptoAmount, // Save actual crypto units here
        price: price,
        total_value: usdAmount, // Total USD invested
        order_type: "MARKET",
        status: "pending",
      });

      if (error) throw error;

      toast.success(`${type} order submitted! Awaiting approval.`);
      setAmount("");
    } catch (error: any) {
      console.error("Error placing order details:", JSON.stringify(error, null, 2), error);
      toast.error(error?.message || error?.details || "Failed to place order. Check console.");
    } finally {
      setLoading(false);
    }
  }

  const totalCost = Number(amount) * 1.001;
  const cryptoAmountPreview = price > 0 && amount ? (Number(amount) / price).toFixed(8) : "0.00";

  return (
    <>
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Place Order</h3>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Investment Amount (USD)</label>
          <Input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100.00"
            className="text-lg"
          />
        </div>

        <div className="bg-muted/50 p-3 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Price:</span>
            <span className="font-semibold">${price.toFixed(2)}</span>
          </div>
          {amount && Number(amount) > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span>Receiving ({asset.split('/')[0]}):</span>
                <span className="font-semibold">{cryptoAmountPreview}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Fee (0.1%):</span>
                <span className="font-semibold">${(Number(amount) * 0.001).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <LoadingButton
            onClick={() => placeOrder("BUY")}
            loading={loading}
            disabled={!amount || Number(amount) <= 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Trade
          </LoadingButton>
          <LoadingButton
            onClick={() => placeOrder("SELL")}
            loading={loading}
            disabled={!amount || Number(amount) <= 0}
            className="bg-red-600 hover:bg-red-700"
          >
            Sell
          </LoadingButton>
        </div>

          <div className="pt-3 border-t text-xs text-muted-foreground">
            Balance: ${balance.toFixed(2)}
          </div>
        </div>
      </Card>

      {showFundDialog && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6 bg-background shadow-xl border-border animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Insufficient Balance</h3>
              <p className="text-sm text-muted-foreground">
                You don't have enough funds to complete this trade. Please deposit or get funded.
              </p>
              <div className="flex flex-col sm:flex-row w-full gap-3 pt-2">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => router.push("/dashboard/deposit")}
                >
                  Deposit
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push("/dashboard/funding")}
                >
                  Get Funded
                </Button>
              </div>
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground mt-2"
                onClick={() => setShowFundDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
