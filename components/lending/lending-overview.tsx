"use client"

import { Card } from "@/components/ui/card"

export function LendingOverview() {
  const stats = [
    {
      label: "Total Supplied",
      value: "$125,450.00",
      change: "+5.2%",
      color: "text-green-500",
    },
    {
      label: "Total Borrowed",
      value: "$45,200.00",
      change: "+2.1%",
      color: "text-blue-500",
    },
    {
      label: "Earning APY",
      value: "8.5%",
      change: "Stable",
      color: "text-yellow-500",
    },
    {
      label: "Borrow APR",
      value: "6.2%",
      change: "Stable",
      color: "text-orange-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="border-border bg-card p-6">
          <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className={`text-xs font-medium mt-1 ${stat.color}`}>{stat.change}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
