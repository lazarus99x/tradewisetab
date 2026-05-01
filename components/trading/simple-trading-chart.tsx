"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SimpleTradingChartProps {
  asset: string;
}

export function SimpleTradingChart({ asset }: SimpleTradingChartProps) {
  const [price, setPrice] = useState<number>(0);
  const [change, setChange] = useState<number>(0);
  const [chartData, setChartData] = useState<
    Array<{ time: string; price: number }>
  >([]);
  const [lastServerPrice, setLastServerPrice] = useState<number | null>(null);
  const [localTicker, setLocalTicker] = useState<NodeJS.Timeout | null>(null);
  const [channelId, setChannelId] = useState<string>("");

  useEffect(() => {
    if (!asset) return;

    // Reset state on asset change
    setChartData([]);
    setLastServerPrice(null);

    loadData();

    const id = `${asset}-live-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setChannelId(id);

    // Subscribe to price updates with a unique channel to avoid collisions
    const channel = supabase
      .channel(id)
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
          const nextPrice = Number(data.price || 0);
          setPrice(nextPrice);
          setChange(Number(data.change_24h || 0));
          setLastServerPrice(nextPrice);

          // Add to chart
          setChartData((prev) => {
            const newPoint = {
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
              price: nextPrice,
            };
            const updated = [...prev, newPoint];
            return updated.slice(-200); // keep more points for smoother view
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (localTicker) clearInterval(localTicker);
    };
  }, [asset]);

  useEffect(() => {
    // Local interpolation ticker: add small jitter every second to keep chart moving
    if (localTicker) {
      clearInterval(localTicker);
    }
    const t = setInterval(() => {
      setChartData((prev) => {
        const baseRef =
          lastServerPrice ??
          (prev.length ? prev[prev.length - 1].price : price);
        const jitter = baseRef * (Math.random() * 0.0008 - 0.0004); // +/-0.04%
        const next = Math.max(0, baseRef + jitter);
        const point = {
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          price: next,
        };
        const updated = [...prev, point];
        return updated.slice(-200);
      });
    }, 1000);
    setLocalTicker(t);
    return () => clearInterval(t);
  }, [lastServerPrice, asset]);

  async function loadData() {
    try {
      const { data } = await supabase
        .from("market_data")
        .select("*")
        .eq("symbol", asset)
        .single();

      if (data) {
        setPrice(Number(data.price || 0));
        setChange(Number(data.change_24h || 0));

        // Load history
        const { data: history } = await supabase
          .from("price_history")
          .select("price, timestamp")
          .eq("symbol", asset)
          .order("timestamp", { ascending: false })
          .limit(50);

        if (history && history.length > 0) {
          const formatted = history.reverse().map((h) => ({
            time: new Date(h.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            price: Number(h.price || 0),
          }));
          setChartData(formatted);
        } else {
          // Initialize with current price
          setChartData([
            {
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              price: Number(data.price || 0),
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  const isPositive = change >= 0;
  const color = isPositive ? "#00FE01" : "#FF0000";

  // Responsive: fewer ticks on mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 600;

  function dedupTicks(ticks: string[]) {
    // Always ensure ticks are unique to prevent React duplicate key errors in Recharts
    const uniqueTicks = Array.from(new Set(ticks));
    if (!uniqueTicks.length) return uniqueTicks;
    if (uniqueTicks.length <= 4) return uniqueTicks;

    const first = uniqueTicks[0];
    const last = uniqueTicks[uniqueTicks.length - 1];
    const midIdx1 = Math.floor((uniqueTicks.length - 1) / 3);
    const midIdx2 = Math.floor(((uniqueTicks.length - 1) * 2) / 3);

    // Safety check to ensure we don't accidentally pick the same index
    const result = new Set([
      first,
      uniqueTicks[midIdx1],
      uniqueTicks[midIdx2],
      last,
    ]);
    return Array.from(result);
  }

  return (
    <Card className="p-4 border border-border/60 bg-gradient-to-b from-background to-background/60">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold">{asset}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            Live Price
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/30">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
            <span
              className={`text-2xl font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}
            >
              $
              {price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 8,
              })}
            </span>
          </div>
          <p
            className={`text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}
          >
            {isPositive ? "+" : ""}
            {change.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="h-64">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id={`gradient-${asset}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                fontSize={isMobile ? 10 : 11}
                tickLine={false}
                interval={0}
                ticks={dedupTicks(chartData.map((d) => d.time))}
                tick={({ x, y, payload }) => (
                  <text
                    x={x}
                    y={y + 13}
                    textAnchor="middle"
                    fill="#888"
                    fontSize={isMobile ? 10 : 11}
                    opacity={0.7}
                  >
                    {payload.value}
                  </text>
                )}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                domain={["auto", "auto"]}
                width={60}
              />
              <Tooltip
                formatter={(value: any) => [
                  `$${Number(value).toFixed(2)}`,
                  "Price",
                ]}
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${asset})`}
                dot={false}
                isAnimationActive={true}
                animationDuration={450}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading chart...
          </div>
        )}
      </div>
    </Card>
  );
}
