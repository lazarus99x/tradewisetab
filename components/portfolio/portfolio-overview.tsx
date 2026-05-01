"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth";

export function PortfolioOverview() {
  const { user } = useUser();
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchStats() {
      setLoading(true);
      // Fetch holdings
      const { data: holdings } = await supabase
        .from("user_holdings")
        .select("symbol, quantity, avg_buy_price")
        .eq("user_id", user.id);
      let totalValue = 0, previousValue = 0;
      if (holdings && holdings.length) {
        for (const row of holdings) {
          const { data: priceData } = await supabase
            .from("market_data")
            .select("price, price_24h_ago")
            .eq("symbol", row.symbol)
            .single();
          const currentPrice = priceData?.price || 0;
          const prevPrice = priceData?.price_24h_ago || (priceData?.price || 0);
          totalValue += row.quantity * currentPrice;
          previousValue += row.quantity * prevPrice;
        }
      }
      const change = totalValue - previousValue;
      const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
      setStats([
        {
          label: "Total Portfolio Value",
          value: `$${totalValue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          change: `${change >= 0 ? "+" : "-"}$${Math.abs(change).toFixed(2)}`,
          changePercent: `${change >= 0 ? "+" : "-"}${Math.abs(changePercent).toFixed(2)}%`,
          isPositive: change >= 0,
        },
      ]);
      setLoading(false);
    }
    fetchStats();
  }, [user]);

  if (loading) return <Card className="p-6">Loading portfolio...</Card>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="border-border bg-card p-6">
          <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <div className="flex items-center gap-1 mt-2">
                {stat.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <p className={`text-xs font-medium ${stat.isPositive ? "text-green-500" : "text-red-500"}`}>
                  {stat.changePercent}
                </p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
