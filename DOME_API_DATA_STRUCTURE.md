# DOME API 數據結構文檔

## API 基礎信息

- **Base URL**: `https://api.domeapi.io/v1`
- **認證方式**: Bearer Token (`Authorization: Bearer ${apiKey}`)
- **緩存策略**: 30秒緩存，避免頻繁請求

## 主要端點和數據結構

### 1. `/polymarket/orders` - 訂單數據

#### 請求參數
```typescript
{
  market_slug: string,    // 市場slug
  limit: number          // 限制返回數量
}
```

#### 響應結構
```typescript
interface OrdersResponse {
  orders: Order[];
}

interface Order {
  // 基本信息
  id: string;
  market_slug: string;
  token_id: string;
  condition_id: string;
  
  // 訂單詳情
  side: "BUY" | "SELL";
  price: number;
  size: number;
  shares_normalized: number;
  
  // 時間戳
  timestamp: number;
  
  // 其他字段
  [key: string]: any;
}
```

#### 實際使用示例
```typescript
// 獲取最新訂單
const orders = await domeFetch("/polymarket/orders", apiKey, { 
  market_slug: "us-government-shutdown", 
  limit: 1 
});

// 從訂單中提取信息
const latestOrder = orders.orders[0];
const tokenId = latestOrder.token_id;
const conditionId = latestOrder.condition_id;
const price = latestOrder.price;
```

### 2. `/polymarket/orderbooks` - Orderbook快照

#### 請求參數
```typescript
{
  token_id: string,      // 代幣ID
  start_time: number,    // 開始時間戳
  end_time: number,      // 結束時間戳
  limit: number          // 限制返回數量
}
```

#### 響應結構
```typescript
interface OrderbookResponse {
  snapshots: OrderbookSnapshot[];
}

interface OrderbookSnapshot {
  // 基本信息
  timestamp: number;
  assetId: string;
  market: any;
  
  // Orderbook數據
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  
  // 市場參數
  tickSize: string;
  minOrderSize: string;
  negRisk: boolean;
  hash: string;
}

interface OrderbookEntry {
  price: string;    // 價格（字符串格式）
  size: string;     // 數量（字符串格式）
}
```

#### 實際使用示例
```typescript
// 獲取orderbook快照
const orderbookResponse = await domeFetch("/polymarket/orderbooks", apiKey, {
  token_id: tokenId,
  start_time: oneHourAgo,
  end_time: now,
  limit: 1
});

// 處理orderbook數據
const latestSnapshot = orderbookResponse.snapshots[0];
const bids = latestSnapshot.bids.map(bid => ({
  price: parseFloat(bid.price),
  size: parseFloat(bid.size)
}));
```

### 3. `/polymarket/candlesticks/{conditionId}` - K線數據

#### 請求參數
```typescript
// URL路徑參數
conditionId: string
```

#### 響應結構
```typescript
interface CandlesticksResponse {
  candlesticks: CandlestickData[][];
}

interface CandlestickData {
  end_period_ts: number;  // 結束時間戳
  price: {
    open_dollars: string;   // 開盤價
    high_dollars: string;   // 最高價
    low_dollars: string;    // 最低價
    close_dollars: string;  // 收盤價
  };
  volume: number;          // 成交量
}
```

#### 實際使用示例
```typescript
// 獲取K線數據
const candlesticks = await domeFetch(`/polymarket/candlesticks/${conditionId}`, apiKey);

// 處理K線數據
const candles = candlesticks.candlesticks[0][0].map(candle => ({
  t: new Date(candle.end_period_ts * 1000).toISOString(),
  o: parseFloat(candle.price.open_dollars),
  h: parseFloat(candle.price.high_dollars),
  l: parseFloat(candle.price.low_dollars),
  c: parseFloat(candle.price.close_dollars),
  v: candle.volume
}));
```

## 數據處理和轉換

### 1. 價格數據處理
```typescript
// 原始數據（字符串）轉換為數字
const price = parseFloat(order.price);
const size = parseFloat(order.shares_normalized);
```

### 2. 時間戳處理
```typescript
// Unix時間戳轉換為ISO字符串
const timestamp = new Date(order.timestamp * 1000).toISOString();
```

### 3. Orderbook累積計算
```typescript
// 計算累積總量
let cumulativeTotal = 0;
const bidsWithTotal = bids.map(bid => {
  cumulativeTotal += bid.size;
  return {
    ...bid,
    total: cumulativeTotal
  };
});
```

## 錯誤處理

### 1. API錯誤響應
```typescript
if (!response.ok) {
  if (response.status === 429) {
    throw new Error("Rate limit exceeded. Please wait before making more requests.");
  }
  throw new Error(`Dome ${path} ${response.status}: ${response.statusText}`);
}
```

### 2. 數據驗證
```typescript
// 檢查響應數據結構
if (orders?.orders?.length > 0) {
  // 處理數據
} else {
  // 返回空數據或默認值
  return { orders: [] };
}
```

## 緩存機制

### 1. 緩存策略
```typescript
const CACHE_DURATION = 30000; // 30秒緩存
const cacheKey = `${path}${queryString}`;

// 檢查緩存
const cached = cache.get(cacheKey);
if (cached && (now - cached.timestamp) < CACHE_DURATION) {
  return cached.data;
}
```

### 2. 緩存更新
```typescript
// 更新緩存
cache.set(cacheKey, { data, timestamp: now });
```

## 實際使用場景

### 1. 獲取市場價格
```typescript
export async function getMarketPriceBySlug(apiKey: string, market_slug: string) {
  const orders = await domeFetch("/polymarket/orders", apiKey, { market_slug, limit: 1 });
  if (orders?.orders?.length > 0) {
    return { price: orders.orders[0].price };
  }
  return { price: null };
}
```

### 2. 獲取K線數據
```typescript
export async function getCandlesBySlug(apiKey: string, market_slug: string, interval: string = "1m") {
  // 1. 獲取condition_id
  const orders = await domeFetch("/polymarket/orders", apiKey, { market_slug, limit: 1 });
  const conditionId = orders.orders[0].condition_id;
  
  // 2. 獲取K線數據
  const candlesticks = await domeFetch(`/polymarket/candlesticks/${conditionId}`, apiKey);
  
  // 3. 處理和返回數據
  return { candles: processedCandles };
}
```

### 3. 獲取Orderbook數據
```typescript
export async function getOrderbookBySlug(apiKey: string, market_slug: string) {
  // 1. 獲取token_id
  const orders = await domeFetch("/polymarket/orders", apiKey, { market_slug, limit: 1 });
  const tokenId = orders.orders[0].token_id;
  
  // 2. 獲取orderbook快照
  const orderbookResponse = await domeFetch("/polymarket/orderbooks", apiKey, {
    token_id: tokenId,
    start_time: oneHourAgo,
    end_time: now,
    limit: 1
  });
  
  // 3. 處理和返回數據
  return processedOrderbook;
}
```

## 注意事項

1. **數據類型**: 大部分價格和數量數據以字符串形式返回，需要轉換為數字
2. **時間戳**: 使用Unix時間戳，需要轉換為JavaScript Date對象
3. **錯誤處理**: 需要處理API限制和網絡錯誤
4. **緩存**: 實現了30秒緩存機制，避免頻繁請求
5. **備用方案**: 當主要API不可用時，使用訂單數據重建orderbook

## 更新時間

- **文檔創建**: 2024年10月
- **API版本**: Dome API v1
- **最後更新**: 基於當前代碼實現
