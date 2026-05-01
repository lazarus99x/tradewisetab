"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { useUser } from "@/lib/auth";
import { Bot, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

export function SimpleSignalsBot() {
  const { user } = useUser();
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [botActive, setBotActive] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [amount, setAmount] = useState(100);
  const [duration, setDuration] = useState("1D");
  const [risk, setRisk] = useState("MEDIUM");
  const [autoInterval, setAutoInterval] = useState<NodeJS.Timeout | null>(null);
  const [executing, setExecuting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [sessionEndsAt, setSessionEndsAt] = useState<string | null>(null);
  const [sessionLeft, setSessionLeft] = useState<number>(0);
  const [spark, setSpark] = useState<Array<{ t: number; v: number }>>([]);
  const [sparkTicker, setSparkTicker] = useState<NodeJS.Timeout | null>(null);
  const [aiTradeActive, setAiTradeActive] = useState(false);

  // Mini sparkline always animates to make panel feel alive
  useEffect(() => {
    if (sparkTicker) clearInterval(sparkTicker);
    // seed
    setSpark([{ t: Date.now(), v: 100 }]);
    // Sparkline style depends on session: more energetic/bright when trade active or executing
    const energetic = aiTradeActive || executing;
    const t = setInterval(
      () => {
        setSpark((prev) => {
          const base = prev[prev.length - 1]?.v ?? 100;
          const spread = energetic ? 0.05 : 0.01; // executing -> very aggressive
          const jitter = base * (Math.random() * spread - spread / 2);
          const next = Math.max(1, base + jitter);
          const arr = [...prev, { t: Date.now(), v: next }];
          return arr.slice(-40);
        });
      },
      energetic ? 150 : 500
    );
    setSparkTicker(t);
    return () => clearInterval(t);
  }, [aiTradeActive, executing]);

  // Keep session countdown ticking
  useEffect(() => {
    if (!sessionEndsAt) return;
    const timer = setInterval(() => {
      const left = Math.max(
        0,
        Math.floor((new Date(sessionEndsAt).getTime() - Date.now()) / 1000)
      );
      setSessionLeft(left);
      if (left <= 0) {
        clearInterval(timer);
        // Session ended: stop bot and mark a trade as ready for return
        handleSessionComplete();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionEndsAt]);

  useEffect(() => {
    setAiTradeActive(!!botActive && !!sessionEndsAt && sessionLeft > 1);
  }, [botActive, sessionEndsAt, sessionLeft]);

  // Format countdown as HH:MM:SS properly
  function formatHMS(secs: number) {
    const h = Math.floor(secs / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  async function handleSessionComplete() {
    if (!user?.id) return;
    // Stop bot
    await supabase
      .from("trading_bots")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);
    setBotActive(false);
    // Compute amount and risk
    try {
      const botInfo = (
        await supabase
          .from("trading_bots")
          .select("max_investment, risk_level")
          .eq("user_id", user.id)
          .maybeSingle()
      ).data;
      const amount = Number(botInfo?.max_investment || 100);
      const risk = (botInfo?.risk_level || "LOW").toUpperCase();
      let roi = 0,
        mustApprove = true;
      if (risk === "LOW") {
        roi = 0.1;
        mustApprove = true;
      } else if (risk === "NORMAL" || risk === "MEDIUM") {
        roi = 0.15;
        mustApprove = true;
      } else if (risk === "HIGH") {
        roi = 0.2;
        mustApprove = false;
      }
      let pl = 0;
      if (risk === "HIGH" && Math.random() < 0.5) {
        // 50% admin can make this trade a loss (simulate by flag)
        pl = amount * (Math.random() < 0.7 ? roi : -1); // 70% profit, 30% total loss on admin reject
      } else {
        pl = amount * roi;
      }
      pl = Math.round(pl * 100) / 100;

      await supabase.from("user_trades").insert({
        user_id: user.id,
        symbol: "BTC/USD",
        side: pl >= 0 ? "BUY" : "SELL",
        price: 0,
        status: "ready",
        profit_loss: pl,
        description: `AI bot session completed. Risk: ${risk}. Invested: $${amount}. ROI: ${Math.abs(Math.round(roi * 100))}%. Approval required: ${!mustApprove ? "Admin must decide" : "Must approve"}`,
        risk_level: risk,
        invested_amount: amount,
        roi: Math.abs(Math.round(roi * 100)),
        admin_must_approve: !mustApprove,
      });
      toast.success("AI session completed. Trade ready for admin approval.");
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadSignals();
    checkBotStatus();

    const channel = supabase
      .channel("signals_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_signals",
          filter: "active=eq.true",
        },
        () => loadSignals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function loadSignals() {
    try {
      const { data } = await supabase
        .from("trading_signals")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) setSignals(data || []);
    } catch (error) {
      console.error("Error loading signals:", error);
    }
  }

  async function checkBotStatus() {
    if (!user?.id) return;
    const { data } = await supabase
      .from("trading_bots")
      .select("is_active, duration, last_activity, ends_at, max_investment")
      .eq("user_id", user.id)
      .maybeSingle();

    setBotActive(!!data?.is_active);
    if (data?.ends_at) setSessionEndsAt(data.ends_at);
  }

  async function getBalance() {
    if (!user?.id) return 0;
    const { data } = await supabase
      .from("user_balances")
      .select("account_balance, balance")
      .eq("user_id", user.id)
      .maybeSingle();
    return data?.account_balance ?? data?.balance ?? 0;
  }

  function addDuration(base: Date, duration: string): string {
    const d = new Date(base);
    switch (duration) {
      case "1H":
        d.setHours(d.getHours() + 1);
        break;
      case "1D":
        d.setDate(d.getDate() + 1);
        break;
      case "1W":
        d.setDate(d.getDate() + 7);
        break;
      case "1M":
        d.setMonth(d.getMonth() + 1);
        break;
      default:
        d.setDate(d.getDate() + 1);
        break;
    }
    return d.toISOString();
  }

  async function confirmActivate() {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }
    if (amount < 100) {
      toast.error("Minimum to start is $100");
      return;
    }
    const bal = await getBalance();
    if (bal < amount) {
      toast.error("Insufficient balance");
      return;
    }

    setLoading(true);
    try {
      const { data: existingBot } = await supabase
        .from("trading_bots")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const payload = {
        user_id: user.id,
        symbol: "BTC/USD",
        strategy: "SIGNAL_FOLLOW",
        is_active: true,
        risk_level: risk,
        max_investment: amount,
        last_activity: new Date().toISOString(),
        duration: duration,
        ends_at: addDuration(new Date(), duration),
      } as any;

      if (existingBot) {
        await supabase
          .from("trading_bots")
          .update(payload)
          .eq("id", existingBot.id);
      } else {
        await supabase.from("trading_bots").insert(payload);
      }

      setBotActive(true);
      setShowDialog(false);
      setSessionEndsAt(payload.ends_at);
      toast.success("Bot activated!");
      scheduleAutoTrades();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to activate bot");
    } finally {
      setLoading(false);
    }
  }

  function scheduleAutoTrades() {
    if (autoInterval) clearInterval(autoInterval);
    const t = setInterval(async () => {
      if (!botActive) return;
      // get the latest strongest signal
      const { data: sig } = await supabase
        .from("trading_signals")
        .select("*")
        .eq("active", true)
        .order("confidence_score", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sig) await submitTrade(sig);
    }, 10000); // every 10s
    setAutoInterval(t);
  }

  async function toggleBot() {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }

    if (botActive) {
      setLoading(true);
      try {
        await supabase
          .from("trading_bots")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("is_active", true);
        setBotActive(false);
        if (autoInterval) clearInterval(autoInterval);
        toast.success("Trading bot deactivated");
      } catch (e: any) {
        toast.error("Failed to stop bot");
      } finally {
        setLoading(false);
      }
    } else {
      // open dialog first
      setShowDialog(true);
    }
  }

  // Util for submitting a trade order
  async function submitTrade(signal: any) {
    if (!user?.id) {
      toast.error("You must be logged in to trade.");
      return;
    }
    setLoading(true);
    try {
      // Get current price
      const { data: priceData } = await supabase
        .from("market_data")
        .select("price")
        .eq("symbol", signal.symbol)
        .single();
      const foundPrice = priceData?.price || 0;
      const amount = 1;
      const total_value = Number(foundPrice) * amount;
      // Create trade request
      const { error } = await supabase.from("user_trades").insert({
        user_id: user.id,
        symbol: signal.symbol,
        trade_type: signal.signal_type,
        order_type: "MARKET",
        amount,
        price: foundPrice,
        total_value,
        status: "pending",
        signal_id: signal.id,
      });
      if (error) throw error;

      // Start execution simulation
      setExecuting(true);
      setCountdown(5);
      const iv = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(iv);
            setExecuting(false);
            return 0;
          }
          return c - 1;
        });
      }, 1000);

      toast.success("Trade order created and sent to admin for approval.");
    } catch (error) {
      toast.error("Failed to create trade. Try again.");
    }
    setLoading(false);
  }

  // Track ID of last traded signal for this session
  const [lastAutoSignal, setLastAutoSignal] = useState<string | null>(null);

  // Effect: if bot is active, auto trade on new high-confidence signal
  useEffect(() => {
    if (!botActive || !signals.length) return;
    const top = signals[0];
    // Only auto-trade new signals
    if (top && top.id !== lastAutoSignal) {
      submitTrade(top);
      setLastAutoSignal(top.id);
    }
    // eslint-disable-next-line
  }, [botActive, signals]);

  return (
    <Card className="p-4">
      {/* Responsive AI header -- redesigned for mobile-first */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-y-2 gap-x-3 w-full">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Animated AI SVG icon */}
          <span className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#00FE01] to-[#00CCE0] rounded-full relative shadow shrink-0">
            <svg
              width="28"
              height="28"
              viewBox="0 0 40 40"
              fill="none"
              className="animate-spin-slow"
              style={{ animationDuration: "8s" }}
            >
              <circle
                cx="20"
                cy="20"
                r="18"
                stroke="#00FE01"
                strokeWidth="3"
                opacity="0.3"
              >
                <animate
                  attributeName="stroke-dasharray"
                  values="12,4;18,3;12,4"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="20" cy="20" r="8" fill="#00FFF9" opacity="0.14" />
              <ellipse
                cx="20"
                cy="26.5"
                rx="4"
                ry="1.5"
                fill="#00FE01"
                opacity="0.4"
              >
                <animate
                  attributeName="rx"
                  values="4;6;4"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </ellipse>
              <circle cx="16" cy="18" r="2" fill="#00FFE0" />
              <circle cx="24" cy="18" r="2" fill="#00FFE0" />
              <path
                d="M16 21 C18 23,22 23,24 21"
                stroke="#00FF99"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
            <span className="absolute w-[46px] h-[46px] -z-10 animate-pulse-fast bg-gradient-to-tl from-[#00FE01]/30 to-[#00CCE0]/10 rounded-full"></span>
          </span>
          <span className="flex flex-col">
            <span className="font-semibold text-base sm:text-xl tracking-wide select-none bg-gradient-to-r from-[#00FE01] to-[#00CCE0] bg-clip-text text-transparent leading-tight">
              Kaidos Ai
            </span>
            <span className="font-semibold text-base sm:text-xl tracking-wide select-none bg-gradient-to-r from-[#00FE01] to-[#00CCE0] bg-clip-text text-transparent leading-tight"></span>
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
          <span
            className={`text-[10px] sm:text-xs px-2 py-[2px] rounded-full border ${botActive ? "bg-green-500/10 text-green-500 border-green-500/30" : "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}
          >
            {" "}
            {botActive ? "LIVE" : "OFF"}{" "}
          </span>
          {botActive && sessionEndsAt && (
            <span className="ml-2 text-xs sm:text-sm text-muted-foreground min-w-[90px] text-center">
              Ends in {formatHMS(sessionLeft)}
            </span>
          )}
          <LoadingButton
            onClick={toggleBot}
            loading={loading}
            color={botActive ? "destructive" : "default"}
            className="min-w-[78px] sm:min-w-[105px] text-xs sm:text-base px-3 py-1 !rounded-lg ml-auto"
          >
            <svg
              width="18"
              height="18"
              className="inline-block mr-1 align-middle animate-lightning"
            >
              <polyline
                points="7 1,11 9,8 9,12 17"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
              />
            </svg>
            {botActive ? "Stop" : "Start"}
          </LoadingButton>
        </div>
      </div>
      {executing && (
        <div className="mb-3">
          <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
            <div className="h-1.5 w-1/3 bg-gradient-to-r from-[#00FE01] via-[#00FFF9] to-[#00CCE0] animate-[pulse_1s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {/* Aggressive mini sparkline chart always visible, now mobile padded/rounded */}
      <div className="h-20 rounded-lg bg-black/40 w-full overflow-hidden mb-2 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={spark.map((s) => ({
              t: new Date(s.t).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
              v: s.v,
            }))}
          >
            <defs>
              <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={aiTradeActive || executing ? "#00FFF9" : "#00FE01"}
                  stopOpacity={aiTradeActive || executing ? 0.8 : 0.3}
                />
                <stop
                  offset="95%"
                  stopColor={aiTradeActive || executing ? "#00CCE0" : "#00FE01"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={aiTradeActive || executing ? "#00FFF9" : "#00FE01"}
              strokeWidth={aiTradeActive || executing ? 4 : 2}
              fill="url(#spark)"
              dot={false}
              isAnimationActive={true}
              animationDuration={aiTradeActive || executing ? 200 : 400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-4 w-full max-w-sm">
            <h4 className="font-semibold mb-3">Activate AI Trading Bot</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">
                  Investment Amount (USD)
                </label>
                <input
                  type="number"
                  className="w-full mt-1 p-2 rounded bg-background border border-border"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={100}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  Duration
                </label>
                <select
                  className="w-full mt-1 p-2 rounded bg-background border border-border"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="1H">1 Hour</option>
                  <option value="1D">1 Day</option>
                  <option value="1W">1 Week</option>
                  <option value="1M">1 Month</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Risk</label>
                <select
                  className="w-full mt-1 p-2 rounded bg-background border border-border"
                  value={risk}
                  onChange={(e) => setRisk(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={confirmActivate} disabled={loading}>
                  Activate
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Instructions/FAQ panel */}
      <div className="mt-6 rounded-xl shadow border border-border bg-gradient-to-br from-card/50 to-black/40 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Bot className="w-4 h-4 text-primary" />
          How the AI Trading Bot Works
        </div>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>
            Minimum deposit to start: <span className="font-medium">$100</span>
          </li>
          <li>
            Choose <b>Risk Level</b>:
            <span className="inline-block ml-2 px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-semibold text-xs">
              Low
            </span>{" "}
            <b>10% ROI</b> (Profit Gauranteed, no loss) &nbsp;|&nbsp;
            <span className="inline-block px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600 font-semibold text-xs">
              Normal
            </span>{" "}
            <b>15% ROI</b> (Profit Gauranteed, no loss) &nbsp;|&nbsp;
            <span className="inline-block px-2 py-0.5 rounded-full bg-red-600/25 text-red-500 font-semibold text-xs">
              High
            </span>{" "}
            <b>20% ROI</b> (Profit Not Gauranteed, Risk of Loss)
          </li>
        </ul>
      </div>

      {
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={spark.map((s) => ({
                t: new Date(s.t).toLocaleTimeString(),
                v: s.v,
              }))}
            >
              <defs>
                <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={
                      aiTradeActive || executing ? "#00FFF9" : "#00FE01"
                    }
                    stopOpacity={aiTradeActive || executing ? 0.8 : 0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={
                      aiTradeActive || executing ? "#00CCE0" : "#00FE01"
                    }
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={aiTradeActive || executing ? "#00FFF9" : "#00FE01"}
                strokeWidth={aiTradeActive || executing ? 3 : 2}
                fill="url(#spark)"
                dot={false}
                isAnimationActive={true}
                animationDuration={250}
              />
              {/* Hide all axes and labels for a pro mini flow look */}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      }
    </Card>
  );
}
