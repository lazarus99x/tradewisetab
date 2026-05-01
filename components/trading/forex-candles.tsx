"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

interface Candle {
  time: number; // ms
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ForexCandlesProps {
  symbol: string; // e.g., "EUR/USD"
  height?: number;
}

export function ForexCandles({ symbol, height = 220 }: ForexCandlesProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [livePrice, setLivePrice] = useState<number>(0);
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize observer for responsiveness
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setWidth(el.clientWidth));
    obs.observe(el);
    setWidth(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  // Load initial candles from price_history
  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase
        .from("price_history")
        .select("price, timestamp")
        .eq("symbol", symbol)
        .order("timestamp", { ascending: false })
        .limit(300);
      const rows = (data || []).reverse();
      // Aggregate into 1-min candles
      const bucketMs = 60_000;
      const map: Record<string, Candle> = {};
      for (const r of rows) {
        const t = new Date(r.timestamp as string).getTime();
        const bucket = Math.floor(t / bucketMs) * bucketMs;
        const price = Number(r.price || 0);
        if (!map[bucket]) {
          map[bucket] = { time: bucket, open: price, high: price, low: price, close: price };
        } else {
          map[bucket].high = Math.max(map[bucket].high, price);
          map[bucket].low = Math.min(map[bucket].low, price);
          map[bucket].close = price;
        }
      }
      let out = Object.values(map).sort((a, b) => a.time - b.time);
      // If not enough, synthesize candles from the last known close
      if (out.length < 60) {
        const nowBucket = Math.floor(Date.now() / bucketMs) * bucketMs;
        let lastClose = out.length ? out[out.length - 1].close : 1.1000;
        // generate up to 60 candles ending now
        const needed = 60 - out.length;
        const synth: Candle[] = [];
        for (let i = needed; i > 0; i--) {
          const t = nowBucket - i * bucketMs;
          const o = lastClose;
          // random walk
          const delta = o * (Math.random() * 0.004 - 0.002);
          const c = Math.max(0.0001, o + delta);
          const high = Math.max(o, c) + Math.abs(delta) * 0.6;
          const low = Math.min(o, c) - Math.abs(delta) * 0.6;
          synth.push({ time: t, open: o, high, low, close: c });
          lastClose = c;
        }
        out = [...out, ...synth];
      }
      if (mounted) setCandles(out.slice(-60));
    }
    load();
    return () => {
      mounted = false;
    };
  }, [symbol]);

  // Subscribe to market_data for live price and build running candle
  useEffect(() => {
    let tick: NodeJS.Timeout | null = null;
    const channel = supabase
      .channel(`fx-${symbol}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "market_data", filter: `symbol=eq.${symbol}` },
        (payload) => {
          const p = Number((payload.new as any)?.price || 0);
          if (!p) return;
          setLivePrice(p);
          updateRunningCandle(p);
        }
      )
      .subscribe();

    // Local heartbeat to ensure per-second motion (micro-jitter)
    tick = setInterval(() => {
      setLivePrice((prev) => {
        const base = prev || (candles.length ? candles[candles.length - 1].close : 1);
        const jitter = base * (Math.random() * 0.0008 - 0.0004);
        const next = Math.max(0.00001, base + jitter);
        updateRunningCandle(next);
        return next;
      });
    }, 1000);

    function updateRunningCandle(price: number) {
      setCandles((prev) => {
        if (prev.length === 0) {
          const now = Date.now();
          const bucket = Math.floor(now / 60_000) * 60_000;
          return [{ time: bucket, open: price, high: price, low: price, close: price }];
        }
        const last = prev[prev.length - 1];
        const now = Date.now();
        const bucket = Math.floor(now / 60_000) * 60_000;
        if (bucket !== last.time) {
          // New candle
          const next: Candle = { time: bucket, open: last.close, high: price, low: price, close: price };
          return [...prev.slice(-59), next];
        } else {
          // Update running
          const updated = { ...last, high: Math.max(last.high, price), low: Math.min(last.low, price), close: price };
          return [...prev.slice(0, -1), updated];
        }
      });
    }

    return () => {
      supabase.removeChannel(channel);
      if (tick) clearInterval(tick);
    };
  }, [symbol, candles.length]);

  const view = useMemo(() => {
    if (!candles.length || width === 0) return null;
    const pad = 10;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const min = Math.min(...candles.map((c) => c.low));
    const max = Math.max(...candles.map((c) => c.high));
    const scaleY = (price: number) => h - ((price - min) / (max - min || 1)) * h;
    const fixed = 60; // keep 60 visible candles always
    const step = Math.max(6, Math.floor(w / fixed));
    const bodyW = Math.max(4, Math.floor(step * 0.6));
    const startX = w - fixed * step; // flow in from right, shift left 

    return { pad, w, h, min, max, scaleY, step, bodyW, startX };
  }, [candles, width, height]);

  return (
    <Card className="p-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-semibold">{symbol} (FX)</div>
        <div className="text-xs text-muted-foreground">{livePrice ? livePrice.toFixed(5) : "--"}</div>
      </div>
      <div ref={containerRef} style={{ width: "100%", height }}>
        {view ? (
          <svg width={width} height={height}>
            {/* background grid */}
            <rect x={0} y={0} width={width} height={height} fill="transparent" />
            {Array.from({ length: 4 }).map((_, i) => (
              <line key={`g-h-${i}`} x1={10} x2={width - 40} y1={(height / 5) * (i + 1)} y2={(height / 5) * (i + 1)} stroke="rgba(255,255,255,0.06)" />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={`g-v-${i}`} y1={10} y2={height - 20} x1={(width / 7) * (i + 1)} x2={(width / 7) * (i + 1)} stroke="rgba(255,255,255,0.06)" />
            ))}
            {/* candles */}
            <g transform={`translate(${view.pad}, ${view.pad})`}>
              {candles.map((c, i) => {
                const x = view.startX + i * view.step - view.pad;
                const yOpen = view.scaleY(c.open);
                const yClose = view.scaleY(c.close);
                const yHigh = view.scaleY(c.high);
                const yLow = view.scaleY(c.low);
                const up = c.close >= c.open;
                const color = up ? "#00FE01" : "#FF4D4D";
                const bodyY = Math.min(yOpen, yClose);
                const bodyH = Math.max(1, Math.abs(yClose - yOpen));
                return (
                  <g key={c.time}>
                    <line x1={x + view.bodyW / 2} x2={x + view.bodyW / 2} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
                    <rect x={x} y={bodyY} width={view.bodyW} height={bodyH} fill={color} opacity={0.85} rx={1} />
                  </g>
                );
              })}
            </g>
            {/* right price scale */}
            <g>
              {Array.from({ length: 5 }).map((_, i) => {
                const y = (height / 5) * i + 10;
                const price = (view!.max - ((view!.max - view!.min) / 4) * i).toFixed(5);
                return (
                  <g key={`p-${i}`}>
                    <line x1={width - 40} x2={width - 40} y1={0} y2={height} stroke="transparent" />
                    <text x={width - 36} y={y + 10} fontSize={10} fill="#8A8A8A">{price}</text>
                  </g>
                );
              })}
            </g>
          </svg>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading...</div>
        )}
      </div>
      {/* side mini FX ticker */}
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        {(["EUR/USD", "GBP/USD", "USD/JPY"]).map((s) => (
          <FxMini key={s} symbol={s} />
        ))}
      </div>
    </Card>
  );
}

function FxMini({ symbol }: { symbol: string }) {
  const [price, setPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const priceRef = useRef<number | null>(null);
  
  // Stable dependency array - only symbol
  useEffect(() => {
    setMounted(true);
    let isActive = true;
    
    // Load initial price
    supabase
      .from("market_data")
      .select("price")
      .eq("symbol", symbol)
      .single()
      .then(({ data }) => {
        if (isActive && data?.price) {
          const initialPrice = Number(data.price);
          priceRef.current = initialPrice;
          setPrice(initialPrice);
          setPrevPrice(initialPrice);
        }
      });
    
    // Subscribe to updates
    const channelName = `mini-fx-${symbol}`;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "market_data", 
          filter: `symbol=eq.${symbol}` 
        },
        (payload) => {
          if (!isActive) return;
          const newPrice = Number((payload.new as any)?.price || 0);
          if (newPrice && priceRef.current !== newPrice) {
            const oldPrice = priceRef.current;
            setPrevPrice(oldPrice || newPrice);
            priceRef.current = newPrice;
            setPrice(newPrice);
          }
        }
      )
      .subscribe();
    
    return () => {
      isActive = false;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);
  
  // Calculate change - default to neutral for consistent hydration
  const hasPrice = mounted && price !== null && prevPrice !== null;
  const chg = hasPrice ? price! - prevPrice! : 0;
  const displayPrice = mounted && price !== null ? price.toFixed(5) : '--';
  const colorClass = !hasPrice 
    ? 'text-muted-foreground' 
    : (chg >= 0 ? 'text-green-500' : 'text-red-500');
  
  return (
    <div className="p-2 border rounded flex items-center justify-between">
      <span className="font-semibold">{symbol.replace("/", " B7")}</span>
      <span className={colorClass}>{displayPrice}</span>
    </div>
  );
}
