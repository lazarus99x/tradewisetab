"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Bot, TrendingUp, TrendingDown, Minus, AlertCircle, Zap } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { useUser } from "@/lib/auth";

export function LiveSignalsBot() {
  const { user } = useUser();
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [botActive, setBotActive] = useState(false);

  useEffect(() => {
    loadSignals();

    // Subscribe to new signals
    const channel = supabase
      .channel("trading_signals_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_signals",
          filter: "active=eq.true",
        },
        () => {
          loadSignals();
        }
      )
      .subscribe();

    // Check if user has active bot
    if (user?.id) {
      checkBotStatus();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function loadSignals() {
    try {
      const { data, error } = await supabase
        .from("trading_signals")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setSignals(data || []);
    } catch (error: any) {
      console.error("Error loading signals:", error);
    }
  }

  async function checkBotStatus() {
    if (!user?.id) return;
    const { data } = await supabase
      .from("trading_bots")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    setBotActive(!!data);
  }

  async function toggleBot() {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }

    setLoading(true);
    try {
      if (botActive) {
        // Deactivate bot
        const { error } = await supabase
          .from("trading_bots")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (error) throw error;
        setBotActive(false);
        toast.success("Trading bot deactivated");
      } else {
        // Check if bot exists
        const { data: existingBot } = await supabase
          .from("trading_bots")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingBot) {
          // Update existing bot
          const { error } = await supabase
            .from("trading_bots")
            .update({
              is_active: true,
              symbol: "BTC/USD", // Default symbol
              strategy: "SIGNAL_FOLLOW",
              risk_level: "MEDIUM",
              max_investment: 1000,
              last_activity: new Date().toISOString(),
            })
            .eq("id", existingBot.id);

          if (error) throw error;
        } else {
          // Create new bot
          const { error } = await supabase.from("trading_bots").insert({
            user_id: user.id,
            symbol: "BTC/USD", // Default symbol - required field
            strategy: "SIGNAL_FOLLOW",
            is_active: true,
            risk_level: "MEDIUM",
            max_investment: 1000,
            last_activity: new Date().toISOString(),
          });

          if (error) throw error;
        }

        setBotActive(true);
        toast.success("Trading bot activated! It will follow AI signals.");
      }
    } catch (error: any) {
      console.error("Error toggling bot:", error);
      toast.error(error.message || "Failed to toggle bot");
    } finally {
      setLoading(false);
    }
  }

  function getSignalIcon(signalType: string) {
    switch (signalType) {
      case "BUY":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "SELL":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  }

  function getSignalColor(signalType: string) {
    switch (signalType) {
      case "BUY":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "SELL":
        return "bg-red-500/20 text-red-500 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/30";
    }
  }

  function getStrengthColor(strength: string) {
    switch (strength) {
      case "VERY_HIGH":
        return "text-green-500";
      case "HIGH":
        return "text-green-400";
      case "MEDIUM":
        return "text-yellow-500";
      default:
        return "text-gray-400";
    }
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Trading Signals</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${botActive ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
          <span className="text-xs text-muted-foreground">{botActive ? "Bot Active" : "Bot Inactive"}</span>
        </div>
      </div>

      <div className="mb-4">
        <LoadingButton
          onClick={toggleBot}
          loading={loading}
          variant={botActive ? "destructive" : "default"}
          className="w-full"
        >
          <Zap className="w-4 h-4 mr-2" />
          {botActive ? "Deactivate Auto Trading Bot" : "Activate Auto Trading Bot"}
        </LoadingButton>
        <p className="text-xs text-muted-foreground mt-2">
          {botActive
            ? "Bot is automatically executing trades based on AI signals"
            : "Activate to automatically trade on AI signals"}
        </p>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {signals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active signals at the moment</p>
          </div>
        ) : (
          signals.map((signal) => (
            <div
              key={signal.id}
              className={`p-3 rounded-lg border-2 ${getSignalColor(signal.signal_type)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getSignalIcon(signal.signal_type)}
                  <span className="font-bold text-sm">{signal.symbol}</span>
                </div>
                <span className={`text-xs font-semibold ${getStrengthColor(signal.strength)}`}>
                  {signal.strength.replace("_", " ")}
                </span>
              </div>

              <div className="text-sm mb-2">
                <p className="font-medium">{signal.signal_type}</p>
                {signal.reasoning && (
                  <p className="text-xs text-muted-foreground mt-1">{signal.reasoning}</p>
                )}
              </div>

              {signal.entry_price && (
                <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-current/20">
                  <div>
                    <span className="text-muted-foreground">Entry: </span>
                    <span className="font-semibold">${Number(signal.entry_price).toFixed(2)}</span>
                  </div>
                  {signal.target_price && (
                    <div>
                      <span className="text-muted-foreground">Target: </span>
                      <span className="font-semibold text-green-500">
                        ${Number(signal.target_price).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {signal.stop_loss && (
                    <div>
                      <span className="text-muted-foreground">Stop Loss: </span>
                      <span className="font-semibold text-red-500">
                        ${Number(signal.stop_loss).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Confidence: </span>
                    <span className="font-semibold">{Number(signal.confidence_score).toFixed(0)}%</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                {new Date(signal.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
