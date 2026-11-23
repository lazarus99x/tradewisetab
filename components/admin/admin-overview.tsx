"use client"

import { Card } from "@/components/ui/card"
import { Users, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function AdminOverview() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      
      // Fetch total users from Clerk (real user count)
      let totalUsers = 0;
      try {
        const userRes = await fetch("/api/admin/users");
        const userData = await userRes.json();
        if (userRes.ok && userData.users) {
          totalUsers = Array.isArray(userData.users) ? userData.users.length : 0;
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
      
      // Verified users from Supabase profiles
      const { count: verifiedUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("kyc_status", "verified");
      
      // Pending KYC submissions
      const { count: pendingKyc } = await supabase
        .from("kyc_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      
      // Platform volume (sum of transactions.amount)
      let platformVolume = 0;
      const { data: txs } = await supabase
        .from("transactions")
        .select("amount, type");
      if (txs && txs.length) {
        platformVolume = txs.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      }

      const computed = [
        {
          label: "Total Users",
          value: totalUsers.toLocaleString(),
          icon: Users,
          color: "text-blue-500",
          change: "",
        },
        {
          label: "Verified Users",
          value: (verifiedUsers || 0).toLocaleString(),
          icon: CheckCircle,
          color: "text-green-500",
          change: "",
        },
        {
          label: "Pending KYC",
          value: (pendingKyc || 0).toLocaleString(),
          icon: AlertCircle,
          color: "text-yellow-500",
          change: "",
        },
        {
          label: "Platform Volume",
          value: `$${platformVolume.toLocaleString()}`,
          icon: TrendingUp,
          color: "text-cyan-500",
          change: "",
        },
      ];

      setStats(computed);
      setLoading(false);
    }
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {(loading ? [1, 2, 3, 4] : stats).map((stat: any, index: number) => {
        const Icon = loading ? Users : stat.icon;
        return (
          <Card key={index} className="border-border bg-card p-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 truncate">{loading ? "Loading..." : stat.label}</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
                  {loading ? <span className="inline-block w-20 sm:w-24 h-6 sm:h-7 bg-muted animate-pulse rounded" /> : stat.value}
                </p>
                {!loading && stat.change ? (
                  <p className="text-xs text-muted-foreground mt-1 sm:mt-2">{stat.change}</p>
                ) : null}
              </div>
              <div className={`p-2 sm:p-3 rounded-lg bg-muted flex-shrink-0 ${loading ? "text-muted-foreground" : stat.color}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  )
}
