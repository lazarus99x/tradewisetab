"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown } from "lucide-react";

interface LiveTradingChartProps {
  asset: string;
  timeframe: string;
}

export function LiveTradingChart({ asset, timeframe }: LiveTradingChartProps) {
  const [chartData, setChartData] = useState<
    Array<{ time: string; price: number }>
  >([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!asset) return;

    // Load initial market data
    async function loadMarketData() {
      try {
        const { data, error } = await supabase
          .from("market_data")
          .select("*")
          .eq("symbol", asset)
          .single();

        if (error) {
          console.error("Error loading market data:", error);
          // Generate initial data if none exists
          if (error.code === "PGRST116") {
            // Create initial entry
            const initialPrice = asset.includes("BTC")
              ? 43250
              : asset.includes("ETH")
                ? 2650
                : 100;
            await supabase.from("market_data").insert({
              symbol: asset,
              price: initialPrice,
              change_24h: 0,
              volume_24h: 1000000,
              high_24h: initialPrice * 1.01,
              low_24h: initialPrice * 0.99,
              category: asset.includes("/") ? "crypto" : "stock",
            });
            setCurrentPrice(initialPrice);
            setPriceChange(0);
            setChartData([
              {
                time: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                price: initialPrice,
              },
            ]);
          }
          return;
        }

        if (data) {
          setCurrentPrice(Number(data.price) || 0);
          setPriceChange(Number(data.change_24h || 0));

          // Load price history
          const { data: history } = await supabase
            .from("price_history")
            .select("price, timestamp")
            .eq("symbol", asset)
            .order("timestamp", { ascending: false })
            .limit(100);

          if (history && history.length > 0) {
            const formatted = history.reverse().map((h) => ({
              time: new Date(h.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              price: Number(h.price) || 0,
            }));
            setChartData(formatted);
          } else {
            // Create initial chart point if no history
            const initialData = {
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              price: Number(data.price) || 0,
            };
            setChartData([initialData]);
          }
        }
      } catch (error) {
        console.error("Error in loadMarketData:", error);
      }
    }

    loadMarketData();

    // Subscribe to real-time price updates
    const channel = supabase
      .channel(`${asset}-price-updates`)
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
          setPriceChange(Number(newData.change_24h || 0));

          // Add new data point to chart
          setChartData((prev) => {
            const newPoint = {
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              price: Number(newData.price),
            };
            const updated = [...prev, newPoint];
            // Keep only last 100 points
            return updated.slice(-100);
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "price_history",
          filter: `symbol=eq.${asset}`,
        },
        (payload) => {
          const newPoint = payload.new as any;
          setChartData((prev) => {
            const updated = [
              ...prev,
              {
                time: new Date(newPoint.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                price: Number(newPoint.price),
              },
            ];
            return updated.slice(-100);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [asset]);

  const chartColor = priceChange >= 0 ? "#00FE01" : "#FF0000";
  const minPrice = Math.min(...chartData.map((d) => d.price), currentPrice);
  const maxPrice = Math.max(...chartData.map((d) => d.price), currentPrice);
  const priceRange = maxPrice - minPrice || 1;

  return (
    <Card className="border-border bg-card p-4 sm:p-6 flex-1 relative overflow-hidden">
      {/* Live indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <div
          className={`w-2 h-2 rounded-full animate-pulse ${isLive ? "bg-green-500" : "bg-gray-500"}`}
        />
        <span className="text-xs text-muted-foreground font-medium">LIVE</span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-foreground">
              {asset}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Timeframe: {timeframe}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              {priceChange >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-lg sm:text-xl font-bold ${priceChange >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                $
                {currentPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 8,
                })}
              </span>
            </div>
            <span
              className={`text-xs sm:text-sm font-medium ${priceChange >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {priceChange >= 0 ? "+" : ""}
              {priceChange.toFixed(2)}% (24h)
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart
          data={
            chartData.length > 0
              ? chartData
              : [{ time: "Now", price: currentPrice }]
          }
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id={`color${asset}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            opacity={0.3}
          />
          <XAxis
            dataKey="time"
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            tickLine={false}
            domain={[minPrice - priceRange * 0.1, maxPrice + priceRange * 0.1]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              padding: "8px 12px",
            }}
            labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
            formatter={(value: any) => [
              `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`,
              "Price",
            ]}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={chartColor}
            strokeWidth={2}
            fill={`url(#color${asset})`}
            dot={false}
            activeDot={{ r: 4, fill: chartColor }}
            animationDuration={300}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>

      {chartData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">
              Loading chart data...
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
