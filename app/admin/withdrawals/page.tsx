"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Bitcoin,
  Coins,
  DollarSign,
  Save,
  Edit2,
  Plus,
} from "lucide-react";

type Currency = "BTC" | "ETH" | "USDT";

export default function AdminWithdrawalsPage() {
  const [activeTab, setActiveTab] = useState<"methods" | "requests">(
    "requests"
  );
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingMethod, setEditingMethod] = useState<string | null>(null);
  const [methodForm, setMethodForm] = useState({
    currency: "" as Currency | "",
    network: "",
    icon_url: "",
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("admin_withdrawals_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawal_requests",
        },
        () => loadWithdrawalRequests()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawal_methods",
        },
        () => loadWithdrawalMethods()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData() {
    setFetching(true);
    await Promise.all([loadWithdrawalRequests(), loadWithdrawalMethods()]);
    setFetching(false);
  }

  async function loadWithdrawalMethods() {
    try {
      const { data, error } = await supabase
        .from("withdrawal_methods")
        .select("*")
        .order("currency, network");

      if (error) {
        console.error("Error loading methods:", error);
        toast.error("Failed to load withdrawal methods");
      } else {
        setWithdrawalMethods(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }

  function startEditMethod(method?: any) {
    if (method) {
      setEditingMethod(method.id);
      setMethodForm({
        currency: method.currency,
        network: method.network,
        icon_url: method.icon_url || "",
      });
      setIconPreview(method.icon_url || "");
    } else {
      setEditingMethod("new");
      setMethodForm({ currency: "", network: "", icon_url: "" });
      setIconPreview("");
    }
    setIconFile(null);
  }

  function cancelEdit() {
    setEditingMethod(null);
    setMethodForm({ currency: "", network: "", icon_url: "" });
    setIconFile(null);
    setIconPreview("");
  }

  function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Icon file size must be less than 2MB");
      return;
    }

    setIconFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function uploadIcon(file: File): Promise<string> {
    const fileName = `withdrawal-icons/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const { error } = await supabase.storage
      .from("funding-images")
      .upload(fileName, file);

    if (error && error.message?.includes("already exists")) {
      await supabase.storage.from("funding-images").remove([fileName]);
      const { error: retryError } = await supabase.storage
        .from("funding-images")
        .upload(fileName, file);
      if (retryError)
        throw new Error(`Icon upload failed: ${retryError.message}`);
    } else if (error) {
      throw new Error(`Icon upload failed: ${error.message}`);
    }

    const { data } = supabase.storage
      .from("funding-images")
      .getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function saveMethod() {
    if (!methodForm.currency || !methodForm.network.trim()) {
      toast.error("Please fill in currency and network");
      return;
    }

    setLoading(true);
    try {
      let iconUrl = methodForm.icon_url;
      if (iconFile) {
        iconUrl = await uploadIcon(iconFile);
      }

      if (editingMethod === "new") {
        const { error } = await supabase.from("withdrawal_methods").insert({
          currency: methodForm.currency,
          network: methodForm.network.trim(),
          icon_url: iconUrl || null,
          active: true,
        });
        if (error) throw error;
        toast.success("Withdrawal method added successfully");
      } else {
        const { error } = await supabase
          .from("withdrawal_methods")
          .update({
            currency: methodForm.currency,
            network: methodForm.network.trim(),
            icon_url: iconUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMethod);
        if (error) throw error;
        toast.success("Withdrawal method updated successfully");
      }

      cancelEdit();
      loadWithdrawalMethods();
    } catch (error: any) {
      console.error("Error saving method:", error);
      toast.error(error.message || "Failed to save withdrawal method");
    } finally {
      setLoading(false);
    }
  }

  async function loadWithdrawalRequests() {
    setFetching(true);
    try {
      let query = supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading requests:", error);
        toast.error("Failed to load withdrawal requests");
      } else {
        // Fetch user details for each request
        const requestsWithUsers = await Promise.all(
          (data || []).map(async (req) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", req.user_id)
              .single();

            return {
              ...req,
              user_name: profile?.full_name || req.user_id,
              user_email: profile?.email || "N/A",
            };
          })
        );
        setWithdrawalRequests(requestsWithUsers);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    loadWithdrawalRequests();
  }, [filterStatus]);

  async function handleWithdrawalAction(
    requestId: string,
    action: "approve" | "reject" | "complete",
    transactionHash?: string,
    reason?: string
  ) {
    setLoading(true);
    try {
      const { data: request, error: fetchError } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError || !request) {
        throw new Error("Withdrawal request not found");
      }

      if (action === "approve" || action === "complete") {
        // Check if user has sufficient balance
        const { data: currentBalance, error: balanceError } = await supabase
          .from("user_balances")
          .select("account_balance, balance")
          .eq("user_id", request.user_id)
          .single();

        if (balanceError && balanceError.code !== "PGRST116") {
          console.error("Error fetching balance:", balanceError);
        }

        const currentBal =
          currentBalance?.account_balance || currentBalance?.balance || 0;
        const withdrawalAmount = parseFloat(request.amount.toString());

        if (currentBal < withdrawalAmount) {
          toast.error("User has insufficient balance");
          setLoading(false);
          return;
        }

        // Update withdrawal request status
        const updateData: any = {
          status: action === "complete" ? "completed" : "processing",
          updated_at: new Date().toISOString(),
        };

        if (transactionHash) {
          updateData.transaction_hash = transactionHash;
        }

        const { error: updateError } = await supabase
          .from("withdrawal_requests")
          .update(updateData)
          .eq("id", requestId);

        if (updateError) throw updateError;

        // If approving, deduct from user balance and create transaction
        if (action === "approve") {
          const newBalance = currentBal - withdrawalAmount;

          const updateBalanceData: any = {
            account_balance: newBalance,
            updated_at: new Date().toISOString(),
          };

          if (currentBalance?.balance !== undefined) {
            updateBalanceData.balance = newBalance;
          }

          const { error: balanceUpdateError } = await supabase
            .from("user_balances")
            .upsert(
              {
                user_id: request.user_id,
                ...updateBalanceData,
              },
              {
                onConflict: "user_id",
              }
            );

          if (balanceUpdateError) {
            console.error("Error updating balance:", balanceUpdateError);
            toast.error(
              "Withdrawal approved but failed to update balance. Please update manually."
            );
          }

          // Create transaction record
          await supabase.from("transactions").insert({
            user_id: request.user_id,
            type: "withdrawal",
            amount: -withdrawalAmount,
            description: `Withdrawal: ${request.amount} ${request.currency} to ${request.destination_address?.substring(0, 20)}...`,
          });

          toast.success("Withdrawal approved and balance updated");
        } else {
          toast.success("Withdrawal marked as completed");
        }
      } else {
        // Reject withdrawal
        const { error: updateError } = await supabase
          .from("withdrawal_requests")
          .update({
            status: "rejected",
            rejection_reason: reason || "Withdrawal request rejected by admin",
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        if (updateError) throw updateError;
        toast.success("Withdrawal request rejected");
      }

      loadWithdrawalRequests();
    } catch (error: any) {
      console.error("Error processing withdrawal:", error);
      toast.error(error.message || "Failed to process withdrawal");
    } finally {
      setLoading(false);
    }
  }

  function getCurrencyIcon(currency: string) {
    switch (currency) {
      case "BTC":
        return Bitcoin;
      case "ETH":
        return Coins;
      case "USDT":
        return DollarSign;
      default:
        return Bitcoin;
    }
  }

  const pendingCount = withdrawalRequests.filter(
    (r) => r.status === "pending"
  ).length;
  const processingCount = withdrawalRequests.filter(
    (r) => r.status === "processing"
  ).length;

  const currencies = [
    { value: "BTC", label: "Bitcoin", icon: Bitcoin },
    { value: "ETH", label: "Ethereum", icon: Coins },
    { value: "USDT", label: "USDT", icon: DollarSign },
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Withdrawal Management
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage withdrawal methods and review withdrawal requests
        </p>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 mb-4 sm:mb-6 border-b overflow-x-auto">
        <button
          onClick={() => setActiveTab("methods")}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "methods"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Withdrawal Methods
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "requests"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Withdrawal Requests ({pendingCount} pending)
        </button>
      </div>

      {/* Methods Management */}
      {activeTab === "methods" && (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">
              Manage Withdrawal Methods
            </h2>
            {!editingMethod && (
              <Button onClick={() => startEditMethod()} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add New Method
              </Button>
            )}
          </div>

          {editingMethod && (
            <Card className="p-3 sm:p-4 mb-4 sm:mb-6 bg-muted">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Currency
                  </label>
                  <select
                    value={methodForm.currency}
                    onChange={(e) =>
                      setMethodForm({
                        ...methodForm,
                        currency: e.target.value as Currency,
                      })
                    }
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    disabled={editingMethod !== "new"}
                  >
                    <option value="">Select currency...</option>
                    {currencies.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Network
                  </label>
                  <Input
                    value={methodForm.network}
                    onChange={(e) =>
                      setMethodForm({ ...methodForm, network: e.target.value })
                    }
                    placeholder="e.g., Bitcoin, Ethereum, TRC20, ERC20, BEP20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Method Icon (Optional)
                  </label>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleIconChange}
                      className="cursor-pointer text-xs sm:text-sm"
                    />
                    {iconPreview && (
                      <div className="mt-2">
                        <img
                          src={iconPreview}
                          alt="Icon preview"
                          className="w-16 h-16 object-contain rounded border bg-muted p-2"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload an icon for this withdrawal method (max 2MB)
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <LoadingButton onClick={saveMethod} loading={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </LoadingButton>
                  <Button onClick={cancelEdit} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {withdrawalMethods.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No withdrawal methods yet. Add your first method above.
              </div>
            ) : (
              withdrawalMethods.map((method) => {
                const currencyInfo = currencies.find(
                  (c) => c.value === method.currency
                );
                const Icon = currencyInfo?.icon || Bitcoin;
                const isActive = method.active;

                return (
                  <div
                    key={method.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      !isActive ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1">
                      {method.icon_url ? (
                        <img
                          src={method.icon_url}
                          alt={method.currency}
                          className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                        />
                      ) : (
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{method.currency}</span>
                          <span className="text-sm text-muted-foreground">
                            •
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {method.network}
                          </span>
                          {isActive && (
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded">
                              Active
                            </span>
                          )}
                          {!isActive && (
                            <span className="text-xs px-2 py-1 bg-gray-500/20 text-gray-500 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created:{" "}
                          {new Date(method.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => startEditMethod(method)}
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                    >
                      <Edit2 className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* Withdrawal Requests */}
      {activeTab === "requests" && (
        <div>
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4 sm:mb-6 border-b overflow-x-auto">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                filterStatus === "all"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({withdrawalRequests.length})
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                filterStatus === "pending"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus("processing")}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                filterStatus === "processing"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Processing ({processingCount})
            </button>
            <button
              onClick={() => setFilterStatus("completed")}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                filterStatus === "completed"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilterStatus("rejected")}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                filterStatus === "rejected"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rejected
            </button>
          </div>

          {/* Requests List */}
          {fetching ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : withdrawalRequests.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No withdrawal requests found
            </Card>
          ) : (
            <div className="space-y-4">
              {withdrawalRequests.map((request) => {
                const CurrencyIcon = getCurrencyIcon(request.currency);
                return (
                  <Card key={request.id} className="p-4 sm:p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <CurrencyIcon className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="font-semibold text-base sm:text-lg">
                            {request.amount} USD ({request.currency})
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              request.status === "completed" ||
                              request.status === "approved"
                                ? "bg-green-500/20 text-green-500"
                                : request.status === "rejected"
                                  ? "bg-red-500/20 text-red-500"
                                  : request.status === "processing"
                                    ? "bg-blue-500/20 text-blue-500"
                                    : "bg-yellow-500/20 text-yellow-500"
                            }`}
                          >
                            {request.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          User: {request.user_name} ({request.user_email})
                        </p>
                        <p className="text-sm text-muted-foreground mb-1 font-mono break-all">
                          To: {request.destination_address}
                        </p>
                        <p className="text-sm text-muted-foreground mb-1">
                          Network: {request.network || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                        {request.transaction_hash && (
                          <p className="text-sm text-green-500 font-mono break-all">
                            TX Hash: {request.transaction_hash}
                          </p>
                        )}
                        {request.rejection_reason && (
                          <p className="text-sm text-red-500 mt-2">
                            Rejection Reason: {request.rejection_reason}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {request.status === "pending" && (
                          <>
                            <LoadingButton
                              onClick={() =>
                                handleWithdrawalAction(request.id, "approve")
                              }
                              loading={loading}
                              className="text-sm"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </LoadingButton>
                            <Button
                              onClick={() => {
                                const reason = prompt(
                                  "Enter rejection reason:"
                                );
                                if (reason) {
                                  handleWithdrawalAction(
                                    request.id,
                                    "reject",
                                    undefined,
                                    reason
                                  );
                                }
                              }}
                              variant="destructive"
                              size="sm"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                        {request.status === "processing" && (
                          <LoadingButton
                            onClick={() => {
                              const txHash = prompt(
                                "Enter transaction hash (optional):"
                              );
                              handleWithdrawalAction(
                                request.id,
                                "complete",
                                txHash || undefined
                              );
                            }}
                            loading={loading}
                            className="text-sm"
                          >
                            Mark as Completed
                          </LoadingButton>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
