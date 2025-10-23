# DOME API 實際響應示例

## 1. Orders API 響應示例

### 請求
```bash
GET https://api.domeapi.io/v1/polymarket/orders?market_slug=us-government-shutdown-by-october-1&limit=3
Authorization: Bearer your_api_key
```

### 響應
```json
{
  "orders": [
    {
      "id": "order_abc123",
      "market_slug": "us-government-shutdown-by-october-1",
      "token_id": "0x1234567890abcdef1234567890abcdef12345678",
      "condition_id": "0xabcdef1234567890abcdef1234567890abcdef12",
      "side": "BUY",
      "price": "0.65",
      "size": "100.0",
      "shares_normalized": "100.0",
      "timestamp": 1699123456,
      "user": "0xuser1234567890abcdef1234567890abcdef123456",
      "status": "OPEN",
      "created_at": "2023-11-04T12:30:56Z",
      "updated_at": "2023-11-04T12:30:56Z"
    },
    {
      "id": "order_def456",
      "market_slug": "us-government-shutdown-by-october-1", 
      "token_id": "0x1234567890abcdef1234567890abcdef12345678",
      "condition_id": "0xabcdef1234567890abcdef1234567890abcdef12",
      "side": "SELL",
      "price": "0.67",
      "size": "50.0",
      "shares_normalized": "50.0",
      "timestamp": 1699123400,
      "user": "0xuser9876543210fedcba9876543210fedcba987654",
      "status": "OPEN",
      "created_at": "2023-11-04T12:28:20Z",
      "updated_at": "2023-11-04T12:28:20Z"
    },
    {
      "id": "order_ghi789",
      "market_slug": "us-government-shutdown-by-october-1",
      "token_id": "0x1234567890abcdef1234567890abcdef12345678", 
      "condition_id": "0xabcdef1234567890abcdef1234567890abcdef12",
      "side": "BUY",
      "price": "0.64",
      "size": "75.0",
      "shares_normalized": "75.0",
      "timestamp": 1699123350,
      "user": "0xuser5555555555555555555555555555555555555555",
      "status": "FILLED",
      "created_at": "2023-11-04T12:27:30Z",
      "updated_at": "2023-11-04T12:27:30Z"
    }
  ]
}
```

## 2. Orderbooks API 響應示例

### 請求
```bash
GET https://api.domeapi.io/v1/polymarket/orderbooks?token_id=0x1234567890abcdef1234567890abcdef12345678&start_time=1699120000&end_time=1699124000&limit=1
Authorization: Bearer your_api_key
```

### 響應
```json
{
  "snapshots": [
    {
      "timestamp": 1699123456,
      "assetId": "0x1234567890abcdef1234567890abcdef12345678",
      "market": {
        "id": "market_12345",
        "name": "US Government Shutdown by October 1",
        "slug": "us-government-shutdown-by-october-1",
        "description": "Will the US government shut down by October 1, 2023?",
        "end_date": "2023-10-01T00:00:00Z",
        "resolution": "BINARY"
      },
      "bids": [
        {
          "price": "0.65",
          "size": "100.0"
        },
        {
          "price": "0.64", 
          "size": "75.0"
        },
        {
          "price": "0.63",
          "size": "200.0"
        },
        {
          "price": "0.62",
          "size": "150.0"
        },
        {
          "price": "0.61",
          "size": "300.0"
        }
      ],
      "asks": [
        {
          "price": "0.66",
          "size": "50.0"
        },
        {
          "price": "0.67",
          "size": "100.0"
        },
        {
          "price": "0.68",
          "size": "125.0"
        },
        {
          "price": "0.69",
          "size": "80.0"
        },
        {
          "price": "0.70",
          "size": "200.0"
        }
      ],
      "tickSize": "0.001",
      "minOrderSize": "5",
      "negRisk": false,
      "hash": "0xhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }
  ]
}
```

## 3. Candlesticks API 響應示例

### 請求
```bash
GET https://api.domeapi.io/v1/polymarket/candlesticks/0xabcdef1234567890abcdef1234567890abcdef12
Authorization: Bearer your_api_key
```

