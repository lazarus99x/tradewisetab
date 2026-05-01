"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Users,
  Trash2,
  Pause,
  Play,
} from "lucide-react";

export default function AdminFundManagementPage() {
  const [clerkUsers, setClerkUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState<
    "deposit" | "withdrawal" | "profit" | "loss"
  >("deposit");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadClerkUsers() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        // API returns { users: [...] }, extract the array
        const users = Array.isArray(data.users) ? data.users : Array.isArray(data) ? data : [];
        setClerkUsers(users);
      } else {
        toast.error("Failed to fetch users");
        setClerkUsers([]);
      }
    } catch (error) {
      console.error("Error loading Clerk users:", error);
      toast.error("Error loading users. Please try again.");
      setClerkUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClerkUsers();
  }, []);

  const filteredUsers = Array.isArray(clerkUsers) 
    ? clerkUsers.filter(
        (user) =>
          user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user?.emailAddresses?.[0]?.emailAddress
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          user?.id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  async function syncUserToSupabase(clerkUser: any) {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", clerkUser.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile
        await supabase.from("profiles").insert({
          user_id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          full_name:
            `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
            "No name",
          kyc_status: "pending",
        });
      }

      // Check if balance exists
      const { data: existingBalance } = await supabase
        .from("user_balances")
        .select("*")
        .eq("user_id", clerkUser.id)
        .maybeSingle();

      if (!existingBalance) {
        // Create balance record with new columns
        await supabase.from("user_balances").insert({
          user_id: clerkUser.id,
          account_balance: 0,
          profit_balance: 0,
          trading_balance: 0,
          funding_balance: 0,
          balance: 0,
        });
      }
    } catch (error) {
      console.error("Error syncing user to Supabase:", error);
      toast.error("Error syncing user data");
    }
  }

  async function applyTransaction() {
    if (!selectedUser || !amount) {
      toast.error("Please select a user and enter an amount");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setActionLoading("transaction");

    try {
      // First ensure user has records
      await syncUserToSupabase(selectedUser);

      // Calculate the delta amount
      const deltaAmount =
        transactionType === "withdrawal" || transactionType === "loss"
          ? -amountNum
          : amountNum;

      // Get current balance
      const { data: currentBalance, error: fetchError } = await supabase
        .from("user_balances")
        .select("*")
        .eq("user_id", selectedUser.id)
        .single();

      if (fetchError || !currentBalance) {
        console.error("Error fetching current balance:", fetchError);
        toast.error("Error fetching user balance");
        return;
      }

      // Update balance - handle both old and new schema
      let updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Check if new columns exist by trying to update with them
      if (transactionType === "profit") {
        updateData.profit_balance =
          (currentBalance.profit_balance || 0) + deltaAmount;
      } else if (transactionType === "deposit") {
        updateData.account_balance =
          (currentBalance.account_balance || currentBalance.balance || 0) +
          deltaAmount;
        updateData.funding_balance =
          (currentBalance.funding_balance || 0) + deltaAmount;
        updateData.trading_balance =
          (currentBalance.trading_balance ||
            currentBalance.account_balance ||
            currentBalance.balance ||
            0) + deltaAmount;
        // Also update old balance field if it exists
        if (currentBalance.balance !== undefined) {
          updateData.balance = (currentBalance.balance || 0) + deltaAmount;
        }
      } else if (
        transactionType === "withdrawal" ||
        transactionType === "loss"
      ) {
        updateData.account_balance =
          (currentBalance.account_balance || currentBalance.balance || 0) +
          deltaAmount;
        if (currentBalance.balance !== undefined) {
          updateData.balance = (currentBalance.balance || 0) + deltaAmount;
        }
      }

      // Calculate total
      if (
        updateData.account_balance !== undefined ||
        updateData.profit_balance !== undefined
      ) {
        const accountBal =
          updateData.account_balance !== undefined
            ? updateData.account_balance
            : currentBalance.account_balance || currentBalance.balance || 0;
        const profitBal =
          updateData.profit_balance !== undefined
            ? updateData.profit_balance
            : currentBalance.profit_balance || 0;
        updateData.balance = accountBal + profitBal;
      }

      const { error: balanceError } = await supabase
        .from("user_balances")
        .update(updateData)
        .eq("user_id", selectedUser.id);

      if (balanceError) {
        console.error("Error updating balance:", balanceError);
        console.error("Balance update data:", {
          user_id: selectedUser.id,
          currentBalance: currentBalance.balance,
          deltaAmount,
          newBalance,
        });
        toast.error(`Error updating user balance: ${balanceError.message}`);
        return;
      }

      // Add transaction record - try with description first, fallback without it
      let transactionData = {
        user_id: selectedUser.id,
        type: transactionType,
        amount: amountNum,
      };

      // Try to add description if provided
      if (description) {
        transactionData = { ...transactionData, description };
      }

      const { error: transactionError } = await supabase
        .from("transactions")
        .insert(transactionData);

      if (transactionError) {
        console.error("Error creating transaction:", transactionError);
        console.error("Transaction data:", {
          user_id: selectedUser.id,
          type: transactionType,
          amount: amountNum,
          description: description || `${transactionType} adjustment`,
        });
        toast.error(`Error recording transaction: ${transactionError.message}`);
        return;
      }

      setAmount("");
      setDescription("");
      setSelectedUser(null);

      const actionText =
        transactionType === "deposit"
          ? "deposited"
          : transactionType === "withdrawal"
            ? "withdrawn"
            : transactionType === "profit"
              ? "added profit"
              : "added loss";

      toast.success(
        `Successfully ${actionText} $${amountNum} to ${selectedUser.firstName || selectedUser.id}`
      );
    } catch (error) {
      console.error("Error applying transaction:", error);
      toast.error("Error applying transaction. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function suspendUser(userId: string) {
    setActionLoading(`suspend-${userId}`);
    try {
      // Update user status in Supabase
      await supabase
        .from("profiles")
        .update({ kyc_status: "suspended" })
        .eq("user_id", userId);

      toast.success("User suspended successfully");
      await loadClerkUsers();
    } catch (error) {
      console.error("Error suspending user:", error);
      toast.error("Error suspending user. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(userId: string) {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    setActionLoading(`delete-${userId}`);
    try {
      // Delete user data from Supabase
      await supabase.from("user_balances").delete().eq("user_id", userId);
      await supabase.from("transactions").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("user_id", userId);

      toast.success("User deleted successfully");
      await loadClerkUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error deleting user. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Fund Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage user balances and transactions (Powered by Clerk)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Search */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Find User</h2>
          </div>

          <div className="space-y-4">
            <Input
              placeholder="Search by name, email, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="max-h-96 overflow-y-auto space-y-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Loading users...</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? "border-[#00FE01] bg-[#00FE01]/5"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.firstName || user.lastName || "No name"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.emailAddresses[0]?.emailAddress || "No email"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            ID: {user.id.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-blue-500">Clerk User</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              suspendUser(user.id);
                            }}
                            disabled={actionLoading === `suspend-${user.id}`}
                            className="p-1 h-8 w-8"
                          >
                            {actionLoading === `suspend-${user.id}` ? (
                              <Users className="w-3 h-3 animate-spin" />
                            ) : (
                              <Pause className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteUser(user.id);
                            }}
                            disabled={actionLoading === `delete-${user.id}`}
                            className="p-1 h-8 w-8 text-red-500 hover:text-red-700"
                          >
                            {actionLoading === `delete-${user.id}` ? (
                              <Users className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Transaction Form */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Apply Transaction</h2>
          </div>

          {selectedUser ? (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">
                  Selected User:{" "}
                  {selectedUser.firstName && selectedUser.lastName
                    ? `${selectedUser.firstName} ${selectedUser.lastName}`
                    : selectedUser.firstName ||
                      selectedUser.lastName ||
                      "No name"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedUser.emailAddresses[0]?.emailAddress || "No email"}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  Clerk ID: {selectedUser.id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Transaction Type
                </label>
                <select
                  className="w-full border rounded px-3 py-2 bg-background"
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as any)}
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="profit">Add Profit</option>
                  <option value="loss">Add Loss</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description (Optional)
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2 bg-background"
                  rows={3}
                  placeholder="Transaction description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <LoadingButton
                onClick={applyTransaction}
                loading={actionLoading === "transaction"}
                className={`w-full ${
                  transactionType === "deposit" || transactionType === "profit"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {transactionType === "deposit" && (
                  <TrendingUp className="w-4 h-4 mr-2" />
                )}
                {transactionType === "withdrawal" && (
                  <TrendingDown className="w-4 h-4 mr-2" />
                )}
                {transactionType === "profit" && (
                  <TrendingUp className="w-4 h-4 mr-2" />
                )}
                {transactionType === "loss" && (
                  <TrendingDown className="w-4 h-4 mr-2" />
                )}
                {transactionType === "deposit"
                  ? "Deposit Funds"
                  : transactionType === "withdrawal"
                    ? "Withdraw Funds"
                    : transactionType === "profit"
                      ? "Add Profit"
                      : "Add Loss"}
              </LoadingButton>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Select a user to manage their funds</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
