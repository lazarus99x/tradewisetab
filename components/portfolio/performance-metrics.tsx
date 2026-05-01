"use client"

import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth";

export function PerformanceMetrics() {
  const { user } = useUser();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchMetrics() {
      setLoading(true);
      // Fetch trade history
      const { data: trades } = await supabase
        .from("user_trades")
        .select("profit_loss, status, created_at")
        .eq("user_id", user.id)
        .eq("status", "approved");
      let totalReturn = 0, win = 0, total = 0, ytdReturn = 0;
      const currYear = new Date().getFullYear();
      (trades || []).forEach((t: any) => {
        totalReturn += t.profit_loss ?? 0;
        total++;
        if ((t.profit_loss ?? 0) > 0) win++;
        const year = t.created_at ? new Date(t.created_at).getFullYear() : null;
        if (year === currYear) ytdReturn += t.profit_loss ?? 0;
      });
      const winRate = total ? (win / total) * 100 : 0;
      setMetrics([
        {
          category: "Returns",
          items: [
            { label: "Total Return", value: `$${totalReturn.toFixed(2)}`, color: totalReturn >= 0 ? "text-green-500" : "text-red-500" },
            { label: "YTD Return", value: `$${ytdReturn.toFixed(2)} (${currYear})`, color: ytdReturn >= 0 ? "text-green-500" : "text-red-500" }
          ],
        },
        {
          category: "Activity",
          items: [
            { label: "Total Trades", value: total.toString(), color: "text-foreground" },
            { label: "Win Rate", value: winRate.toFixed(2) + "%", color: winRate >= 50 ? "text-green-500" : "text-red-500" },
          ],
        },
      ]);
      setLoading(false);
    }
    fetchMetrics();
  }, [user]);

  if (loading) return <Card className="p-6">Loading metrics...</Card>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="border-border bg-card p-6">
          <h4 className="text-lg font-semibold text-foreground mb-4">{metric.category}</h4>
          <div className="space-y-3">
            {metric.items.map((item, itemIndex) => (
              <div key={itemIndex} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
