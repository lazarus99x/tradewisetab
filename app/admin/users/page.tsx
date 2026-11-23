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

  // Reset password dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");

  // Transaction form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState<
    "deposit" | "withdrawal" | "profit" | "loss" | "trade_add" | "trade_subtract"
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
      setShowResetDialog(true);
      setResetNewPassword("");
      setResetConfirmPassword("");
      return;
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

  async function handleResetPassword() {
    if (!selectedUser) return;
    if (!resetNewPassword || resetNewPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setActionLoading("reset_password");
    try {
      const response = await fetch("/api/admin/users/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", userId: selectedUser.id, newPassword: resetNewPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to reset password");

      toast.success(data.message || "Password reset successfully");
      setShowResetDialog(false);
      setResetNewPassword("");
      setResetConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
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

      const isSubtract = transactionType === "withdrawal" || transactionType === "loss" || transactionType === "trade_subtract";
      const deltaAmount = isSubtract ? -amountNum : amountNum;

      let { data: currentBalance } = await supabase
        .from("user_balances")
        .select("*")
        .eq("user_id", selectedUser.id)
        .maybeSingle();

      if (!currentBalance) {
        const { data: newBalance, error: insertErr } = await supabase
          .from("user_balances")
          .insert({
            user_id: selectedUser.id,
            account_balance: 0,
            trading_balance: 0,
            profit_balance: 0,
            funding_balance: 0,
          })
          .select()
          .single();
          
        if (insertErr) {
          toast.error("Failed to create user balance");
          return;
        }
        currentBalance = newBalance;
      }

      let updateData: any = { updated_at: new Date().toISOString() };

      // Independent operations - no cross-connections between fields
      if (transactionType === "deposit") {
        updateData.account_balance = (currentBalance.account_balance || 0) + deltaAmount;
      } else if (transactionType === "withdrawal") {
        updateData.account_balance = (currentBalance.account_balance || 0) + deltaAmount;
      } else if (transactionType === "profit") {
        updateData.profit_balance = (currentBalance.profit_balance || 0) + deltaAmount;
      } else if (transactionType === "loss") {
        updateData.account_balance = (currentBalance.account_balance || 0) + deltaAmount;
      } else if (transactionType === "trade_add") {
        updateData.trading_balance = (currentBalance.trading_balance || 0) + deltaAmount;
      } else if (transactionType === "trade_subtract") {
        updateData.trading_balance = (currentBalance.trading_balance || 0) + deltaAmount;
      }

      updateData.balance =
        (updateData.account_balance ?? currentBalance.account_balance ?? 0) +
        (updateData.trading_balance ?? currentBalance.trading_balance ?? 0) +
        (updateData.profit_balance ?? currentBalance.profit_balance ?? 0);

      const { error: balanceError } = await supabase
        .from("user_balances")
        .update(updateData)
        .eq("user_id", selectedUser.id);

      if (balanceError) throw balanceError;

      // Log transaction - use valid types from DB check constraint
      const txType = transactionType === "trade_add" ? "deposit" : 
                     transactionType === "trade_subtract" ? "withdrawal" : transactionType;
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: selectedUser.id,
          type: txType,
          amount: amountNum,
          description: description || `${transactionType === "trade_add" ? "Add Trade Balance" : transactionType === "trade_subtract" ? "Subtract Trade Balance" : transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}`,
        });

      if (transactionError) throw transactionError;

      setAmount("");
      setDescription("");
      const actionLabel = 
        transactionType === "deposit" ? "deposited" :
        transactionType === "withdrawal" ? "withdrawn" :
        transactionType === "profit" ? "added profit" :
        transactionType === "loss" ? "added loss" :
        transactionType === "trade_add" ? "added to trade balance" :
        "subtracted from trade balance";
      toast.success(`Successfully ${actionLabel} $${amountNum.toFixed(2)}`);

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
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
          Manage users, balances, and transactions
        </p>
      </div>

      <Tabs id="admin-users-tabs" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="text-xs sm:text-sm">Users & Actions</TabsTrigger>
          <TabsTrigger value="balances" className="text-xs sm:text-sm">Balance Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* User Search */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 shrink-0" />
                <h2 className="text-lg sm:text-xl font-semibold">Find User</h2>
              </div>

              <div className="space-y-4">
                <Input
                  placeholder="Search by name, email, or user ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="max-h-64 sm:max-h-96 overflow-y-auto space-y-2">
                  {loading ? (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
                      Loading users...
                    </div>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedUser?.id === user.id
                            ? "border-[#00FE01] bg-[#00FE01]/5"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.firstName || user.lastName || "No name"}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {user.emailAddresses[0]?.emailAddress ||
                                "No email"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                              ID: {user.id.slice(0, 12)}...
                            </p>
                          </div>
                          {user.publicMetadata?.suspended && (
                            <Ban className="w-4 h-4 text-red-500 shrink-0 ml-2" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
                      No users found
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* User Details & Actions */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 shrink-0" />
                <h2 className="text-lg sm:text-xl font-semibold">User Details</h2>
              </div>

              {selectedUser ? (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm sm:text-base">
                      {selectedUser.firstName && selectedUser.lastName
                        ? `${selectedUser.firstName} ${selectedUser.lastName}`
                        : selectedUser.firstName ||
                          selectedUser.lastName ||
                          "No name"}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {selectedUser.emailAddresses[0]?.emailAddress ||
                        "No email"}
                    </p>
                    <p className="text-xs text-blue-500 mt-1 truncate">
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
                                Trading:
                              </span>
                              <p className="font-semibold text-blue-500">
                                {formatCurrency(userBalance.trading_balance)}
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
                                  (userBalance.account_balance || 0) +
                                    (userBalance.trading_balance || 0) +
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

        <TabsContent value="balances" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* User Selector */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 shrink-0" />
                <h2 className="text-lg sm:text-xl font-semibold">Select User</h2>
              </div>
              <div className="space-y-4">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? "border-[#00FE01] bg-[#00FE01]/5"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <p className="font-medium text-sm sm:text-base truncate">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.firstName || user.lastName || "No name"}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {user.emailAddresses[0]?.emailAddress || "No email"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Transaction Form */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 shrink-0" />
                <h2 className="text-lg sm:text-xl font-semibold">Apply Transaction</h2>
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
                      <div className="mt-2 pt-2 border-t space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Account: <span className="font-semibold">{formatCurrency(userBalance.account_balance)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Trading: <span className="font-semibold text-blue-500">{formatCurrency(userBalance.trading_balance)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total: <span className="font-semibold">
                            {formatCurrency(
                              (userBalance.account_balance || 0) +
                                (userBalance.trading_balance || 0) +
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
                      <option value="trade_add">Add Trade Balance</option>
                      <option value="trade_subtract">Subtract Trade Balance</option>
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
                      transactionType === "profit" ||
                      transactionType === "trade_add"
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
                    {transactionType === "trade_add" && (
                      <TrendingUp className="w-4 h-4 mr-2 text-blue-400" />
                    )}
                    {transactionType === "trade_subtract" && (
                      <TrendingDown className="w-4 h-4 mr-2 text-blue-400" />
                    )}
                    {transactionType === "deposit"
                      ? "Deposit Funds"
                      : transactionType === "withdrawal"
                        ? "Withdraw Funds"
                        : transactionType === "profit"
                          ? "Add Profit"
                          : transactionType === "trade_add"
                            ? "Add Trade Balance"
                            : transactionType === "trade_subtract"
                              ? "Subtract Trade Balance"
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

      {/* Reset Password Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-1">Reset Password</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set a new password for {selectedUser?.firstName || selectedUser?.emailAddresses?.[0]?.emailAddress || "this user"}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">New Password</label>
                <Input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Confirm Password</label>
                <Input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(false)}
                disabled={actionLoading === "reset_password"}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={actionLoading === "reset_password"}
                className="bg-[#00FE01] hover:bg-[#B4FE01] text-black"
              >
                {actionLoading === "reset_password" ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
