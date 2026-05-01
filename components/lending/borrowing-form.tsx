"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export function BorrowingForm() {
  const [selectedAsset, setSelectedAsset] = useState("USDC")
  const [collateralAsset, setCollateralAsset] = useState("ETH")
  const [borrowAmount, setBorrowAmount] = useState("")
  const [collateralAmount, setCollateralAmount] = useState("")

  const assets = [
    { symbol: "USDC", apr: "6.2%", maxBorrow: "100,000" },
    { symbol: "USDT", apr: "5.8%", maxBorrow: "80,000" },
    { symbol: "DAI", apr: "6.0%", maxBorrow: "75,000" },
  ]

  const collaterals = [
    { symbol: "ETH", ltv: "75%", price: "$2,245" },
    { symbol: "BTC", ltv: "70%", price: "$42,350" },
    { symbol: "USDC", ltv: "95%", price: "$1.00" },
  ]

  const selectedAssetData = assets.find((a) => a.symbol === selectedAsset)
  const selectedCollateral = collaterals.find((c) => c.symbol === collateralAsset)

  const maxBorrowAmount = Number.parseFloat(collateralAmount || "0") * 0.75

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="border-border bg-card p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-foreground mb-6">Borrow Assets</h3>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground block mb-3">Asset to Borrow</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                  <div className="text-xs text-muted-foreground mt-1">APR: {asset.apr}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-3">Collateral Asset</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {collaterals.map((collateral) => (
                <button
                  key={collateral.symbol}
                  onClick={() => setCollateralAsset(collateral.symbol)}
                  className={`p-4 rounded-lg border transition-all ${
                    collateralAsset === collateral.symbol
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-border hover:border-blue-500/50 bg-background"
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground">{collateral.symbol}</div>
                  <div className="text-xs text-muted-foreground mt-1">LTV: {collateral.ltv}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Collateral Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Borrow Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={borrowAmount}
                onChange={(e) => setBorrowAmount(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">APR:</span>
              <span className="text-foreground font-semibold">{selectedAssetData?.apr}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max Borrow:</span>
              <span className="text-foreground font-semibold">${maxBorrowAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly Interest:</span>
              <span className="text-foreground font-semibold">
                ${((Number.parseFloat(borrowAmount || "0") * 0.062) / 12).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Collateral Ratio:</span>
              <span
                className={`font-semibold ${
                  Number.parseFloat(borrowAmount || "0") <= maxBorrowAmount ? "text-green-500" : "text-red-500"
                }`}
              >
                {((Number.parseFloat(borrowAmount || "0") / maxBorrowAmount) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
            Borrow {selectedAsset}
          </Button>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Borrow Info</h3>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">What is Borrowing?</p>
            <p className="text-xs text-muted-foreground">
              Borrow assets by providing collateral. Your collateral is held securely.
            </p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-muted-foreground mb-1">Liquidation Risk</p>
            <p className="text-xs text-muted-foreground">
              If collateral value drops below threshold, your position may be liquidated.
            </p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-muted-foreground mb-1">LTV Ratio</p>
            <p className="text-xs text-muted-foreground">
              Loan-to-Value determines how much you can borrow against collateral.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
