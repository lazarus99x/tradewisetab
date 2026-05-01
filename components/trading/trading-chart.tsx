"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"

interface TradingChartProps {
  asset: string
  timeframe: string
}

export function TradingChart({ asset, timeframe }: TradingChartProps) {
  // Mock data - in production, this would come from a real API
  const generateChartData = () => {
    const data = []
    let price = 42000
    for (let i = 0; i < 50; i++) {
      price += (Math.random() - 0.5) * 500
      data.push({
        time: `${i}:00`,
        price: Math.round(price),
      })
    }
    return data
  }

  const data = generateChartData()

  return (
    <Card className="border-border bg-card p-4 flex-1">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{asset} Chart</h3>
        <p className="text-sm text-muted-foreground">Timeframe: {timeframe}</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="time" stroke="var(--color-muted-foreground)" />
          <YAxis stroke="var(--color-muted-foreground)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "var(--color-foreground)" }}
          />
          <Line type="monotone" dataKey="price" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
