"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Star } from "lucide-react";

export function Watchlist() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [data, setData] = useState<Record<string, any>>({});
  const [all, setAll] = useState<any[]>([]);

  // Load all market symbols for quick add
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("market_data").select("symbol, price, change_24h").order("symbol");
      setAll(data || []);
    }
    load();
  }, []);

  // Persist favorites
  useEffect(() => {
    const saved = localStorage.getItem("watchlist");
    if (saved) setSymbols(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(symbols));
  }, [symbols]);

  // Subscribe to live price updates for favorites
  useEffect(() => {
    const channels = symbols.map((s) =>
      supabase
        .channel(`wl-${s}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "market_data", filter: `symbol=eq.${s}` },
          (payload) => {
            const d = payload.new as any;
            setData((prev) => ({ ...prev, [s]: d }));
          }
        )
        .subscribe()
    );
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [symbols.join(",")]);

  const remaining = useMemo(() => all.filter((a) => !symbols.includes(a.symbol)), [all, symbols]);

  function toggle(sym: string) {
    setSymbols((prev) => (prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]));
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Watchlist</h3>
        <div className="flex gap-2 flex-wrap">
          {remaining.slice(0, 6).map((a) => (
            <Button key={a.symbol} size="sm" variant="outline" onClick={() => toggle(a.symbol)}>
              + {a.symbol}
            </Button>
          ))}
        </div>
      </div>

      {symbols.length === 0 ? (
        <div className="text-xs text-muted-foreground">No favorites. Add from the buttons above.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {symbols.map((s) => {
            const d = data[s] || all.find((x) => x.symbol === s) || { price: 0, change_24h: 0 };
            const ch = Number(d.change_24h || 0);
            return (
              <div key={s} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="text-sm font-semibold">{s}</div>
                  <div className="text-xs text-muted-foreground">${Number(d.price || 0).toFixed(4)} • <span className={ch >= 0 ? 'text-green-500' : 'text-red-500'}>{ch >= 0 ? '+' : ''}{ch.toFixed(2)}%</span></div>
                </div>
                <button onClick={() => toggle(s)} className="p-1">
                  <Star className="w-4 h-4" fill="#FFC107" color="#FFC107" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
