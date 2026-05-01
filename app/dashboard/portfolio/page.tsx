"use client"

import { useState } from "react"
import { PortfolioOverview } from "@/components/portfolio/portfolio-overview"
import { PortfolioChart } from "@/components/portfolio/portfolio-chart"
import { HoldingsTable } from "@/components/portfolio/holdings-table"
import { PerformanceMetrics } from "@/components/portfolio/performance-metrics"
import { AllocationChart } from "@/components/portfolio/allocation-chart"

export default function PortfolioPage() {
  const [timeframe, setTimeframe] = useState("1M")

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Portfolio</h1>
          <p className="text-muted-foreground mt-2">Track your assets, performance, and allocation</p>
        </div>

        <PortfolioOverview />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PortfolioChart timeframe={timeframe} onTimeframeChange={setTimeframe} />
          </div>
          <AllocationChart />
        </div>

        <PerformanceMetrics />

        <HoldingsTable />
      </div>
    </div>
  )
}
