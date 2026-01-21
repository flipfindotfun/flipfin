interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface LibrarySymbolInfo {
  ticker: string;
  name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_seconds: boolean;
  seconds_multipliers: string[];
  visible_plots_set: string;
  supported_resolutions: string[];
  volume_precision: number;
  data_status: string;
  exchange: string;
  listed_exchange: string;
}

interface DatafeedConfiguration {
  supported_resolutions: string[];
  exchanges: { value: string; name: string; desc: string }[];
  symbols_types: { name: string; value: string }[];
  supports_marks: boolean;
  supports_timescale_marks: boolean;
  supports_time: boolean;
}

interface PeriodParams {
  from: number;
  to: number;
  countBack: number;
  firstDataRequest: boolean;
}

const resolutionToType: Record<string, string> = {
  "1S": "1s",
  "30S": "30s",
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "30": "30m",
  "60": "1h",
  "240": "4h",
  "1D": "1d",
  "D": "1d",
  "1W": "1w",
  "W": "1w",
};

export class SolanaDatafeed {
  private lastBarCache: Map<string, Bar> = new Map();
  private subscribers: Map<string, NodeJS.Timeout> = new Map();
  private tokenAddress: string;
  private tokenSymbol: string;
  private tokenName: string;
  private tokenDecimals: number;

  constructor(
    tokenAddress: string,
    tokenSymbol: string = "TOKEN",
    tokenName: string = "Token",
    tokenDecimals: number = 9
  ) {
    this.tokenAddress = tokenAddress;
    this.tokenSymbol = tokenSymbol;
    this.tokenName = tokenName;
    this.tokenDecimals = tokenDecimals;
  }

  onReady(callback: (config: DatafeedConfiguration) => void): void {
    setTimeout(() => {
      callback({
        supported_resolutions: ["1S", "30S", "1", "5", "15", "30", "60", "240", "1D", "1W"],
        exchanges: [{ value: "GMGN", name: "GMGN", desc: "GMGN DEX" }],
        symbols_types: [{ name: "crypto", value: "crypto" }],
        supports_marks: true,
        supports_timescale_marks: true,
        supports_time: true,
      });
    }, 0);
  }

  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (symbols: any[]) => void
  ): void {
    onResult([
      {
        symbol: this.tokenSymbol,
        full_name: `GMGN:${this.tokenSymbol}`,
        description: this.tokenName,
        exchange: "GMGN",
        type: "crypto",
      },
    ]);
  }

  resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: LibrarySymbolInfo) => void,
    onError: (reason: string) => void
  ): void {
    setTimeout(() => {
      const pricescale = this.calculatePricescale();
      
      onResolve({
        ticker: this.tokenSymbol,
        name: this.tokenSymbol,
        description: this.tokenName,
        type: "crypto",
        session: "24x7",
        timezone: "Etc/UTC",
        minmov: 1,
        pricescale: pricescale,
        has_intraday: true,
        has_seconds: true,
        seconds_multipliers: ["1", "30"],
        visible_plots_set: "ohlcv",
        supported_resolutions: ["1S", "30S", "1", "5", "15", "30", "60", "240", "1D", "1W"],
        volume_precision: 2,
        data_status: "streaming",
        exchange: "GMGN",
        listed_exchange: "GMGN",
      });
    }, 0);
  }

  private calculatePricescale(): number {
    return 100000000;
  }

  async getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onResult: (bars: Bar[], meta: { noData: boolean }) => void,
    onError: (reason: string) => void
  ): Promise<void> {
    try {
      const type = resolutionToType[resolution] || "15m";
      
      const response = await fetch(
        `/api/ohlcv?address=${this.tokenAddress}&type=${type}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        onResult([], { noData: true });
        return;
      }

      const bars: Bar[] = data.items
        .map((item: any) => ({
          time: item.unixTime * 1000,
          open: item.o,
          high: item.h,
          low: item.l,
          close: item.c,
          volume: item.v || 0,
        }))
        .filter((bar: Bar) => {
          const fromMs = periodParams.from * 1000;
          const toMs = periodParams.to * 1000;
          return bar.time >= fromMs && bar.time <= toMs;
        })
        .sort((a: Bar, b: Bar) => a.time - b.time);

      if (bars.length > 0) {
        const cacheKey = `${this.tokenAddress}_${resolution}`;
        this.lastBarCache.set(cacheKey, bars[bars.length - 1]);
      }

      onResult(bars, { noData: bars.length === 0 });
    } catch (error) {
      console.error("getBars error:", error);
      onError(error instanceof Error ? error.message : "Failed to fetch data");
    }
  }

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onTick: (bar: Bar) => void,
    subscriberUID: string,
    onResetCacheNeededCallback: () => void
  ): void {
    const cacheKey = `${this.tokenAddress}_${resolution}`;
    
    const intervalMs = this.getIntervalMs(resolution);
    
    const interval = setInterval(async () => {
      try {
        const type = resolutionToType[resolution] || "15m";
        const response = await fetch(
          `/api/ohlcv?address=${this.tokenAddress}&type=${type}`
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const lastItem = data.items[data.items.length - 1];
          const newBar: Bar = {
            time: lastItem.unixTime * 1000,
            open: lastItem.o,
            high: lastItem.h,
            low: lastItem.l,
            close: lastItem.c,
            volume: lastItem.v || 0,
          };
          
          const cachedBar = this.lastBarCache.get(cacheKey);
          
          if (!cachedBar || newBar.time >= cachedBar.time) {
            this.lastBarCache.set(cacheKey, newBar);
            onTick(newBar);
          }
        }
      } catch (error) {
        console.error("subscribeBars poll error:", error);
      }
    }, intervalMs);
    
    this.subscribers.set(subscriberUID, interval);
  }

  unsubscribeBars(subscriberUID: string): void {
    const interval = this.subscribers.get(subscriberUID);
    if (interval) {
      clearInterval(interval);
      this.subscribers.delete(subscriberUID);
    }
  }

  private getIntervalMs(resolution: string): number {
    switch (resolution) {
      case "1S": return 1000;
      case "30S": return 5000;
      case "1": return 5000;
      case "5": return 10000;
      case "15": return 15000;
      case "30": return 20000;
      case "60": return 30000;
      case "240": return 60000;
      default: return 60000;
    }
  }

  getMarks(
    symbolInfo: LibrarySymbolInfo,
    from: number,
    to: number,
    onDataCallback: (marks: any[]) => void,
    resolution: string
  ): void {
    onDataCallback([]);
  }

  getTimescaleMarks(
    symbolInfo: LibrarySymbolInfo,
    from: number,
    to: number,
    onDataCallback: (marks: any[]) => void,
    resolution: string
  ): void {
    onDataCallback([]);
  }

  getServerTime(callback: (time: number) => void): void {
    callback(Math.floor(Date.now() / 1000));
  }
}

export function createDatafeed(
  tokenAddress: string,
  tokenSymbol?: string,
  tokenName?: string,
  tokenDecimals?: number
): SolanaDatafeed {
  return new SolanaDatafeed(tokenAddress, tokenSymbol, tokenName, tokenDecimals);
}
