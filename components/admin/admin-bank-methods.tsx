"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { Building2, Plus, Save, X, Edit2, Trash2 } from "lucide-react";

export function AdminBankMethods() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    sort_code: "",
    swift_code: "",
    routing_number: "",
    currency: "USD",
  });

  useEffect(() => { loadMethods(); }, []);

  async function loadMethods() {
    setFetching(true);
    try {
      const { data } = await supabase
        .from("bank_deposit_methods")
        .select("*")
        .order("created_at", { ascending: false });
      setMethods(data || []);
    } catch (e: any) {
      console.error("Error loading bank methods:", e);
    } finally {
      setFetching(false);
    }
  }

  function resetForm() {
    setForm({ bank_name: "", account_name: "", account_number: "", sort_code: "", swift_code: "", routing_number: "", currency: "USD" });
    setEditingId(null);
  }

  function startEdit(method?: any) {
    if (method) {
      setForm({
        bank_name: method.bank_name || "",
        account_name: method.account_name || "",
        account_number: method.account_number || "",
        sort_code: method.sort_code || "",
        swift_code: method.swift_code || "",
        routing_number: method.routing_number || "",
        currency: method.currency || "USD",
      });
      setEditingId(method.id);
    } else {
      resetForm();
      setEditingId("new");
    }
  }

  async function saveMethod() {
    if (!form.bank_name || !form.account_name || !form.account_number) {
      toast.error("Bank name, account name, and account number are required");
      return;
    }
    setLoading(true);
    try {
      if (editingId && editingId !== "new") {
        const { error } = await supabase
          .from("bank_deposit_methods")
          .update({
            bank_name: form.bank_name,
            account_name: form.account_name,
            account_number: form.account_number,
            sort_code: form.sort_code || null,
            swift_code: form.swift_code || null,
            routing_number: form.routing_number || null,
            currency: form.currency,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Bank method updated");
      } else {
        const { error } = await supabase.from("bank_deposit_methods").insert({
          bank_name: form.bank_name,
          account_name: form.account_name,
          account_number: form.account_number,
          sort_code: form.sort_code || null,
          swift_code: form.swift_code || null,
          routing_number: form.routing_number || null,
          currency: form.currency,
          active: true,
        });
        if (error) throw error;
        toast.success("Bank method added");
      }
      resetForm();
      loadMethods();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(method: any) {
    try {
      const { error } = await supabase
        .from("bank_deposit_methods")
        .update({ active: !method.active, updated_at: new Date().toISOString() })
        .eq("id", method.id);
      if (error) throw error;
      toast.success(method.active ? "Deactivated" : "Activated");
      loadMethods();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function deleteMethod(id: string) {
    if (!confirm("Delete this bank method?")) return;
    try {
      const { error } = await supabase.from("bank_deposit_methods").delete().eq("id", id);
      if (error) throw error;
      toast.success("Deleted");
      loadMethods();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
        <h2 className="text-lg sm:text-xl font-semibold">Bank Deposit Methods</h2>
        {!editingId && (
          <Button onClick={() => startEdit()} variant="outline">
            <Plus className="w-4 h-4 mr-2" /> Add Bank Method
          </Button>
        )}
      </div>

      {/* Edit/Create Form */}
      {editingId && (
        <Card className="p-3 sm:p-4 mb-4 sm:mb-6 bg-muted">
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Bank Name *</label>
                <Input value={form.bank_name} onChange={(e) => setForm({...form, bank_name: e.target.value})} placeholder="e.g., Chase Bank" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Account Name *</label>
                <Input value={form.account_name} onChange={(e) => setForm({...form, account_name: e.target.value})} placeholder="e.g., TradeWiseTabs LTD" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Account Number *</label>
                <Input value={form.account_number} onChange={(e) => setForm({...form, account_number: e.target.value})} placeholder="e.g., 1234567890" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sort Code</label>
                <Input value={form.sort_code} onChange={(e) => setForm({...form, sort_code: e.target.value})} placeholder="e.g., 12-34-56" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">SWIFT / BIC Code</label>
                <Input value={form.swift_code} onChange={(e) => setForm({...form, swift_code: e.target.value})} placeholder="e.g., CHASUS33" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Routing Number</label>
                <Input value={form.routing_number} onChange={(e) => setForm({...form, routing_number: e.target.value})} placeholder="e.g., 021000021" />
              </div>
            </div>
            <div className="flex gap-2">
              <LoadingButton onClick={saveMethod} loading={loading}>
                <Save className="w-4 h-4 mr-2" /> Save
              </LoadingButton>
              <Button onClick={resetForm} variant="outline">
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Methods List */}
      {fetching ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : methods.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No bank methods configured yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((m) => (
            <div key={m.id} className={"flex items-center justify-between p-4 border rounded-lg " + (!m.active ? "opacity-50" : "")}>
              <div className="flex items-center gap-3 flex-1">
                <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{m.bank_name}</span>
                    {m.active ? (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-gray-500/20 text-gray-500 rounded">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground break-all">
                    {m.account_name} • {m.account_number}
                  </p>
                  {(m.sort_code || m.swift_code || m.routing_number) && (
                    <p className="text-xs text-muted-foreground">
                      {m.sort_code && "Sort: " + m.sort_code}
                      {m.sort_code && m.swift_code && " • "}
                      {m.swift_code && "SWIFT: " + m.swift_code}
                      {m.routing_number && " • Routing: " + m.routing_number}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button onClick={() => toggleActive(m)} variant="outline" size="sm" className={m.active ? "text-yellow-500" : "text-green-500"}>
                  {m.active ? "Deactivate" : "Activate"}
                </Button>
                <Button onClick={() => startEdit(m)} variant="outline" size="icon">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button onClick={() => deleteMethod(m.id)} variant="outline" size="icon" className="text-red-500 border-red-500/50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}