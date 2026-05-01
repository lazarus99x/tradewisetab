"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function UserLoansPage() {
  const { user } = useUser();
  const [offers, setOffers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);

  async function load() {
    const { data: loanData } = await supabase
      .from("loans")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setOffers(loanData ?? []);
    if (user?.id) {
      const { data: appData } = await supabase
        .from("loan_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setApps(appData ?? []);
    }
  }
  useEffect(() => {
    load();
  }, [user?.id]);

  async function apply(loan_id: string) {
    if (!user?.id) return;
    await supabase
      .from("loan_applications")
      .insert({ user_id: user.id, loan_id });
    await load();
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Loan Offers</h1>
      <div className="space-y-3">
        {offers.map((l) => (
          <div
            key={l.id}
            className="border rounded p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-medium">{l.title ?? "Loan"}</div>
              <div className="text-sm text-muted-foreground">
                ${l.amount} — {l.interest_rate}% for {l.duration_days} days
              </div>
            </div>
            <Button onClick={() => apply(l.id)}>Apply</Button>
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-xl font-semibold mt-8">My Applications</h2>
        <div className="space-y-2 mt-2">
          {apps.map((a) => (
            <div
              key={a.id}
              className="border rounded p-3 text-sm flex items-center justify-between"
            >
              <div>{a.loan_id}</div>
              <div className="uppercase">{a.status}</div>
            </div>
          ))}
          {apps.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No applications.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
