import { 
  Bar, 
  HistoryCallback, 
  IDatafeedChartApi, 
  LibrarySymbolInfo, 
  OnReadyCallback, 
  PeriodParams, 
  ResolveCallback, 
  SearchSymbolResultItem, 
  SubscribeBarsCallback,
} from "../../public/static/charting_library/datafeed-api";

const configurationData = {
  supports_search: true,
  supports_group_request: false,
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: true,
  exchanges: [
    { value: "SOLANA", name: "Solana", desc: "Solana Network" }
  ],
  symbols_types: [
    { name: "Crypto", value: "crypto" }
  ],
  supported_resolutions: ["1", "5", "15", "60", "240", "1D", "1W"]
};

export class Datafeed implements IDatafeedChartApi {
  private lastBar: Bar | null = null;
  private subscribers = new Map<string, {
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    callback: SubscribeBarsCallback
  }>();

  onReady(callback: OnReadyCallback) {
    setTimeout(() => callback(configurationData));
  }

  async searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (result: SearchSymbolResultItem[]) => void
  ) {
    try {
      // For now, we search via DexScreener or similar
      const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${userInput}`);
      const data = await res.json();
      
      const symbols: SearchSymbolResultItem[] = (data.pairs || []).map((pair: any) => ({
        symbol: pair.baseToken.symbol,
        full_name: pair.baseToken.symbol,
        description: `${pair.baseToken.name} / ${pair.quoteToken.symbol}`,
        exchange: "SOLANA",
        ticker: pair.baseToken.address,
        type: "crypto"
      }));

      onResultReadyCallback(symbols);
    } catch (err) {
      onResultReadyCallback([]);
    }
  }

  async resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: ResolveCallback,
    onResolveErrorCallback: (reason: string) => void
  ) {
    try {
      // symbolName is usually the ticker/address here
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${symbolName}`);
      const data = await res.json();
      const pair = data.pairs?.[0];

      if (!pair) {
        onResolveErrorCallback("Symbol not found");
        return;
      }

      const symbolInfo: LibrarySymbolInfo = {
        ticker: pair.baseToken.address,
        name: pair.baseToken.symbol,
        description: `${pair.baseToken.name} / ${pair.quoteToken.symbol}`,
        type: "crypto",
        session: "24x7",
        timezone: "Etc/UTC",
        exchange: "SOLANA",
        minmov: 1,
        pricescale: 100000000, // 8 decimals
        has_intraday: true,
        has_weekly_and_monthly: true,
        supported_resolutions: configurationData.supported_resolutions as any,
        volume_precision: 2,
        data_status: "streaming",
        format: "price",
        listed_exchange: "SOLANA"
      };

      onSymbolResolvedCallback(symbolInfo);
    } catch (err) {
      onResolveErrorCallback("unknown_symbol");
    }
  }

  async getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onHistoryCallback: HistoryCallback,
    onErrorCallback: (error: string) => void
  ) {
    const { from, to, countBack } = periodParams;
    
    try {
      const typeMap: { [key: string]: string } = {
        "1": "1m",
        "5": "5m",
        "15": "15m",
        "60": "1h",
        "240": "4h",
        "1D": "1d",
        "D": "1d",
      };

      const res = await fetch(
        `/api/ohlcv?address=${symbolInfo.ticker}&type=${typeMap[resolution] || "15m"}`
      );
      const data = await res.json();

      if (!data.items || data.items.length === 0) {
        onHistoryCallback([], { noData: true });
        return;
      }

      const bars: Bar[] = data.items.map((item: any) => ({
        time: item.unixTime * 1000,
        low: item.l,
        high: item.h,
        open: item.o,
        close: item.c,
        volume: item.v
      })).sort((a: Bar, b: Bar) => a.time - b.time);

      if (bars.length > 0) {
        this.lastBar = bars[bars.length - 1];
      }

      onHistoryCallback(bars, { noData: false });
    } catch (err: any) {
      onErrorCallback(err.message);
    }
  }

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onRealtimeCallback: SubscribeBarsCallback,
    subscriberUID: string
  ) {
    this.subscribers.set(subscriberUID, {
      symbolInfo,
      resolution,
      callback: onRealtimeCallback
    });
  }

  unsubscribeBars(subscriberUID: string) {
    this.subscribers.delete(subscriberUID);
  }

  getServerTime(callback: (timestamp: number) => void) {
    callback(Math.floor(Date.now() / 1000));
  }
}
