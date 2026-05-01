"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function LoansList() {
  const loans = [
    {
      id: 1,
      type: "Lending",
      asset: "USDC",
      amount: "25,000",
      apy: "8.5%",
      earned: "1,234.50",
      status: "Active",
    },
    {
      id: 2,
      type: "Lending",
      asset: "ETH",
      amount: "5.5",
      apy: "6.5%",
      earned: "234.75",
      status: "Active",
    },
    {
      id: 3,
      type: "Borrowing",
      asset: "USDT",
      amount: "15,000",
      apy: "5.8%",
      owed: "567.50",
      status: "Active",
    },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Active Loans</h3>

      <div className="grid gap-4">
        {loans.map((loan) => (
          <Card key={loan.id} className="border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{loan.type}</p>
                    <p className="text-lg font-semibold text-foreground">
                      {loan.amount} {loan.asset}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Rate</p>
                    <p className="text-lg font-semibold text-foreground">{loan.apy}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{loan.type === "Lending" ? "Earned" : "Owed"}</p>
                    <p
                      className={`text-lg font-semibold ${loan.type === "Lending" ? "text-green-500" : "text-red-500"}`}
                    >
                      ${loan.type === "Lending" ? loan.earned : loan.owed}
                    </p>
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                      {loan.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Details
                </Button>
                {loan.type === "Lending" ? (
                  <Button size="sm" className="bg-red-600 hover:bg-red-700">
                    Withdraw
                  </Button>
                ) : (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Repay
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
