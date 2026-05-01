"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { Bitcoin, Coins, DollarSign, ArrowDown } from "lucide-react";

type Currency = "BTC" | "ETH" | "USDT" | string;

export default function WithdrawPage() {
  const { user } = useUser();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("BTC");
  const [amount, setAmount] = useState<string>("");
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [network, setNetwork] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [fetchingBalance, setFetchingBalance] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchBalance();
    }
  }, [user?.id]);

  async function fetchBalance() {
    if (!user?.id) return;
    setFetchingBalance(true);
    try {
      const { data, error } = await supabase
        .from("user_balances")
        .select("account_balance, balance")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching balance:", error);
      } else {
        const balance = data?.account_balance || data?.balance || 0;
        setUserBalance(balance);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setFetchingBalance(false);
    }
  }

  async function submitWithdrawal() {
    if (!user?.id) {
      toast.error("Please sign in to withdraw");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount > userBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!destinationAddress.trim()) {
      toast.error("Please enter the destination wallet address");
      return;
    }

    if (!network.trim()) {
      toast.error("Please specify the network (e.g., Bitcoin, Ethereum, TRC20, ERC20)");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: user.id,
        currency: selectedCurrency,
        amount: withdrawalAmount,
        destination_address: destinationAddress.trim(),
        network: network.trim(),
        status: "pending",
      });

      if (error) {
        console.error("Error creating withdrawal request:", error);
        toast.error(`Failed to submit withdrawal: ${error.message}`);
        return;
      }

      toast.success("Withdrawal request submitted! Admin will review it shortly.");
      
      // Reset form
      setAmount("");
      setDestinationAddress("");
      setNetwork("");
    } catch (error: any) {
      console.error("Error submitting withdrawal:", error);
      toast.error(error.message || "Failed to submit withdrawal request");
    } finally {
      setLoading(false);
    }
  }

  const [walletIcons, setWalletIcons] = useState<Record<string, string>>({});
  const [withdrawalMethods, setWithdrawalMethods] = useState<any[]>([]);

  useEffect(() => {
    // Fetch withdrawal methods and icons
    async function loadData() {
      try {
        // Get wallet icons from deposit addresses
        const { data: icons } = await supabase
          .from("wallet_addresses")
          .select("currency, icon_url")
          .eq("active", true);
        
        if (icons) {
          const iconMap: Record<string, string> = {};
          icons.forEach((w) => {
            if (w.icon_url) iconMap[w.currency] = w.icon_url;
          });
          setWalletIcons(iconMap);
        }

        // Get withdrawal methods
        const { data: methods } = await supabase
          .from("withdrawal_methods")
          .select("currency, network, icon_url")
          .eq("active", true)
          .order("currency, network");

        if (methods && methods.length > 0) {
          setWithdrawalMethods(methods);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    }
    loadData();
  }, []);

  // Group methods by currency
  const currenciesMap: Record<string, { label: string; icon: any; networks: string[]; iconUrl?: string }> = {};
  
  withdrawalMethods.forEach((method) => {
    if (!currenciesMap[method.currency]) {
      const defaultIcon = method.currency === "BTC" ? Bitcoin : method.currency === "ETH" ? Coins : DollarSign;
      currenciesMap[method.currency] = {
        label: method.currency,
        icon: defaultIcon,
        networks: [],
        iconUrl: method.icon_url || walletIcons[method.currency],
      };
    }
    if (!currenciesMap[method.currency].networks.includes(method.network)) {
      currenciesMap[method.currency].networks.push(method.network);
    }
    if (method.icon_url && !currenciesMap[method.currency].iconUrl) {
      currenciesMap[method.currency].iconUrl = method.icon_url;
    }
  });

  // Fallback to defaults if no methods loaded
  const currencies = Object.keys(currenciesMap).length > 0 
    ? Object.entries(currenciesMap).map(([value, data]) => ({
        value,
        label: data.label,
        icon: data.icon,
        networks: data.networks,
        iconUrl: data.iconUrl,
      }))
    : [
        { value: "BTC", label: "Bitcoin", icon: Bitcoin, networks: ["Bitcoin", "Lightning Network"], iconUrl: undefined },
        { value: "ETH", label: "Ethereum", icon: Coins, networks: ["Ethereum", "ERC20"], iconUrl: undefined },
        { value: "USDT", label: "USDT", icon: DollarSign, networks: ["TRC20", "ERC20", "BEP20"], iconUrl: undefined },
      ];

  const currentCurrency = currencies.find(c => c.value === selectedCurrency);

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-4xl">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Withdraw Funds</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Request a withdrawal to your wallet address
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Currency Selection & Balance */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Select Withdrawal Method</h2>
          
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
                  {currency.iconUrl || walletIcons[currency.value] ? (
                    <img 
                      src={currency.iconUrl || walletIcons[currency.value]} 
                      alt={currency.label}
                      className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                    />
                  ) : (
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  )}
                  <span className={`text-xs sm:text-sm font-medium ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                    {currency.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Balance Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Available Balance</label>
            <div className="p-4 bg-muted rounded-lg">
              {fetchingBalance ? (
                <span className="text-lg font-semibold">Loading...</span>
              ) : (
                <span className="text-lg font-semibold">${userBalance.toFixed(2)}</span>
              )}
            </div>
          </div>
        </Card>

        {/* Withdrawal Form */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Withdrawal Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Amount (USD)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={userBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Equivalent {selectedCurrency} will be calculated at current rates
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Destination Wallet Address
              </label>
              <Input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder={`Enter your ${selectedCurrency} wallet address`}
                className="font-mono text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Network
              </label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">Select network...</option>
                {currentCurrency?.networks.map((net) => (
                  <option key={net} value={net}>
                    {net}
                  </option>
                ))}
              </select>
            </div>

            <LoadingButton
              onClick={submitWithdrawal}
              loading={loading}
              className="w-full mt-4 text-base h-11"
            >
              <ArrowDown className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Submit Withdrawal Request</span>
              <span className="sm:hidden">Submit</span>
            </LoadingButton>
          </div>
        </Card>
      </div>

      {/* My Withdrawal Requests */}
      <Card className="p-4 sm:p-6 mt-4 sm:mt-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">My Withdrawal Requests</h2>
        <WithdrawalRequestsList userId={user?.id || ""} />
      </Card>
    </div>
  );
}

function WithdrawalRequestsList({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadRequests();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel("withdrawal_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawal_requests",
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
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading requests:", error);
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
    return <div className="text-muted-foreground">No withdrawal requests yet</div>;

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
                {req.amount} USD ({req.currency})
              </span>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  req.status === "completed" || req.status === "approved"
                    ? "bg-green-500/20 text-green-500"
                    : req.status === "rejected"
                    ? "bg-red-500/20 text-red-500"
                    : req.status === "processing"
                    ? "bg-blue-500/20 text-blue-500"
                    : "bg-yellow-500/20 text-yellow-500"
                }`}
              >
                {req.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              To: {req.destination_address?.substring(0, 20)}...
            </p>
            <p className="text-xs text-muted-foreground">
              Network: {req.network || "N/A"} • {new Date(req.created_at).toLocaleString()}
            </p>
            {req.rejection_reason && (
              <p className="text-sm text-red-500 mt-1">
                Reason: {req.rejection_reason}
              </p>
            )}
            {req.transaction_hash && (
              <p className="text-sm text-green-500 mt-1">
                TX Hash: {req.transaction_hash}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

