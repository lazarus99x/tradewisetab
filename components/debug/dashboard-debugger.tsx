"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DashboardDebugger() {
  const { user } = useUser();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runDebugCheck() {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Check user_balances
      const { data: balanceData, error: balanceError } = await supabase
        .from("user_balances")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Check transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      // Check profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setDebugInfo({
        userId: user.id,
        userEmail: user.emailAddresses[0]?.emailAddress,
        balanceData,
        balanceError,
        transactionData,
        transactionError,
        profileData,
        profileError,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Debug check error:", error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runDebugCheck();
  }, [user?.id]);

  if (!user) return null;

  return (
    <Card className="p-4 m-4 bg-yellow-50 border-yellow-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-yellow-800">
          Dashboard Debug Info
        </h3>
        <Button
          size="sm"
          onClick={runDebugCheck}
          disabled={loading}
          className="text-xs"
        >
          {loading ? "Checking..." : "Refresh"}
        </Button>
      </div>

      <div className="text-xs space-y-1">
        <p>
          <strong>User ID:</strong> {debugInfo?.userId}
        </p>
        <p>
          <strong>Email:</strong> {debugInfo?.userEmail}
        </p>

        <div className="mt-2">
          <p>
            <strong>Balance Data:</strong>
          </p>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
            {debugInfo?.balanceData
              ? JSON.stringify(debugInfo.balanceData, null, 2)
              : "No balance data"}
          </pre>
          {debugInfo?.balanceError && (
            <p className="text-red-600">
              Error: {debugInfo.balanceError.message}
            </p>
          )}
        </div>

        <div className="mt-2">
          <p>
            <strong>Transactions:</strong>
          </p>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
            {debugInfo?.transactionData
              ? JSON.stringify(debugInfo.transactionData, null, 2)
              : "No transaction data"}
          </pre>
          {debugInfo?.transactionError && (
            <p className="text-red-600">
              Error: {debugInfo.transactionError.message}
            </p>
          )}
        </div>

        <div className="mt-2">
          <p>
            <strong>Profile:</strong>
          </p>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
            {debugInfo?.profileData
              ? JSON.stringify(debugInfo.profileData, null, 2)
              : "No profile data"}
          </pre>
          {debugInfo?.profileError && (
            <p className="text-red-600">
              Error: {debugInfo.profileError.message}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