### 響應
```json
{
  "candlesticks": [
    [
      {
        "end_period_ts": 1699123500,
        "price": {
          "open_dollars": "0.65",
          "high_dollars": "0.67",
          "low_dollars": "0.64",
          "close_dollars": "0.66"
        },
        "volume": 150.0,
        "trades_count": 25
      },
      {
        "end_period_ts": 1699123560,
        "price": {
          "open_dollars": "0.66",
          "high_dollars": "0.68",
          "low_dollars": "0.65",
          "close_dollars": "0.67"
        },
        "volume": 200.0,
        "trades_count": 30
      },
      {
        "end_period_ts": 1699123620,
        "price": {
          "open_dollars": "0.67",
          "high_dollars": "0.69",
          "low_dollars": "0.66",
          "close_dollars": "0.68"
        },
        "volume": 175.0,
        "trades_count": 22
      }
    ]
  ]
}
```

## 4. 數據處理後的結果示例

### Orderbook 處理後
```json
{
  "bids": [
    {
      "price": 0.65,
      "size": 100.0,
      "total": 100.0
    },
    {
      "price": 0.64,
      "size": 75.0,
      "total": 175.0
    },
    {
      "price": 0.63,
      "size": 200.0,
      "total": 375.0
    }
  ],
  "asks": [
    {
      "price": 0.66,
      "size": 50.0,
      "total": 50.0
    },
    {
      "price": 0.67,
      "size": 100.0,
      "total": 150.0
    },
    {
      "price": 0.68,
      "size": 125.0,
      "total": 275.0
    }
  ],
  "timestamp": 1699123456,
  "tokenId": "0x1234567890abcdef1234567890abcdef12345678",
  "market": {
    "id": "market_12345",
    "name": "US Government Shutdown by October 1"
  },
  "tickSize": "0.001",
  "minOrderSize": "5",
  "negRisk": false,
  "hash": "0xhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
}
```

### Candles 處理後
```json
{
  "candles": [
    {
      "t": "2023-11-04T12:31:40.000Z",
      "o": 0.65,
      "h": 0.67,
      "l": 0.64,
      "c": 0.66,
      "v": 150
    },
    {
      "t": "2023-11-04T12:32:40.000Z",
      "o": 0.66,
      "h": 0.68,
      "l": 0.65,
      "c": 0.67,
      "v": 200
    },
    {
      "t": "2023-11-04T12:33:40.000Z",
      "o": 0.67,
      "h": 0.69,
      "l": 0.66,
      "c": 0.68,
      "v": 175
    }
  ]
}
```

## 5. 錯誤響應示例

### 速率限制錯誤
```json
{
  "error": "Rate limit exceeded",
  "message": "Rate limit exceeded. Please wait before making more requests.",
  "status": 429,
  "retry_after": 30
}
```

### 認證錯誤
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key",
  "status": 401
}
```

### 市場不存在錯誤
```json
{
  "error": "Not Found",
  "message": "Market not found",
  "status": 404
}
```

## 6. 備用機制示例

### 從訂單重建 Orderbook
```json
{
  "bids": [
    {
      "price": 0.65,
      "size": 100.0,
      "total": 100.0
    },
    {
      "price": 0.64,
      "size": 75.0,
      "total": 175.0
    }
  ],
  "asks": [
    {
      "price": 0.66,
      "size": 50.0,
      "total": 50.0
    },
    {
      "price": 0.67,
      "size": 100.0,
      "total": 150.0
    }
  ],
  "timestamp": 1699123456,
  "tokenId": "0x1234567890abcdef1234567890abcdef12345678",
  "market": null,
  "tickSize": "0.001",
  "minOrderSize": "5",
  "negRisk": false,
  "hash": null
}
```

## 7. 緩存機制示例

### 緩存鍵格式
```
/polymarket/orders?market_slug=us-government-shutdown-by-october-1&limit=1
/polymarket/orderbooks?token_id=0x1234567890abcdef1234567890abcdef12345678&start_time=1699120000&end_time=1699124000&limit=1
/polymarket/candlesticks/0xabcdef1234567890abcdef1234567890abcdef12
```

### 緩存值格式
```json
{
  "data": {
    "orders": [...]
  },
  "timestamp": 1699123456000
}
```

## 注意事項

1. **數據類型轉換**: 所有價格和數量都是字符串，需要 `parseFloat()` 轉換
2. **時間戳處理**: Unix時間戳需要乘以1000轉換為JavaScript時間戳
3. **錯誤處理**: 需要處理429速率限制和其他API錯誤
4. **緩存策略**: 30秒緩存避免頻繁請求
5. **備用機制**: 當主要API不可用時使用訂單數據重建
