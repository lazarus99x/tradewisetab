"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useUser } from "@/lib/auth";
import { toast } from "sonner";

export function SignalsList() {
  const { user } = useUser();
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSignals();
    const ch = supabase
      .channel("signals-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trading_signals" },
        () => loadSignals()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function loadSignals() {
    const { data } = await supabase
      .from("trading_signals")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(10);
    setSignals(data || []);
  }

  async function trade(signal: any) {
    if (!user?.id) return toast.error("Sign in to trade");
    setLoading(true);
    try {
      const { data: md } = await supabase
        .from("market_data")
        .select("price")
        .eq("symbol", signal.symbol)
        .maybeSingle();
      const price = Number(md?.price || 0);
      const amount = 1; // default one unit for signal trade
      const total_value = price * amount;
      const { error } = await supabase.from("user_trades").insert({
        user_id: user.id,
        symbol: signal.symbol,
        trade_type: signal.signal_type, // BUY/SELL
        order_type: "MARKET",
        amount,
        price,
        total_value,
        status: "pending",
        signal_id: signal.id,
      });
      if (error) throw error;
      toast.success("Order created for admin approval");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to create order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Signals</h3>
      </div>
      {signals.length === 0 ? (
        <div className="text-xs text-muted-foreground">No active signals</div>
      ) : (
        <div className="space-y-2">
          {signals.map((s) => (
            <div key={s.id} className={`p-2 rounded border text-sm flex items-center justify-between ${s.signal_type === 'BUY' ? 'bg-green-500/10 border-green-500/30' : s.signal_type === 'SELL' ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
              <div className="flex items-center gap-2">
                {s.signal_type === 'BUY' ? <TrendingUp className="w-4 h-4 text-green-500" /> : s.signal_type === 'SELL' ? <TrendingDown className="w-4 h-4 text-red-500" /> : null}
                <span className="font-medium">{s.symbol}</span>
                <span className="text-xs">{s.signal_type}</span>
                <span className="text-[10px] opacity-75">{Number(s.confidence_score || 0).toFixed(0)}%</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => trade(s)} disabled={loading}>Trade</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
