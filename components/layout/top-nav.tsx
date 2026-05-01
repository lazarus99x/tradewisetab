"use client"

import { Bell, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { toast } from "sonner"

export function TopNav() {
  const handleNotificationClick = () => {
    toast.info("No new notifications");
  };

  return (
    <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Trading</h1>
        <p className="text-sm text-muted-foreground">Real-time market data and trading</p>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleNotificationClick}>
          <Bell className="w-5 h-5" />
        </Button>
        <Link href="/profile">
          <Button variant="ghost" size="icon">
            <User className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
