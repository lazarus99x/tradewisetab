"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export function LendingForm() {
  const [selectedAsset, setSelectedAsset] = useState("USDC")
  const [amount, setAmount] = useState("")

  const assets = [
    { symbol: "USDC", apy: "8.5%", available: "50,000" },
    { symbol: "USDT", apy: "7.8%", available: "35,000" },
    { symbol: "DAI", apy: "8.2%", available: "25,000" },
    { symbol: "ETH", apy: "6.5%", available: "15.5" },
  ]

  const selectedAssetData = assets.find((a) => a.symbol === selectedAsset)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="border-border bg-card p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-foreground mb-6">Supply Assets</h3>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground block mb-3">Select Asset</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {assets.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset.symbol)}
                  className={`p-4 rounded-lg border transition-all ${
                    selectedAsset === asset.symbol
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-border hover:border-blue-500/50 bg-background"
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground">{asset.symbol}</div>
                  <div className="text-xs text-muted-foreground mt-1">APY: {asset.apy}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Amount to Supply</label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background border-border pr-16"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500 hover:text-blue-400 font-medium">
                Max
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Available: {selectedAssetData?.available} {selectedAsset}
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">APY:</span>
              <span className="text-foreground font-semibold">{selectedAssetData?.apy}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly Earnings:</span>
              <span className="text-foreground font-semibold">
                ${((Number.parseFloat(amount || "0") * 0.085) / 12).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Annual Earnings:</span>
              <span className="text-foreground font-semibold">
                ${(Number.parseFloat(amount || "0") * 0.085).toFixed(2)}
              </span>
            </div>
          </div>

          <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
            Supply {selectedAsset}
          </Button>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Supply Info</h3>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">What is Lending?</p>
            <p className="text-xs text-muted-foreground">
              Supply your assets to earn interest. Your assets are used to facilitate loans on the platform.
            </p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-muted-foreground mb-1">Risk Level</p>
            <p className="text-xs text-muted-foreground">Low - Your assets are secured by collateral</p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-muted-foreground mb-1">Withdrawal</p>
            <p className="text-xs text-muted-foreground">Withdraw anytime. No lock-up period.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
