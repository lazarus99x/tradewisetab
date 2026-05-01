"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function AdminLoansPage() {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("1000");
  const [rate, setRate] = useState("10");
  const [days, setDays] = useState("30");
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase
      .from("loans")
      .select("*")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    await supabase
      .from("loans")
      .insert({ title, amount, interest_rate: rate, duration_days: days });
    setTitle("");
    await load();
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Loan Offers</h1>
      <div className="grid gap-2 max-w-xl">
        <input
          placeholder="Title"
          className="border rounded px-3 py-2 bg-background"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            placeholder="Amount"
            className="border rounded px-3 py-2 bg-background"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            placeholder="Rate %"
            className="border rounded px-3 py-2 bg-background"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <input
            placeholder="Days"
            className="border rounded px-3 py-2 bg-background"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
        <Button onClick={create}>Create</Button>
      </div>
      <LoansApprovalPanel />
      <div className="space-y-3">
        {rows.map((l) => (
          <div key={l.id} className="border rounded p-4">
            <div className="font-medium">{l.title ?? "Loan"}</div>
            <div className="text-sm text-muted-foreground">
              ${l.amount} — {l.interest_rate}% for {l.duration_days} days
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoansApprovalPanel() {
  const [pending, setPending] = useState<any[]>([]);
  async function load() {
    const { data } = await supabase
      .from("loan_applications")
      .select("*, loans(title, amount)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setPending(data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function approve(app: any) {
    await supabase
      .from("loan_applications")
      .update({ status: "approved" })
      .eq("id", app.id);
    const amount = Number(app.loans?.amount ?? 0);
    await supabase
      .from("user_balances")
      .upsert({ user_id: app.user_id })
      .eq("user_id", app.user_id);
    await supabase
      .from("transactions")
      .insert({ user_id: app.user_id, type: "loan_disbursal", amount });
    const { data: bal } = await supabase
      .from("user_balances")
      .select("balance")
      .eq("user_id", app.user_id)
      .maybeSingle();
    const current = Number((bal as any)?.balance ?? 0);
    await supabase
      .from("user_balances")
      .update({ balance: current + amount })
      .eq("user_id", app.user_id);
    await load();
  }

  async function reject(app: any) {
    await supabase
      .from("loan_applications")
      .update({ status: "rejected" })
      .eq("id", app.id);
    await load();
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Pending Applications</h2>
      {pending.map((a) => (
        <div
          key={a.id}
          className="border rounded p-4 flex items-center justify-between"
        >
          <div>
            <div className="font-medium">{a.loans?.title ?? a.loan_id}</div>
            <div className="text-sm text-muted-foreground">
              User: {a.user_id}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => approve(a)}>Approve & Deposit</Button>
            <Button variant="outline" onClick={() => reject(a)}>
              Reject
            </Button>
          </div>
        </div>
      ))}
      {pending.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No pending applications.
        </div>
      )}
    </div>
  );
}
