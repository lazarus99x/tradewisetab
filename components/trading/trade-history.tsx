"use client"

import { useState, useEffect } from "react";
import { useUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export function TradeHistory() {
  const { user } = useUser();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    loadTrades();

    const channel = supabase
      .channel("trade_history_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_trades",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadTrades()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function loadTrades() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error("Error loading trades:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading trades...</div>
    );
  }

  return (
    <Card className="border-border bg-card p-4">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Trades</h3>

      {trades.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No trades yet. Place your first order to see it here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    trade.trade_type === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {trade.trade_type}
                </span>
                <div>
                  <div className="font-medium">{trade.symbol}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(trade.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{Number(trade.amount).toFixed(4)}</div>
                <div className="text-sm text-muted-foreground">
                  ${Number(trade.price).toFixed(2)}
                </div>
                <div className="text-xs">
                  <span
                    className={`${
                      trade.status === "approved" || trade.status === "completed"
                        ? "text-green-500"
                        : trade.status === "rejected"
                        ? "text-red-500"
                        : "text-yellow-500"
                    }`}
                  >
                    {trade.status}
                  </span>
                </div>
                {trade.profit_loss !== undefined && trade.profit_loss !== 0 && (
                  <div className={`text-xs font-bold ${Number(trade.profit_loss) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Number(trade.profit_loss) > 0 ? '+' : ''}${Number(trade.profit_loss).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
