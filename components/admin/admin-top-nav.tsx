"use client"

import { Bell, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AdminTopNav() {
  return (
    <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Administration</h2>
        <p className="text-sm text-muted-foreground">Platform management and monitoring</p>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
