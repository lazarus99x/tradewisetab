// Market Price Simulator
// This simulates realistic price movements for crypto and stocks

export class MarketSimulator {
  private symbols: Map<string, {
    basePrice: number;
    currentPrice: number;
    volatility: number;
    trend: number;
  }> = new Map();

  constructor() {
    // Initialize with base prices
    const cryptoAssets = [
      { symbol: 'BTC/USD', basePrice: 43250, volatility: 0.02 },
      { symbol: 'ETH/USD', basePrice: 2650, volatility: 0.025 },
      { symbol: 'BNB/USD', basePrice: 315, volatility: 0.03 },
      { symbol: 'SOL/USD', basePrice: 98, volatility: 0.035 },
      { symbol: 'ADA/USD', basePrice: 0.52, volatility: 0.04 },
      { symbol: 'XRP/USD', basePrice: 0.62, volatility: 0.035 },
      { symbol: 'DOGE/USD', basePrice: 0.085, volatility: 0.05 },
      { symbol: 'MATIC/USD', basePrice: 0.88, volatility: 0.04 },
    ];

    const stockAssets = [
      { symbol: 'AAPL', basePrice: 178.50, volatility: 0.008 },
      { symbol: 'TSLA', basePrice: 245.80, volatility: 0.015 },
      { symbol: 'MSFT', basePrice: 378.90, volatility: 0.007 },
      { symbol: 'GOOGL', basePrice: 142.30, volatility: 0.009 },
      { symbol: 'AMZN', basePrice: 145.75, volatility: 0.01 },
      { symbol: 'META', basePrice: 320.40, volatility: 0.012 },
    ];

    [...cryptoAssets, ...stockAssets].forEach(asset => {
      this.symbols.set(asset.symbol, {
        basePrice: asset.basePrice,
        currentPrice: asset.basePrice,
        volatility: asset.volatility,
        trend: (Math.random() - 0.5) * 0.001, // Small directional bias
      });
    });
  }

  generatePriceChange(symbol: string): number {
    const asset = this.symbols.get(symbol);
    if (!asset) {
      // Initialize if not found
      const basePrice = symbol.includes("BTC") ? 43250 : 
                       symbol.includes("ETH") ? 2650 : 
                       symbol.includes("BNB") ? 315 :
                       symbol.includes("SOL") ? 98 :
                       symbol.includes("AAPL") ? 178.5 :
                       symbol.includes("TSLA") ? 245.8 :
                       symbol.includes("MSFT") ? 378.9 : 100;
      
      this.symbols.set(symbol, {
        basePrice,
        currentPrice: basePrice,
        volatility: symbol.includes("/") ? 0.03 : 0.01,
        trend: (Math.random() - 0.5) * 0.001,
      });
      return basePrice;
    }

    // Random walk with mean reversion
    const randomWalk = (Math.random() - 0.5) * 2 * asset.volatility;
    const meanReversion = (asset.basePrice - asset.currentPrice) * 0.001;
    const trend = asset.trend;
    
    const change = randomWalk + meanReversion + trend;
    asset.currentPrice = Math.max(asset.currentPrice * (1 + change), asset.currentPrice * 0.5);
    
    // Update trend occasionally
    if (Math.random() < 0.1) {
      asset.trend = (Math.random() - 0.5) * 0.001;
    }

    return asset.currentPrice;
  }

  getCurrentPrice(symbol: string): number {
    return this.symbols.get(symbol)?.currentPrice || 0;
  }

  calculate24hChange(symbol: string, currentPrice: number): number {
    const asset = this.symbols.get(symbol);
    if (!asset) return 0;
    return ((currentPrice - asset.basePrice) / asset.basePrice) * 100;
  }
}

export const marketSimulator = new MarketSimulator();
