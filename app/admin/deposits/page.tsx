"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { Copy, Check, CheckCircle, XCircle, Eye, Bitcoin, Coins, DollarSign, Save, Edit2 } from "lucide-react";
import Image from "next/image";

type Currency = "BTC" | "ETH" | "USDT";

export default function AdminDepositsPage() {
  const [activeTab, setActiveTab] = useState<"wallets" | "requests">("requests");
  const [wallets, setWallets] = useState<any[]>([]);
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [walletForm, setWalletForm] = useState({
    currency: "" as Currency | "",
    address: "",
    network: "",
    icon_url: "",
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);
  const [viewingProof, setViewingProof] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel("admin_deposits_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deposit_requests",
        },
        () => loadDepositRequests()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallet_addresses",
        },
        () => loadWallets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData() {
    setFetching(true);
    await Promise.all([loadWallets(), loadDepositRequests()]);
    setFetching(false);
  }

  async function loadWallets() {
    try {
      const { data, error } = await supabase
        .from("wallet_addresses")
        .select("*")
        .order("currency", { ascending: true });

      if (error) {
        console.error("Error loading wallets:", error?.message || error?.code || JSON.stringify(error));
        // Non-fatal: show empty list
      } else {
        setWallets(data || []);
      }
    } catch (error: any) {
      console.error("Error loading wallets:", error?.message || error);
    }
  }

  async function loadDepositRequests() {
    try {
      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error loading deposit requests:", error?.message || error?.code || JSON.stringify(error));
        return; // Non-fatal: leave existing list unchanged
      }

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
      setDepositRequests(requestsWithUsers);
    } catch (error: any) {
      console.error("Error loading deposit requests:", error?.message || error);
    }
  }


  function startEditWallet(wallet: any) {
    setEditingWallet(wallet.id);
    setWalletForm({
      currency: wallet.currency,
      address: wallet.address,
      network: wallet.network || "",
      icon_url: wallet.icon_url || "",
    });
    setIconPreview(wallet.icon_url || "");
    setIconFile(null);
  }

  function cancelEdit() {
    setEditingWallet(null);
    setWalletForm({ currency: "", address: "", network: "", icon_url: "" });
    setIconFile(null);
    setIconPreview("");
  }

  function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload an image file (JPG, PNG, WEBP, SVG)");
      return;
    }

    // Validate file size (2MB max)
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
    const fileName = `wallet-icons/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    
    let uploadError = null;
    const { error } = await supabase.storage
      .from("funding-images")
      .upload(fileName, file);

    if (error && error.message?.includes("already exists")) {
      await supabase.storage.from("funding-images").remove([fileName]);
      const { error: retryError } = await supabase.storage
        .from("funding-images")
        .upload(fileName, file);
      uploadError = retryError;
    } else {
      uploadError = error;
    }

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Icon upload failed: ${uploadError.message || "Unknown error"}`);
    }

    const { data } = supabase.storage.from("funding-images").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function saveWallet() {
    if (!walletForm.currency || !walletForm.address.trim()) {
      toast.error("Please fill in currency and address");
      return;
    }

    setLoading(true);
    try {
      // Upload icon if new file is selected — non-fatal if storage fails
      let iconUrl = walletForm.icon_url;
      if (iconFile) {
        try {
          iconUrl = await uploadIcon(iconFile);
        } catch (iconErr: any) {
          console.warn("Icon upload failed, saving wallet without icon:", iconErr?.message);
          toast.warning("Icon upload failed — wallet saved without icon. Check your Supabase Storage bucket.");
          iconUrl = ""; // continue without icon
        }
      }

      // Deactivate old wallet for this currency if it exists
      if (editingWallet) {
        // Updating existing wallet
        const updateData: any = {
          address: walletForm.address.trim(),
          network: walletForm.network.trim() || null,
          updated_at: new Date().toISOString(),
        };
        
        if (iconUrl) {
          updateData.icon_url = iconUrl;
        }

        const { error: updateError } = await supabase
          .from("wallet_addresses")
          .update(updateData)
          .eq("id", editingWallet);

        if (updateError) throw updateError;
        toast.success("Wallet address updated successfully");
      } else {
        // Creating new wallet - deactivate old ones first
        await supabase
          .from("wallet_addresses")
          .update({ active: false })
          .eq("currency", walletForm.currency)
          .eq("active", true);

        const { error: insertError } = await supabase
          .from("wallet_addresses")
          .insert({
            currency: walletForm.currency,
            address: walletForm.address.trim(),
            network: walletForm.network.trim() || null,
            icon_url: iconUrl || null,
            active: true,
          });

        if (insertError) throw insertError;
        toast.success("Wallet address added successfully");
      }

      cancelEdit();
      loadWallets();
    } catch (error: any) {
      console.error("Error saving wallet:", error);
      toast.error(error.message || "Failed to save wallet address");
    } finally {
      setLoading(false);
    }
  }

  async function activateWallet(walletId: string, currency: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/wallets/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId, currency })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to activate wallet");
      }
      
      toast.success(`${currency} wallet activated`);
      loadWallets();
    } catch (error: any) {
      console.error("Error activating wallet:", error);
      toast.error(error.message || "Failed to activate wallet");
    } finally {
      setLoading(false);
    }
  }

  async function handleDepositAction(requestId: string, action: "approve" | "reject", reason?: string) {
    setLoading(true);
    try {
      // Get the deposit request
      const { data: request, error: fetchError } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError || !request) {
        throw new Error("Deposit request not found");
      }

      if (action === "approve") {
        // Update deposit request status
        const { error: updateError } = await supabase
          .from("deposit_requests")
          .update({
            status: "approved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        if (updateError) throw updateError;

        // Update user balance and create transaction
        const { data: currentBalance, error: balanceError } = await supabase
          .from("user_balances")
          .select("account_balance, balance, funding_balance, trading_balance")
          .eq("user_id", request.user_id)
          .single();

        if (balanceError && balanceError.code !== "PGRST116") {
          console.error("Error fetching balance:", balanceError);
        }

        const currentBal = currentBalance?.account_balance || currentBalance?.balance || 0;
        const fundingBal = currentBalance?.funding_balance || 0;
        const tradingBal = currentBalance?.trading_balance || currentBal || 0;

        // Update balance
        const updateData: any = {
          account_balance: currentBal + parseFloat(request.amount.toString()),
          funding_balance: fundingBal + parseFloat(request.amount.toString()),
          trading_balance: tradingBal + parseFloat(request.amount.toString()),
          updated_at: new Date().toISOString(),
        };

        if (currentBalance?.balance !== undefined) {
          updateData.balance = (currentBalance.balance || 0) + parseFloat(request.amount.toString());
        }

        const { error: balanceUpdateError } = await supabase
          .from("user_balances")
          .upsert({
            user_id: request.user_id,
            ...updateData,
          }, {
            onConflict: "user_id",
          });

        if (balanceUpdateError) {
          console.error("Error updating balance:", balanceUpdateError);
          toast.error("Deposit approved but failed to update balance. Please update manually.");
        }

        // Create transaction record
        await supabase.from("transactions").insert({
          user_id: request.user_id,
          type: "deposit",
          amount: parseFloat(request.amount.toString()),
          description: `Deposit: ${request.amount} ${request.currency} from ${request.source || "Unknown"}`,
        });

        toast.success("Deposit approved and balance updated");
      } else {
        // Reject deposit
        const { error: updateError } = await supabase
          .from("deposit_requests")
          .update({
            status: "rejected",
            rejection_reason: reason || "Deposit request rejected by admin",
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        if (updateError) throw updateError;
        toast.success("Deposit request rejected");
      }

      loadDepositRequests();
    } catch (error: any) {
      console.error("Error processing deposit:", error);
      toast.error(error.message || "Failed to process deposit");
    } finally {
      setLoading(false);
    }
  }

  function copyAddress(address: string, id: string) {
    navigator.clipboard.writeText(address);
    setCopied(id);
    toast.success("Address copied!");
    setTimeout(() => setCopied(null), 2000);
  }

  const currencies: { value: Currency; label: string; icon: any }[] = [
    { value: "BTC", label: "Bitcoin", icon: Bitcoin },
    { value: "ETH", label: "Ethereum", icon: Coins },
    { value: "USDT", label: "USDT", icon: DollarSign },
  ];

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Deposit Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage wallet addresses and review deposit requests
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 sm:mb-6 border-b overflow-x-auto">
        <button
          onClick={() => setActiveTab("wallets")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "wallets"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Wallet Addresses
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "requests"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Deposit Requests ({depositRequests.filter(r => r.status === "pending").length})
        </button>
      </div>

      {/* Wallet Management */}
      {activeTab === "wallets" && (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">Manage Wallet Addresses</h2>
            {!editingWallet && (
              <Button onClick={() => setEditingWallet("new")} variant="outline">
                <Edit2 className="w-4 h-4 mr-2" />
                Add New Wallet
              </Button>
            )}
          </div>

          {editingWallet && (
            <Card className="p-3 sm:p-4 mb-4 sm:mb-6 bg-muted">
              <div className="space-y-3 sm:space-y-4">
                {editingWallet === "new" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Currency</label>
                    <select
                      value={walletForm.currency}
                      onChange={(e) => setWalletForm({ ...walletForm, currency: e.target.value as Currency })}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="">Select currency...</option>
                      {currencies.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-2 block">Wallet Address</label>
                  <Input
                    value={walletForm.address}
                    onChange={(e) => setWalletForm({ ...walletForm, address: e.target.value })}
                    placeholder="Enter wallet address"
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Network (Optional)</label>
                  <Input
                    value={walletForm.network}
                    onChange={(e) => setWalletForm({ ...walletForm, network: e.target.value })}
                    placeholder="e.g., Bitcoin, Ethereum, TRC20, ERC20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Payment Method Icon (Optional)</label>
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
                      Upload an icon for this payment method (max 2MB)
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <LoadingButton onClick={saveWallet} loading={loading}>
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
            {wallets.map((wallet) => {
              const currencyInfo = currencies.find(c => c.value === wallet.currency);
              const Icon = currencyInfo?.icon || Bitcoin;
              const isActive = wallet.active;
              
              return (
                <div
                  key={wallet.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    !isActive ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1">
                    {wallet.icon_url ? (
                      <img 
                        src={wallet.icon_url} 
                        alt={wallet.currency}
                        className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                      />
                    ) : (
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{wallet.currency}</span>
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
                      <p className="text-xs sm:text-sm text-muted-foreground font-mono break-all">
                        {wallet.address}
                      </p>
                      {wallet.network && (
                        <p className="text-xs text-muted-foreground">Network: {wallet.network}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!isActive && (
                      <Button
                        onClick={() => activateWallet(wallet.id, wallet.currency)}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        className="text-green-500 hover:text-green-600 border-green-500/50 hover:bg-green-500/10 hidden sm:flex"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Set Active
                      </Button>
                    )}
                    <Button
                      onClick={() => copyAddress(wallet.address, wallet.id)}
                      variant="outline"
                      size="icon"
                    >
                      {copied === wallet.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => startEditWallet(wallet)}
                      variant="outline"
                      size="icon"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {!isActive && (
                      <Button
                        onClick={() => activateWallet(wallet.id, wallet.currency)}
                        variant="outline"
                        size="icon"
                        disabled={loading}
                        className="text-green-500 hover:text-green-600 sm:hidden border-green-500/50 hover:bg-green-500/10"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Deposit Requests */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {fetching ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : depositRequests.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No deposit requests yet
            </Card>
          ) : (
            depositRequests.map((request) => (
              <Card key={request.id} className="p-4 sm:p-6">
                <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg">
                        {request.amount} {request.currency}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          request.status === "approved"
                            ? "bg-green-500/20 text-green-500"
                            : request.status === "rejected"
                            ? "bg-red-500/20 text-red-500"
                            : "bg-yellow-500/20 text-yellow-500"
                        }`}
                      >
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      User: {request.user_name} ({request.user_email})
                    </p>
                    <p className="text-sm text-muted-foreground mb-1">
                      Source: {request.source || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleString()}
                    </p>
                    {request.rejection_reason && (
                      <p className="text-sm text-red-500 mt-2">
                        Rejection Reason: {request.rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {request.proof_url && (
                      <Button
                        onClick={() => setViewingProof(request.proof_url)}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">View Proof</span>
                        <span className="sm:hidden">Proof</span>
                      </Button>
                    )}
                    {request.status === "pending" && (
                      <>
                        <LoadingButton
                          onClick={() => handleDepositAction(request.id, "approve")}
                          loading={loading}
                          variant="default"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </LoadingButton>
                        <Button
                          onClick={() => {
                            const reason = prompt("Enter rejection reason:");
                            if (reason) {
                              handleDepositAction(request.id, "reject", reason);
                            }
                          }}
                          variant="destructive"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Proof Viewer Modal */}
      {viewingProof && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingProof(null)}
        >
          <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Proof of Transaction</h3>
              <Button onClick={() => setViewingProof(null)} variant="ghost" size="icon">
                ×
              </Button>
            </div>
            <div className="p-4">
              {viewingProof.endsWith(".pdf") ? (
                <iframe src={viewingProof} className="w-full h-[70vh]" />
              ) : (
                <img src={viewingProof} alt="Proof" className="max-w-full h-auto" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

