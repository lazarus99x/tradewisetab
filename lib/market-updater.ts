// Client-side market updater - runs in the browser
// Updates market prices periodically without needing external scripts

import { supabase } from "@/lib/supabase";
import { marketSimulator } from "@/lib/market-simulator";

let updateInterval: NodeJS.Timeout | null = null;
let isUpdating = false;

export function startMarketUpdater(intervalMs: number = 1000): (() => void) | undefined {
  if (updateInterval) {
    console.log("Market updater already running");
    return stopMarketUpdater;
  }

  console.log("🚀 Starting client-side market updater...");
  
  // Initial update
  updateMarketPrices();

  // Set up periodic updates
  updateInterval = setInterval(async () => {
    if (!isUpdating) {
      await updateMarketPrices();
    }
  }, intervalMs);

  return stopMarketUpdater;
}

export function stopMarketUpdater() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    console.log("⏹️ Market updater stopped");
  }
}

async function updateMarketPrices() {
  if (isUpdating) return;
  
  isUpdating = true;
  try {
    // Get all market symbols
    const { data: symbols } = await supabase
      .from("market_data")
      .select("symbol");

    if (!symbols || symbols.length === 0) {
      console.warn("No market symbols found");
      return;
    }

    const marketUpdates = [];
    const historyPoints = [];
    const timestamp = new Date().toISOString();

    for (const { symbol } of symbols) {
      // Generate new price using simulator
      const newPrice = marketSimulator.generatePriceChange(symbol);
      const change24h = marketSimulator.calculate24hChange(symbol, newPrice);
      
      // Calculate volume (simulated) with jitter
      const baseVolume = 1000000;
      const volumeChange = 0.95 + Math.random() * 0.1; 
      const volume24h = baseVolume * volumeChange;

      // Calculate high/low
      const priceVariation = newPrice * 0.01;
      const high24h = newPrice + priceVariation * Math.random();
      const low24h = newPrice - priceVariation * Math.random();

      marketUpdates.push({
        symbol,
        price: newPrice,
        change_24h: change24h,
        volume_24h: volume24h,
        high_24h: high24h,
        low_24h: low24h,
        last_updated: timestamp,
      });

      historyPoints.push({
        symbol,
        price: newPrice,
        timestamp: timestamp,
      });
    }

    // Perform batched updates
    if (marketUpdates.length > 0) {
      const { error: upsertError } = await supabase
        .from("market_data")
        .upsert(marketUpdates, { onConflict: "symbol" });

      if (upsertError) {
        console.error("Error batch updating market data:", upsertError);
      }

      const { error: historyError } = await supabase
        .from("price_history")
        .insert(historyPoints);
        
      if (historyError) {
        console.error("Error adding batch price history:", historyError);
      }

      console.log(`✅ Market updated: ${marketUpdates.length} symbols (Batched)`);
    }
  } catch (error: any) {
    console.error("Error updating market:", error);
  } finally {
    isUpdating = false;
  }
}

// Generate AI signals client-side
export async function generateSignals() {
  try {
    const { data: marketData } = await supabase
      .from("market_data")
      .select("symbol, price, change_24h");

    if (!marketData || marketData.length === 0) return;

    for (const asset of marketData) {
      const price = Number(asset.price);
      const change24h = Number(asset.change_24h || 0);

      let signalType = "HOLD";
      let strength = "MEDIUM";
      let confidence = 50 + Math.round((Math.random() - 0.5) * 20); // add noise
      let reasoning = "";
      let entryPrice = price;
      let targetPrice = price * 1.05;
      let stopLoss = price * 0.97;

      // Add daily randomness to avoid repetition
      const noise = (Math.sin(Date.now() / 3600000 + price) + Math.random() - 0.5) * 2;

      // Bullish conditions
      if (change24h + noise > 2 && change24h < 12) {
        signalType = "BUY";
        strength = change24h > 5 ? "HIGH" : "MEDIUM";
        confidence = Math.min(92, confidence + Math.abs(change24h) * 1.5);
        reasoning = `Momentum +${(change24h + noise).toFixed(2)}% and pattern fit`;
        targetPrice = price * (1 + Math.min(0.12, (change24h + 1) / 100));
        stopLoss = price * 0.95;
      } else if (change24h + noise > 12) {
        signalType = "BUY";
        strength = "VERY_HIGH";
        confidence = 94;
        reasoning = `Strong bullish cluster`;
        targetPrice = price * 1.1;
        stopLoss = price * 0.94;
      }
      // Bearish conditions
      else if (change24h + noise < -2 && change24h > -12) {
        signalType = "SELL";
        strength = Math.abs(change24h) > 5 ? "HIGH" : "MEDIUM";
        confidence = Math.min(90, confidence + Math.abs(change24h) * 1.4);
        reasoning = `Negative drift ${(change24h + noise).toFixed(2)}%`;
        targetPrice = price * (1 + Math.max(-0.12, (change24h - 1) / 100));
        stopLoss = price * 1.03;
      } else if (change24h + noise < -12) {
        signalType = "SELL";
        strength = "VERY_HIGH";
        confidence = 93;
        reasoning = `Strong bearish cluster`;
        targetPrice = price * 0.9;
        stopLoss = price * 1.06;
      }

      // Only create signal if not HOLD or for volatile assets
      if (signalType !== "HOLD" || Math.abs(change24h) > 1) {
        // Deactivate old signals for this symbol
        await supabase
          .from("trading_signals")
          .update({ active: false })
          .eq("symbol", asset.symbol)
          .eq("active", true);

        // Create new signal
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await supabase.from("trading_signals").insert({
          symbol: asset.symbol,
          signal_type: signalType,
          strength: strength,
          entry_price: entryPrice,
          target_price: signalType !== "HOLD" ? targetPrice : null,
          stop_loss: signalType !== "HOLD" ? stopLoss : null,
          reasoning: reasoning || `${signalType} signal based on market analysis`,
          confidence_score: confidence,
          active: true,
          expires_at: expiresAt.toISOString(),
        });
      }
    }
  } catch (error: any) {
    console.error("Error generating signals:", error);
  }
}
