export type WatchItem = {
  slug: string;
  marketId?: string;
};

export function parseWatchlist(md: string): WatchItem[] {
  const lines = md.split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));
  const items: WatchItem[] = [];
  for (const line of lines) {
    let s = line;
    if (s.startsWith("http")) {
      try {
        const u = new URL(s);
        // Expect polymarket.com URLs like /event/<slug> or /market/<slug>
        const parts = u.pathname.split("/").filter(Boolean);
        const slug = parts[1] || parts[0] || s;
        items.push({ slug });
        continue;
      } catch {}
    }
    // Support "slug, marketId"
    const [slugRaw, marketIdRaw] = s.split(",").map(x => x?.trim());
    if (slugRaw) items.push({ slug: slugRaw, marketId: marketIdRaw || undefined });
  }
  return items;
}

// Dome endpoints (client-side calls). For personal use; your API key will be exposed in the browser.
export const DOME_BASE = "https://api.domeapi.io/v1";

// Simple cache to avoid hitting rate limits
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache

export async function domeFetch<T>(path: string, apiKey: string, search?: Record<string,string|number|boolean|undefined>) {
  const qs = search
    ? "?" + Object.entries(search).filter(([,v]) => v !== undefined && v !== null)
      .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")
    : "";
  
  const cacheKey = `${path}${qs}`;
  const now = Date.now();
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data as Promise<T>;
  }
  
  const r = await fetch(`${DOME_BASE}${path}${qs}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!r.ok) {
    if (r.status === 429) {
      throw new Error(`Rate limit exceeded. Please wait before making more requests.`);
    }
    throw new Error(`Dome ${path} ${r.status}: ${r.statusText}`);
  }
  
  const data = await r.json();
  
  // Cache the result
  cache.set(cacheKey, { data, timestamp: now });
  
  return data as Promise<T>;
}

export async function getMarketPriceBySlug(apiKey: string, market_slug: string) {
  // Get latest orders to derive current market price
  const orders = await domeFetch<any>("/polymarket/orders", apiKey, { market_slug, limit: 1 });
  if (orders?.orders?.length > 0) {
    const latestOrder = orders.orders[0];
    return { price: latestOrder.price };
  }
  return { price: null };
}

export async function getCandlesBySlug(apiKey: string, market_slug: string, interval: string = "1m") {
  // First get orders to find the condition_id
  const orders = await domeFetch<any>("/polymarket/orders", apiKey, { market_slug, limit: 1 });
  if (orders?.orders?.length > 0) {
    const conditionId = orders.orders[0].condition_id;
    
    try {
      // Try to get real candlestick data from DOME API
      const candlesticks = await domeFetch<any>(`/polymarket/candlesticks/${conditionId}`, apiKey);
      if (candlesticks?.candlesticks?.length > 0) {
        const candles = candlesticks.candlesticks[0][0].map((candle: any) => ({
          t: new Date(candle.end_period_ts * 1000).toISOString(),
          o: parseFloat(candle.price.open_dollars),
          h: parseFloat(candle.price.high_dollars),
          l: parseFloat(candle.price.low_dollars),
          c: parseFloat(candle.price.close_dollars),
          v: candle.volume
        }));
        return { candles };
      }
    } catch (error) {
      console.log("Candlesticks API not available, falling back to order-based candles");
    }
    
    // Fallback: Create candles from orders if candlesticks API fails
    const allOrders = await domeFetch<any>("/polymarket/orders", apiKey, { market_slug, limit: 200 });
    if (allOrders?.orders?.length > 0) {
      const sortedOrders = allOrders.orders.sort((a: any, b: any) => a.timestamp - b.timestamp);
      
      const timeBuckets = new Map<number, any[]>();
      sortedOrders.forEach((order: any) => {
        const intervalSeconds = interval === "1m" ? 60 : interval === "5m" ? 300 : 3600;
        const bucketTime = Math.floor(order.timestamp / intervalSeconds) * intervalSeconds;
        
        if (!timeBuckets.has(bucketTime)) {
          timeBuckets.set(bucketTime, []);
        }
        timeBuckets.get(bucketTime)!.push(order);
      });
      
      const candles = Array.from(timeBuckets.entries())
        .sort(([a], [b]) => a - b)
        .map(([timestamp, ordersInBucket]) => {
          const prices = ordersInBucket.map((o: any) => o.price);
          const volumes = ordersInBucket.map((o: any) => o.shares_normalized);
          
          return {
            t: new Date(timestamp * 1000).toISOString(),
            o: prices[0],
            h: Math.max(...prices),
            l: Math.min(...prices),
            c: prices[prices.length - 1],
            v: volumes.reduce((sum, vol) => sum + vol, 0)
          };
        });
      
      return { candles };
    }
  }
  return { candles: [] };
}

export async function getOrderbookBySlug(apiKey: string, market_slug: string) {
  try {
    // First get orders to find token_id
    const orders = await domeFetch<any>("/polymarket/orders", apiKey, { market_slug, limit: 1 });
    if (orders?.orders?.length > 0) {
      const tokenId = orders.orders[0].token_id;
      
      // Get current orderbook data using the real DOME API endpoint
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000); // 1 hour ago
      
      try {
        const orderbookResponse = await domeFetch<any>("/polymarket/orderbooks", apiKey, {
          token_id: tokenId,
          start_time: oneHourAgo,
          end_time: now,
          limit: 1
        });
        
        if (orderbookResponse?.snapshots?.length > 0) {
          const latestSnapshot = orderbookResponse.snapshots[0];
          
          // Process bids and asks according to DOME API structure
          const bids = (latestSnapshot.bids || []).map((bid: any) => ({
            price: parseFloat(bid.price),
            size: parseFloat(bid.size)
          })).sort((a: any, b: any) => b.price - a.price); // Sort descending
          
          const asks = (latestSnapshot.asks || []).map((ask: any) => ({
            price: parseFloat(ask.price),
            size: parseFloat(ask.size)
          })).sort((a: any, b: any) => a.price - b.price); // Sort ascending
          
          // Calculate cumulative totals
          let cumulativeBidTotal = 0;
          const bidsWithTotal = bids.map((bid: any) => {
            cumulativeBidTotal += bid.size;
            return {
              ...bid,
              total: cumulativeBidTotal,
              maxTotal: bids.reduce((sum: number, b: any) => sum + b.size, 0)
            };
          });
          
          let cumulativeAskTotal = 0;
          const asksWithTotal = asks.map((ask: any) => {
            cumulativeAskTotal += ask.size;
            return {
              ...ask,
              total: cumulativeAskTotal,
              maxTotal: asks.reduce((sum: number, a: any) => sum + a.size, 0)
            };
          });
          
          return {
            bids: bidsWithTotal,
            asks: asksWithTotal,
            timestamp: latestSnapshot.timestamp,
            tokenId: latestSnapshot.assetId,
            market: latestSnapshot.market,
            tickSize: latestSnapshot.tickSize,
            minOrderSize: latestSnapshot.minOrderSize,
            negRisk: latestSnapshot.negRisk,
            hash: latestSnapshot.hash
          };
        }
      } catch (error) {
        console.log("Real orderbook API not available, falling back to orders-based orderbook:", error);
      }
      
      // Fallback: Create orderbook from recent orders
      const recentOrders = await domeFetch<any>("/polymarket/orders", apiKey, { 
        market_slug, 
        limit: 50 
      });
      
      if (recentOrders?.orders?.length > 0) {
        const bids = new Map<number, number>();
        const asks = new Map<number, number>();
        
        recentOrders.orders.forEach((order: any) => {
          const price = order.price;
          const size = order.shares_normalized;
          
          if (order.side === "BUY") {
            bids.set(price, (bids.get(price) || 0) + size);
          } else if (order.side === "SELL") {
            asks.set(price, (asks.get(price) || 0) + size);
          }
        });
        
        const bidArray = Array.from(bids.entries())
          .map(([price, size]) => ({ price, size }))
          .sort((a, b) => b.price - a.price);
        
        const askArray = Array.from(asks.entries())
          .map(([price, size]) => ({ price, size }))
          .sort((a, b) => a.price - b.price);
        
        // Calculate cumulative totals
        let cumulativeBidTotal = 0;
        const bidsWithTotal = bidArray.slice(0, 15).map((bid: any) => {
          cumulativeBidTotal += bid.size;
          return {
            ...bid,
            total: cumulativeBidTotal,
            maxTotal: bidArray.reduce((sum, b) => sum + b.size, 0)
          };
        });
        
        let cumulativeAskTotal = 0;
        const asksWithTotal = askArray.slice(0, 15).map((ask: any) => {
          cumulativeAskTotal += ask.size;
          return {
            ...ask,
            total: cumulativeAskTotal,
            maxTotal: askArray.reduce((sum, a) => sum + a.size, 0)
          };
        });
        
        return {
          bids: bidsWithTotal,
          asks: asksWithTotal,
          timestamp: Date.now(),
          tokenId: recentOrders.orders[0].token_id,
          market: null,
          tickSize: "0.001",
          minOrderSize: "5",
          negRisk: false,
          hash: null
        };
      }
    }
  } catch (error) {
    console.log("Failed to create orderbook:", error);
  }
  
  return { 
    bids: [], 
    asks: [], 
    timestamp: null, 
    tokenId: null,
    market: null,
    tickSize: "0.001",
    minOrderSize: "5",
    negRisk: false,
    hash: null
  };
}
