"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth";

export function HoldingsTable() {
  const { user } = useUser();
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchHoldings() {
      setLoading(true);
      // Get user holdings
      const { data: holdingsRaw } = await supabase
        .from("user_holdings")
        .select("symbol, quantity, avg_buy_price")
        .eq("user_id", user.id);
      // For each holding, fetch live price and compute values
      const computed = await Promise.all(
        (holdingsRaw || []).map(async (row: any) => {
          const { data: priceData } = await supabase
            .from("market_data")
            .select("price")
            .eq("symbol", row.symbol)
            .single();
          const currentPrice = priceData?.price || 0;
          const totalValue = row.quantity * currentPrice;
          const gain = (currentPrice - row.avg_buy_price) * row.quantity;
          const gainPercent = (row.avg_buy_price > 0)
            ? ((currentPrice - row.avg_buy_price) / row.avg_buy_price) * 100
            : 0;
          return {
            asset: row.symbol,
            symbol: row.symbol,
            quantity: row.quantity,
            avgCost: row.avg_buy_price,
            currentPrice,
            totalValue,
            gain,
            gainPercent,
            allocation: "-",
          };
        })
      );
      setHoldings(computed);
      setLoading(false);
    }
    fetchHoldings();
  }, [user]);

  if (loading) return <Card className="p-6">Loading your holdings...</Card>;
  if (holdings.length === 0)
    return <Card className="p-6">No holdings yet.</Card>;

  return (
    <Card className="border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Holdings</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Asset</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">Quantity</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">Avg Cost</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">Current Price</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">Total Value</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">Gain/Loss</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Allocation</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding, idx) => (
              <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4">
                  <div>
                    <p className="font-semibold text-foreground">{holding.asset}</p>
                    <p className="text-xs text-muted-foreground">{holding.symbol}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-foreground">{holding.quantity}</td>
                <td className="py-3 px-4 text-right text-foreground">${holding.avgCost.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-foreground">${holding.currentPrice.toLocaleString()}</td>
                <td className="py-3 px-4 text-right font-semibold text-foreground">
                  ${holding.totalValue.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right">
                  <div>
                    <p className={`font-semibold ${holding.gain >= 0 ? "text-green-500" : "text-red-500"}`}>
                      ${holding.gain.toLocaleString()}
                    </p>
                    <p className={`text-xs ${holding.gainPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {holding.gainPercent >= 0 ? "+" : ""}
                      {holding.gainPercent.toFixed(2)}%
                    </p>
                  </div>
                </td>
                <td className="py-3 px-4 text-foreground">{holding.allocation}</td>
                <td className="py-3 px-4">
                  <Button variant="outline" size="sm">
                    Trade
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
