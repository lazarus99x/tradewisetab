"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

export function RiskAnalysis() {
  const riskData = [
    { name: "Low Risk", value: 45, color: "var(--color-chart-1)" },
    { name: "Medium Risk", value: 35, color: "var(--color-chart-2)" },
    { name: "High Risk", value: 20, color: "var(--color-chart-3)" },
  ]

  const correlationData = [
    { asset: "BTC", correlation: 0.92 },
    { asset: "ETH", correlation: 0.85 },
    { asset: "AAPL", correlation: 0.45 },
    { asset: "EUR", correlation: 0.32 },
    { asset: "Gold", correlation: -0.15 },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Portfolio Risk Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={riskData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {riskData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Asset Correlation Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={correlationData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="asset" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
              }}
            />
            <Bar dataKey="correlation" fill="var(--color-accent)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="border-border bg-card p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-foreground mb-4">Risk Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Value at Risk (95%)</p>
            <p className="text-2xl font-bold text-foreground">-$2,450</p>
            <p className="text-xs text-muted-foreground mt-1">Max daily loss</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
            <p className="text-2xl font-bold text-foreground">1.85</p>
            <p className="text-xs text-muted-foreground mt-1">Risk-adjusted return</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Max Drawdown</p>
            <p className="text-2xl font-bold text-red-500">-8.5%</p>
            <p className="text-xs text-muted-foreground mt-1">Peak to trough</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Beta</p>
            <p className="text-2xl font-bold text-foreground">1.12</p>
            <p className="text-xs text-muted-foreground mt-1">Market sensitivity</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
