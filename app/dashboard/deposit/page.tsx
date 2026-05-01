"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { Copy, Check, Upload, Bitcoin, Coins, DollarSign } from "lucide-react";

type Currency = "BTC" | "ETH" | "USDT";

export default function DepositPage() {
  const { user } = useUser();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("BTC");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingAddress, setFetchingAddress] = useState(true);
  const [allWallets, setAllWallets] = useState<Record<string, any>>({});

  // Fetch all wallet addresses once and cache them
  useEffect(() => {
    if (!user) return;

    async function loadAllWallets() {
      setFetchingAddress(true);
      try {
        const { data, error } = await supabase
          .from("wallet_addresses")
          .select("currency, address, network")
          .eq("active", true);

        if (error) {
          console.error("Error fetching wallet addresses:", error?.message || error?.code || JSON.stringify(error));
          // Non-fatal: show placeholder addresses so page still loads
          setWalletAddress("Contact support for deposit address");
        } else {
          // Cache wallets by currency
          const walletMap: Record<string, any> = {};
          (data || []).forEach((wallet) => {
            walletMap[wallet.currency] = wallet;
          });
          setAllWallets(walletMap);
        }
      } catch (error: any) {
        console.error("Error fetching wallet addresses:", error?.message || error);
        setWalletAddress("Contact support for deposit address");
      } finally {
        setFetchingAddress(false);
      }
    }

    loadAllWallets();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("wallet_addresses_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallet_addresses",
        },
        () => loadAllWallets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Update wallet address when currency changes (using cached data)
  useEffect(() => {
    if (Object.keys(allWallets).length > 0) {
      const currentWallet = allWallets[selectedCurrency];
      setWalletAddress(currentWallet?.address || "Address not available");
    }
  }, [selectedCurrency, allWallets]);

  function copyToClipboard() {
    if (!walletAddress || walletAddress === "Address not available") return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success("Wallet address copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload an image (JPG, PNG, WEBP) or PDF file");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setProofFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProofPreview("");
    }
  }

  async function uploadProof(file: File): Promise<string> {
    if (!user?.id) throw new Error("User not authenticated");

    const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const { error: uploadError } = await supabase.storage
      .from("deposit-proofs")
      .upload(fileName, file, { upsert: false });

    if (uploadError) {
      // If file exists, remove and retry
      if (uploadError.message?.includes("already exists")) {
        await supabase.storage.from("deposit-proofs").remove([fileName]);
        const { error: retryError } = await supabase.storage
          .from("deposit-proofs")
          .upload(fileName, file, { upsert: false });

        if (retryError) throw new Error(`Upload failed: ${retryError.message}`);
      } else {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
    }

    const { data } = supabase.storage
      .from("deposit-proofs")
      .getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function submitDeposit() {
    if (!user?.id) {
      toast.error("Please sign in to deposit");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!source.trim()) {
      toast.error("Please enter the source (e.g., exchange or wallet name)");
      return;
    }

    if (!proofFile) {
      toast.error("Please upload proof of transaction");
      return;
    }

    setLoading(true);

    try {
      // Upload proof of transaction
      const proofUrl = await uploadProof(proofFile);

      // Create deposit request
      const { error } = await supabase.from("deposit_requests").insert({
        user_id: user.id,
        currency: selectedCurrency,
        amount: parseFloat(amount),
        source: source.trim(),
        proof_url: proofUrl,
        status: "pending",
      });

      if (error) {
        console.error("Error creating deposit request:", error?.message || error?.code || JSON.stringify(error));
        toast.error(`Failed to submit deposit: ${error?.message || error?.code || "Please try again"}`);
        return;
      }

      toast.success("Deposit request submitted! Admin will review it shortly.");

      // Reset form
      setAmount("");
      setSource("");
      setProofFile(null);
      setProofPreview("");
      const fileInput = document.getElementById(
        "proof-file"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error: any) {
      console.error("Error submitting deposit:", error);
      toast.error(error.message || "Failed to submit deposit request");
    } finally {
      setLoading(false);
    }
  }

  // Extract icons from cached wallet data
  const walletIcons: Record<string, string> = {};
  Object.values(allWallets).forEach((wallet: any) => {
    if (wallet.icon_url) {
      walletIcons[wallet.currency] = wallet.icon_url;
    }
  });

  const currencies: { value: Currency; label: string; icon: any }[] = [
    { value: "BTC", label: "Bitcoin", icon: Bitcoin },
    { value: "ETH", label: "Ethereum", icon: Coins },
    { value: "USDT", label: "USDT", icon: DollarSign },
  ];

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-4xl">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Deposit Funds</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Choose a deposit method and provide transaction details
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Currency Selection & Wallet Address */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
            Select Deposit Method
          </h2>

          {/* Currency Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-4 sm:mb-6">
            {currencies.map((currency) => {
              const Icon = currency.icon;
              const isSelected = selectedCurrency === currency.value;
              const customIcon = walletIcons[currency.value];
              return (
                <button
                  key={currency.value}
                  onClick={() => setSelectedCurrency(currency.value)}
                  className={`flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {customIcon ? (
                    <img
                      src={customIcon}
                      alt={currency.label}
                      className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                    />
                  ) : (
                    <Icon
                      className={`w-5 h-5 sm:w-6 sm:h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                    />
                  )}
                  <span
                    className={`text-xs sm:text-sm font-medium ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {currency.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Wallet Address Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Wallet Address</label>
            <div className="flex gap-2">
              <Input
                value={walletAddress}
                readOnly
                className="font-mono text-xs sm:text-sm flex-1"
                placeholder={
                  fetchingAddress ? "Loading..." : "No address available"
                }
              />
              <Button
                onClick={copyToClipboard}
                disabled={
                  !walletAddress ||
                  walletAddress === "Address not available" ||
                  fetchingAddress
                }
                variant="outline"
                size="icon"
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy this address and send your {selectedCurrency} to it
            </p>
          </div>
        </Card>

        {/* Deposit Form */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
            Deposit Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Amount ({selectedCurrency})
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-lg"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Source (Exchange/Wallet Name)
              </label>
              <Input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., Binance, Coinbase, Metamask"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Proof of Transaction
              </label>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    id="proof-file"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="cursor-pointer text-xs sm:text-sm"
                  />
                  {proofFile && (
                    <span className="text-xs sm:text-sm text-muted-foreground truncate">
                      {proofFile.name}
                    </span>
                  )}
                </div>
                {proofPreview && (
                  <div className="mt-2">
                    <img
                      src={proofPreview}
                      alt="Proof preview"
                      className="max-w-full h-32 sm:h-40 object-contain rounded border"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload a screenshot or PDF of your transaction
                </p>
              </div>
            </div>

            <LoadingButton
              onClick={submitDeposit}
              loading={loading}
              className="w-full mt-4 text-base h-11"
            >
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Submit Deposit Request</span>
              <span className="sm:hidden">Submit</span>
            </LoadingButton>
          </div>
        </Card>
      </div>

      {/* My Deposit Requests */}
      <Card className="p-4 sm:p-6 mt-4 sm:mt-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
          My Deposit Requests
        </h2>
        <DepositRequestsList userId={user?.id || ""} />
      </Card>
    </div>
  );
}

function DepositRequestsList({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("deposit_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deposit_requests",
          filter: `user_id=eq.${userId}`,
        },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadRequests() {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading deposit requests:", error?.message || error?.code || JSON.stringify(error));
      } else {
        setRequests(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (requests.length === 0)
    return <div className="text-muted-foreground">No deposit requests yet</div>;

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between p-4 border rounded-lg"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">
                {req.amount} {req.currency}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  req.status === "approved"
                    ? "bg-green-500/20 text-green-500"
                    : req.status === "rejected"
                      ? "bg-red-500/20 text-red-500"
                      : "bg-yellow-500/20 text-yellow-500"
                }`}
              >
                {req.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Source: {req.source || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(req.created_at).toLocaleString()}
            </p>
            {req.rejection_reason && (
              <p className="text-sm text-red-500 mt-1">
                Reason: {req.rejection_reason}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
