"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface LiveOrderPanelProps {
  asset: string;
}

export function LiveOrderPanel({ asset }: LiveOrderPanelProps) {
  const { user } = useUser();
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [usdValue, setUsdValue] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [orderTypeSelection, setOrderTypeSelection] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [showFundDialog, setShowFundDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!asset || !user?.id) return;

    async function loadData() {
      // Load current price
      const { data: marketData } = await supabase
        .from("market_data")
        .select("price")
        .eq("symbol", asset)
        .single();

      if (marketData) {
        setCurrentPrice(Number(marketData.price));
      }

      // Load user balance
      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("account_balance, balance")
        .eq("user_id", user.id)
        .single();

      if (balanceData) {
        setAvailableBalance(Number(balanceData.account_balance || balanceData.balance || 0));
      }

      // Load holdings for sell orders
      if (orderType === "sell") {
        const { data: holdings } = await supabase
          .from("user_holdings")
          .select("amount")
          .eq("user_id", user.id)
          .eq("symbol", asset)
          .single();

        if (holdings && Number(holdings.amount) > 0) {
          // Pre-fill with available amount
          const availableAmount = Number(holdings.amount);
          setAmount(availableAmount.toString());
          setUsdValue((availableAmount * currentPrice).toFixed(2));
        }
      }
    }

    loadData();

    // Subscribe to price updates
    const channel = supabase
      .channel(`${asset}-order-price`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "market_data",
          filter: `symbol=eq.${asset}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setCurrentPrice(Number(newData.price));
          if (amount && orderType === "buy") {
            setUsdValue((Number(amount) * Number(newData.price)).toFixed(2));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [asset, user?.id, orderType]);

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (value && currentPrice > 0) {
      setUsdValue((Number(value) * currentPrice).toFixed(2));
    } else {
      setUsdValue("");
    }
  };

  const handleUsdValueChange = (value: string) => {
    setUsdValue(value);
    if (value && currentPrice > 0) {
      setAmount((Number(value) / currentPrice).toFixed(8));
    } else {
      setAmount("");
    }
  };

  const handlePlaceOrder = async () => {
    if (!user?.id) {
      toast.error("Please sign in to place orders");
      return;
    }

    const tradeAmount = Number(amount);
    const tradeValue = Number(usdValue);
    const orderPrice = orderTypeSelection === "limit" && limitPrice ? Number(limitPrice) : currentPrice;

    if (!tradeAmount || tradeAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (orderType === "buy" && tradeValue > availableBalance) {
      setShowFundDialog(true);
      return;
    }

    if (orderType === "sell") {
      // Check holdings
      const { data: holdings } = await supabase
        .from("user_holdings")
        .select("amount")
        .eq("user_id", user.id)
        .eq("symbol", asset)
        .single();

      if (!holdings || Number(holdings.amount) < tradeAmount) {
        toast.error("Insufficient holdings");
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("user_trades").insert({
        user_id: user.id,
        symbol: asset,
        trade_type: orderType.toUpperCase(),
        amount: tradeAmount,
        price: orderPrice,
        total_value: tradeValue,
        order_type: orderTypeSelection === "limit" ? "LIMIT" : "MARKET",
        limit_price: orderTypeSelection === "limit" && limitPrice ? Number(limitPrice) : null,
        status: "pending",
      });

      if (error) throw error;

      toast.success(`${orderType === "buy" ? "Trade" : "Sell"} order submitted! Awaiting admin approval.`);
      
      // Reset form
      setAmount("");
      setUsdValue("");
      setLimitPrice("");
      
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
      console.error("Error placing order:", error);
      toast.error(error.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const maxBuyAmount = availableBalance / currentPrice;

  return (
    <>
      <Card className="border-border bg-card p-4 sm:p-6 sticky top-4 max-h-[700px] overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Place Order</h3>
      </div>

      <Tabs defaultValue="buy" onValueChange={(v) => setOrderType(v as "buy" | "sell")}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="buy" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trade
          </TabsTrigger>
          <TabsTrigger value="sell" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            <TrendingDown className="w-4 h-4 mr-2" />
            Sell
          </TabsTrigger>
        </TabsList>

        <div className="mb-4">
          <div className="flex gap-2">
            <Button
              variant={orderTypeSelection === "market" ? "default" : "outline"}
              size="sm"
              onClick={() => setOrderTypeSelection("market")}
              className="flex-1"
            >
              Market
            </Button>
            <Button
              variant={orderTypeSelection === "limit" ? "default" : "outline"}
              size="sm"
              onClick={() => setOrderTypeSelection("limit")}
              className="flex-1"
            >
              Limit
            </Button>
          </div>
        </div>

        <TabsContent value="buy" className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Amount ({asset.split('/')[0]})
            </label>
            <Input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="bg-background border-border text-lg"
            />
            <button
              onClick={() => setAmount(maxBuyAmount.toFixed(8))}
              className="text-xs text-primary mt-1 hover:underline"
            >
              Max: {maxBuyAmount.toFixed(8)}
            </button>
          </div>

          {orderTypeSelection === "limit" && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Limit Price (USD)
              </label>
              <Input
                type="number"
                step="any"
                placeholder={currentPrice.toFixed(2)}
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Total Value (USD)
            </label>
            <Input
              type="number"
              step="any"
              placeholder="0.00"
              value={usdValue}
              onChange={(e) => handleUsdValueChange(e.target.value)}
              className="bg-background border-border text-lg"
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Price:</span>
              <span className="text-foreground font-semibold">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
              </span>
            </div>
            {usdValue && Number(usdValue) > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Total:</span>
                  <span className="text-foreground font-semibold">
                    ${Number(usdValue).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee (0.1%):</span>
                  <span className="text-foreground font-semibold">
                    ${(Number(usdValue) * 0.001).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">Total Cost:</span>
                  <span className="text-foreground font-bold">
                    ${(Number(usdValue) * 1.001).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          <LoadingButton
            onClick={handlePlaceOrder}
            loading={loading}
            className={`w-full ${orderType === "buy" ? "bg-green-600 hover:bg-green-700" : ""} text-white`}
            disabled={!amount || !usdValue || Number(usdValue) <= 0 || (orderTypeSelection === "limit" && !limitPrice)}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Place Trade Order
          </LoadingButton>
        </TabsContent>

        <TabsContent value="sell" className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Amount ({asset.split('/')[0]})
            </label>
            <Input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="bg-background border-border text-lg"
            />
          </div>

          {orderTypeSelection === "limit" && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Limit Price (USD)
              </label>
              <Input
                type="number"
                step="any"
                placeholder={currentPrice.toFixed(2)}
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Total Value (USD)
            </label>
            <Input
              type="number"
              step="any"
              placeholder="0.00"
              value={usdValue}
              onChange={(e) => handleUsdValueChange(e.target.value)}
              className="bg-background border-border text-lg"
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Price:</span>
              <span className="text-foreground font-semibold">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
              </span>
            </div>
            {usdValue && Number(usdValue) > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Total:</span>
                  <span className="text-foreground font-semibold">
                    ${Number(usdValue).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee (0.1%):</span>
                  <span className="text-foreground font-semibold">
                    ${(Number(usdValue) * 0.001).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">You'll Receive:</span>
                  <span className="text-foreground font-bold text-green-500">
                    ${(Number(usdValue) * 0.999).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          <LoadingButton
            onClick={handlePlaceOrder}
            loading={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            disabled={!amount || !usdValue || Number(usdValue) <= 0 || (orderTypeSelection === "limit" && !limitPrice)}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Place Sell Order
          </LoadingButton>
        </TabsContent>
      </Tabs>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-2">
          <div className="flex justify-between">
            <span>Available Balance:</span>
            <span className="text-foreground font-semibold">
              ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Maker Fee:</span>
            <span>0.10%</span>
          </div>
          <div className="flex justify-between">
            <span>Taker Fee:</span>
            <span>0.10%</span>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            ⚠️ All orders require admin approval before execution
          </p>
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
