"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, Target, Zap } from "lucide-react"

export function AISignalsOverview() {
  const stats = [
    {
      label: "Win Rate",
      value: "72.5%",
      icon: Target,
      color: "text-green-500",
      description: "Last 30 days",
    },
    {
      label: "Active Signals",
      value: "8",
      icon: Zap,
      color: "text-yellow-500",
      description: "Ready to trade",
    },
    {
      label: "Avg. Profit",
      value: "+2.3%",
      icon: TrendingUp,
      color: "text-blue-500",
      description: "Per signal",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-2">{stat.description}</p>
              </div>
              <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
