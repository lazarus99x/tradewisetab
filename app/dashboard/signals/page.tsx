"use client"

import { useState } from "react"
import { AISignalsOverview } from "@/components/ai/ai-signals-overview"
import { SignalsList } from "@/components/ai/signals-list"
import { RiskAnalysis } from "@/components/ai/risk-analysis"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SignalsPage() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Trading Signals</h1>
          <p className="text-muted-foreground mt-2">AI-powered trading recommendations and market analysis</p>
        </div>

        <AISignalsOverview />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Active Signals</TabsTrigger>
            <TabsTrigger value="analysis">Risk Analysis</TabsTrigger>
            <TabsTrigger value="history">Signal History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <SignalsList />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <RiskAnalysis />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <SignalHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function SignalHistory() {
  const history = [
    {
      id: 1,
      asset: "BTC/USD",
      signal: "BUY",
      entryPrice: 41500,
      exitPrice: 42350,
      profit: 850,
      profitPercent: 2.05,
      date: "2 days ago",
      accuracy: "Correct",
    },
    {
      id: 2,
      asset: "ETH/USD",
      signal: "SELL",
      entryPrice: 2300,
      exitPrice: 2245,
      profit: 55,
      profitPercent: 2.39,
      date: "3 days ago",
      accuracy: "Correct",
    },
    {
      id: 3,
      asset: "AAPL",
      signal: "BUY",
      entryPrice: 182,
      exitPrice: 185.42,
      profit: 3.42,
      profitPercent: 1.88,
      date: "5 days ago",
      accuracy: "Correct",
    },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Signal History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Asset</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Signal</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">Entry</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">Exit</th>
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">Profit</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4 text-foreground font-medium">{item.asset}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      item.signal === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {item.signal}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-foreground">${item.entryPrice}</td>
                <td className="py-3 px-4 text-right text-foreground">${item.exitPrice}</td>
                <td className="py-3 px-4 text-right">
                  <span className="text-green-500 font-semibold">
                    +${item.profit.toFixed(2)} ({item.profitPercent.toFixed(2)}%)
                  </span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{item.date}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-400">
                    {item.accuracy}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
