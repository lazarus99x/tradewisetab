"use client"

import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth";

export function AllocationChart() {
  const { user } = useUser();
  const [allocationData, setAllocationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchAllocation() {
      setLoading(true);
      const { data: holdings } = await supabase
        .from("user_holdings")
        .select("symbol, quantity")
        .eq("user_id", user.id);
      let assetClasses: Record<string, number> = {};
      let total = 0;
      for (const row of holdings || []) {
        const { data: priceData } = await supabase
          .from("market_data")
          .select("price, asset_class")
          .eq("symbol", row.symbol)
          .single();
        const value = row.quantity * (priceData?.price || 0);
        const assetClass = priceData?.asset_class || "Other";
        assetClasses[assetClass] = (assetClasses[assetClass] || 0) + value;
        total += value;
      }
      const chartData = Object.entries(assetClasses).map(([name, value]) => ({
        name,
        value: total > 0 ? Math.round((value / total) * 100) : 0,
        color: undefined,
      }));
      setAllocationData(chartData);
      setLoading(false);
    }
    fetchAllocation();
  }, [user]);

  if (loading) return <Card className="p-6">Loading allocation...</Card>;

  return (
    <Card className="border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Asset Allocation</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={allocationData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {allocationData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}
