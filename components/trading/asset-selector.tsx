"use client"

import { Button } from "@/components/ui/button"

interface AssetSelectorProps {
  selectedAsset: string
  onAssetChange: (asset: string) => void
  timeframe: string
  onTimeframeChange: (timeframe: string) => void
}

export function AssetSelector({ selectedAsset, onAssetChange, timeframe, onTimeframeChange }: AssetSelectorProps) {
  const assets = [
    { symbol: "BTC/USD", name: "Bitcoin", price: "$42,350", change: "+2.5%" },
    { symbol: "ETH/USD", name: "Ethereum", price: "$2,245", change: "+1.8%" },
    { symbol: "AAPL", name: "Apple", price: "$185.42", change: "+0.8%" },
    { symbol: "EURUSD", name: "EUR/USD", price: "1.0945", change: "-0.3%" },
  ]

  const timeframes = ["1M", "5M", "15M", "1H", "4H", "1D", "1W"]

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{selectedAsset}</h2>
          <p className="text-sm text-muted-foreground">Select an asset to trade</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {assets.map((asset) => (
          <button
            key={asset.symbol}
            onClick={() => onAssetChange(asset.symbol)}
            className={`p-3 rounded-lg border transition-all ${
              selectedAsset === asset.symbol
                ? "border-blue-500 bg-blue-500/10"
                : "border-border hover:border-blue-500/50 bg-background"
            }`}
          >
            <div className="text-sm font-semibold text-foreground">{asset.symbol}</div>
            <div className="text-xs text-muted-foreground">{asset.price}</div>
            <div className={`text-xs font-medium ${asset.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
              {asset.change}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {timeframes.map((tf) => (
          <Button
            key={tf}
            variant={timeframe === tf ? "default" : "outline"}
            size="sm"
            onClick={() => onTimeframeChange(tf)}
            className={timeframe === tf ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {tf}
          </Button>
        ))}
      </div>
    </div>
  )
}
