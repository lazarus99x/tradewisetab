"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Trash2,
  Key,
  Ban,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminUsersPage() {
  const [clerkUsers, setClerkUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Transaction form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState<
    "deposit" | "withdrawal" | "profit" | "loss"
  >("deposit");

  // Active tab
  const [activeTab, setActiveTab] = useState("users");

  async function loadClerkUsers() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();

      if (response.ok && data.users) {
        setClerkUsers(Array.isArray(data.users) ? data.users : []);
      } else {
        console.error("Failed to fetch users:", data.error || "Unknown error");
        setClerkUsers([]);
      }
    } catch (error) {
      console.error("Error loading Clerk users:", error);
      toast.error("Failed to load users");
      setClerkUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserProfile(userId: string) {
    setProfileLoading(true);
    try {
      // Use admin API route that bypasses RLS
      const response = await fetch(
        `/api/admin/users/profile?userId=${encodeURIComponent(userId)}`
      );
      const data = await response.json();

      if (!response.ok) {
        console.error("Error loading profile:", data.error || "Unknown error");
        setUserProfile(null);
        setUserBalance(null);
      } else {
        setUserProfile(data.profile || null);
        setUserBalance(data.balance || null);
      }
    } catch (error: any) {
      console.error("Error loading user profile:", error?.message || error);
      setUserProfile(null);
      setUserBalance(null);
    } finally {
      setProfileLoading(false);
    }
  }

  async function createProfileIfNeeded() {
    if (!selectedUser) return;

    try {
      const response = await fetch("/api/admin/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          fullName:
            `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`.trim() ||
            "No name",
          email: selectedUser.emailAddresses[0]?.emailAddress || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create profile");
        return;
      }

      toast.success(data.message || "Profile created successfully");
      await loadUserProfile(selectedUser.id);
    } catch (error: any) {
      toast.error(
        `Error creating profile: ${error?.message || "Unknown error"}`
      );
      console.error("Error creating profile:", error);
    }
  }

  async function performUserAction(
    action: "suspend" | "unsuspend" | "delete" | "reset_password"
  ) {
    if (!selectedUser) return;

    if (action === "delete") {
      if (
        !confirm(
          "Are you sure you want to DELETE this user? This action CANNOT be undone!"
        )
      ) {
        return;
      }
    }

    if (action === "reset_password") {
      if (
        !confirm("This will send a password reset email to the user. Continue?")
      ) {
        return;
      }
    }

    setActionLoading(action);
    try {
      const response = await fetch("/api/admin/users/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: selectedUser.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed");

      toast.success(data.message || "Action completed");

      if (action === "delete") {
        setSelectedUser(null);
        await loadClerkUsers();
      } else {
        await loadUserProfile(selectedUser.id);
        await loadClerkUsers();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to perform action");
    } finally {
      setActionLoading(null);
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
      // Ensure profile exists before transaction
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", selectedUser.id)
        .maybeSingle();

      if (!existingProfile) {
        await createProfileIfNeeded();
      }

      const deltaAmount =
        transactionType === "withdrawal" || transactionType === "loss"
          ? -amountNum
          : amountNum;

      const { data: currentBalance } = await supabase
        .from("user_balances")
        .select("*")
        .eq("user_id", selectedUser.id)
        .single();

      if (!currentBalance) {
        toast.error("User balance not found");
        return;
      }

      let updateData: any = { updated_at: new Date().toISOString() };

      if (transactionType === "profit") {
        updateData.profit_balance =
          (currentBalance.profit_balance || 0) + deltaAmount;
      } else if (transactionType === "deposit") {
        updateData.account_balance =
          (currentBalance.account_balance || 0) + deltaAmount;
        updateData.funding_balance =
          (currentBalance.funding_balance || 0) + deltaAmount;
      } else if (
        transactionType === "withdrawal" ||
        transactionType === "loss"
      ) {
        updateData.account_balance =
          (currentBalance.account_balance || 0) + deltaAmount;
      }

      const accountBal =
        updateData.account_balance !== undefined
          ? updateData.account_balance
          : currentBalance.account_balance || 0;
      const profitBal =
        updateData.profit_balance !== undefined
          ? updateData.profit_balance
          : currentBalance.profit_balance || 0;
      updateData.balance = accountBal + profitBal;

      const { error: balanceError } = await supabase
        .from("user_balances")
        .update(updateData)
        .eq("user_id", selectedUser.id);

      if (balanceError) throw balanceError;

      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: selectedUser.id,
          type: transactionType,
          amount: amountNum,
          description: description || transactionType.charAt(0).toUpperCase() + transactionType.slice(1),
        });

      if (transactionError) throw transactionError;

      setAmount("");
      setDescription("");
      toast.success(
        `Successfully ${transactionType === "deposit" ? "deposited" : transactionType === "withdrawal" ? "withdrawn" : transactionType === "profit" ? "added profit" : "added loss"} $${amountNum.toFixed(2)}`
      );

      await loadUserProfile(selectedUser.id);
    } catch (error: any) {
      toast.error(error.message || "Transaction failed");
    } finally {
      setActionLoading(null);
    }
  }

  useEffect(() => {
    loadClerkUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserProfile(selectedUser.id);
    }
  }, [selectedUser]);

  const filteredUsers = clerkUsers.filter(
    (user) =>
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.emailAddresses[0]?.emailAddress
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getKycStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "suspended":
        return <Ban className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const isSuspended = selectedUser?.publicMetadata?.suspended === true;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, balances, and transactions
        </p>
      </div>

      <Tabs id="admin-users-tabs" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Users & Actions</TabsTrigger>
          <TabsTrigger value="balances">Balance Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
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
                      Loading users...
                    </div>
                  ) : filteredUsers.length > 0 ? (
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
                              {user.emailAddresses[0]?.emailAddress ||
                                "No email"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ID: {user.id.slice(0, 12)}...
                            </p>
                          </div>
                          {user.publicMetadata?.suspended && (
                            <Ban className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* User Details & Actions */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5" />
                <h2 className="text-xl font-semibold">User Details</h2>
              </div>

              {selectedUser ? (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">
                      {selectedUser.firstName && selectedUser.lastName
                        ? `${selectedUser.firstName} ${selectedUser.lastName}`
                        : selectedUser.firstName ||
                          selectedUser.lastName ||
                          "No name"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.emailAddresses[0]?.emailAddress ||
                        "No email"}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                      Clerk ID: {selectedUser.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created:{" "}
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {profileLoading ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>Loading user data...</p>
                    </div>
                  ) : userProfile ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {getKycStatusIcon(userProfile.kyc_status)}
                          <span className="font-medium">KYC Status</span>
                        </div>
                        <span
                          className={`font-semibold capitalize ${
                            userProfile.kyc_status === "verified"
                              ? "text-green-500"
                              : userProfile.kyc_status === "rejected"
                                ? "text-red-500"
                                : userProfile.kyc_status === "suspended"
                                  ? "text-red-500"
                                  : "text-yellow-500"
                          }`}
                        >
                          {userProfile.kyc_status || "pending"}
                        </span>
                      </div>

                      {userBalance && (
                        <div className="p-3 border rounded-lg space-y-2">
                          <p className="text-sm font-medium">
                            Balance Information
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">
                                Account:
                              </span>
                              <p className="font-semibold">
                                {formatCurrency(userBalance.account_balance)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Profit:
                              </span>
                              <p className="font-semibold text-green-500">
                                {formatCurrency(userBalance.profit_balance)}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">
                                Total:
                              </span>
                              <p className="font-semibold text-lg">
                                {formatCurrency(
                                  userBalance.balance ||
                                    (userBalance.account_balance || 0) +
                                      (userBalance.profit_balance || 0)
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 border-t pt-3">
                        <h3 className="font-medium">Account Actions</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {isSuspended ? (
                            <Button
                              onClick={() => performUserAction("unsuspend")}
                              disabled={actionLoading === "unsuspend"}
                              className="bg-green-500 hover:bg-green-600 text-white"
                              size="sm"
                            >
                              {actionLoading === "unsuspend" ? (
                                "..."
                              ) : (
                                <>
                                  <Play className="w-3 h-3 mr-1" />
                                  Unsuspend
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => performUserAction("suspend")}
                              disabled={actionLoading === "suspend"}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white"
                              size="sm"
                            >
                              {actionLoading === "suspend" ? (
                                "..."
                              ) : (
                                <>
                                  <Pause className="w-3 h-3 mr-1" />
                                  Suspend
                                </>
                              )}
                            </Button>
                          )}

                          <Button
                            onClick={() => performUserAction("reset_password")}
                            disabled={actionLoading === "reset_password"}
                            variant="outline"
                            size="sm"
                          >
                            {actionLoading === "reset_password" ? (
                              "..."
                            ) : (
                              <>
                                <Key className="w-3 h-3 mr-1" />
                                Reset Password
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => performUserAction("delete")}
                            disabled={actionLoading === "delete"}
                            variant="destructive"
                            size="sm"
                            className="col-span-2"
                          >
                            {actionLoading === "delete" ? (
                              "..."
                            ) : (
                              <>
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete Account
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 border-t pt-3">
                        <h3 className="font-medium">Update KYC Status</h3>
                        <div className="flex gap-2">
                          <Button
                            onClick={async () => {
                              await supabase
                                .from("profiles")
                                .update({ kyc_status: "verified" })
                                .eq("user_id", selectedUser.id);
                              toast.success("KYC status updated");
                              await loadUserProfile(selectedUser.id);
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white"
                            size="sm"
                          >
                            Verify
                          </Button>
                          <Button
                            onClick={async () => {
                              await supabase
                                .from("profiles")
                                .update({ kyc_status: "rejected" })
                                .eq("user_id", selectedUser.id);
                              toast.success("KYC status updated");
                              await loadUserProfile(selectedUser.id);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white"
                            size="sm"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No profile data found. Click to create profile.</p>
                      <Button
                        onClick={createProfileIfNeeded}
                        className="mt-2"
                        size="sm"
                        variant="outline"
                      >
                        Create Profile
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a user to view details</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="balances" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Selector */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Select User</h2>
              </div>
              <div className="space-y-4">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? "border-[#00FE01] bg-[#00FE01]/5"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <p className="font-medium">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.firstName || user.lastName || "No name"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.emailAddresses[0]?.emailAddress || "No email"}
                      </p>
                    </div>
                  ))}
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
                      {selectedUser.firstName && selectedUser.lastName
                        ? `${selectedUser.firstName} ${selectedUser.lastName}`
                        : selectedUser.firstName ||
                          selectedUser.lastName ||
                          "No name"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.emailAddresses[0]?.emailAddress ||
                        "No email"}
                    </p>
                    {userBalance && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          Current Balance:{" "}
                          <span className="font-semibold">
                            {formatCurrency(
                              userBalance.balance ||
                                (userBalance.account_balance || 0) +
                                  (userBalance.profit_balance || 0)
                            )}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Transaction Type
                    </label>
                    <select
                      className="w-full border rounded px-3 py-2 bg-background"
                      value={transactionType}
                      onChange={(e) =>
                        setTransactionType(e.target.value as any)
                      }
                    >
                      <option value="deposit">Deposit</option>
                      <option value="withdrawal">Withdrawal</option>
                      <option value="profit">Add Profit</option>
                      <option value="loss">Add Loss</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Amount
                    </label>
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
                      className="w-full border rounded px-3 py-2 bg-background resize-none"
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
                      transactionType === "deposit" ||
                      transactionType === "profit"
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
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a user to manage their balance</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
