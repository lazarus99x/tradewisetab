"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown } from "lucide-react";

interface LiveAssetSelectorProps {
  selectedAsset: string;
  onAssetChange: (asset: string) => void;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}

export function LiveAssetSelector({
  selectedAsset,
  onAssetChange,
  timeframe,
  onTimeframeChange,
}: LiveAssetSelectorProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const timeframes = ["1M", "5M", "15M", "1H", "4H", "1D", "1W"];

  useEffect(() => {
    loadAssets();

    // Subscribe to price updates
    const channel = supabase
      .channel("asset-selector-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "market_data",
        },
        () => {
          loadAssets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadAssets() {
    try {
      const { data, error } = await supabase
        .from("market_data")
        .select("symbol, price, change_24h, category")
        .order("category")
        .order("symbol");

      if (error) throw error;

      if (data) {
        setAssets(data);
        if (!selectedAsset && data.length > 0) {
          onAssetChange(data[0].symbol);
        }
      }
    } catch (error) {
      console.error("Error loading assets:", error);
    } finally {
      setLoading(false);
    }
  }

  const cryptoAssets = assets.filter((a) => a.category === "crypto");
  const stockAssets = assets.filter((a) => a.category === "stock");

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground">{selectedAsset}</h2>
          <p className="text-sm text-muted-foreground">Select an asset to trade</p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      ) : (
        <>
          {/* Crypto Section */}
          {cryptoAssets.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Cryptocurrencies</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {cryptoAssets.map((asset) => {
                  const isSelected = selectedAsset === asset.symbol;
                  const change = Number(asset.change_24h || 0);
                  const price = Number(asset.price);

                  return (
                    <button
                      key={asset.symbol}
                      onClick={() => onAssetChange(asset.symbol)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/10 scale-105"
                          : "border-border hover:border-primary/50 bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-semibold text-foreground">{asset.symbol.split('/')[0]}</div>
                        {change >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                      <div className="text-xs font-medium text-foreground mb-1">
                        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          change >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(2)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stocks Section */}
          {stockAssets.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Stocks</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {stockAssets.map((asset) => {
                  const isSelected = selectedAsset === asset.symbol;
                  const change = Number(asset.change_24h || 0);
                  const price = Number(asset.price);

                  return (
                    <button
                      key={asset.symbol}
                      onClick={() => onAssetChange(asset.symbol)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/10 scale-105"
                          : "border-border hover:border-primary/50 bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-semibold text-foreground">{asset.symbol}</div>
                        {change >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                      <div className="text-xs font-medium text-foreground mb-1">
                        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          change >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(2)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-border">
        {timeframes.map((tf) => (
          <Button
            key={tf}
            variant={timeframe === tf ? "default" : "outline"}
            size="sm"
            onClick={() => onTimeframeChange(tf)}
            className={timeframe === tf ? "bg-primary" : ""}
          >
            {tf}
          </Button>
        ))}
      </div>
    </Card>
  );
}
