"use client"

import { useState } from "react"
import { LendingOverview } from "@/components/lending/lending-overview"
import { LendingForm } from "@/components/lending/lending-form"
import { BorrowingForm } from "@/components/lending/borrowing-form"
import { LoansList } from "@/components/lending/loans-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LendingPage() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lending & Borrowing</h1>
          <p className="text-muted-foreground mt-2">Earn yield on your assets or borrow against collateral</p>
        </div>

        <LendingOverview />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="lend">Lend Assets</TabsTrigger>
            <TabsTrigger value="borrow">Borrow Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <LoansList />
          </TabsContent>

          <TabsContent value="lend" className="space-y-6">
            <LendingForm />
          </TabsContent>

          <TabsContent value="borrow" className="space-y-6">
            <BorrowingForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
