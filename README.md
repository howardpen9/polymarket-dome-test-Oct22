# Polymarket Trading Terminal

A modern trading terminal for Polymarket prediction markets, built with Next.js and TypeScript. Features real-time market data via Dome API, advanced orderbook visualization, and direct trading integration.

## ✨ Features

- **Real-time Market Data**: Live price feeds, candlestick charts, and orderbook data via Dome API
- **Advanced Orderbook Visualization**: Interactive depth charts and detailed orderbook tables
- **Direct Trading**: Web3 wallet integration for placing orders directly on Polymarket CLOB
- **Market Analysis**: Comprehensive liquidity metrics, spread analysis, and market parameters
- **Responsive Design**: Modern UI optimized for desktop and mobile trading
- **Watchlist Management**: Simple markdown-based watchlist for tracking multiple markets

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Dome API key
- Web3 wallet (MetaMask, etc.)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd polymarket-dome-test-Oct22

# Install dependencies
pnpm install

# Setup environment variables
cp apps/web/.env.local.example apps/web/.env.local
# Add your Dome API key to .env.local

# Start development server
pnpm dev
```

Open http://localhost:3000 to view the application.

## 📊 Market Data Integration

### Dome API Endpoints Used
- `/polymarket/orders` - Real-time order data
- `/polymarket/orderbooks` - Historical orderbook snapshots  
- `/polymarket/candlesticks/{conditionId}` - OHLCV candlestick data

### Data Features
- **Live Price Tracking**: Real-time market price updates
- **Orderbook Depth**: Cumulative liquidity visualization
- **Spread Analysis**: Bid-ask spread monitoring
- **Market Parameters**: Tick size, minimum order size, risk settings

## 🎯 Trading Features

### Order Placement
- **Web3 Wallet Integration**: Connect MetaMask or other Web3 wallets
- **Manual Address Input**: Enter wallet address directly
- **Yes/No Selection**: Choose prediction market outcome
- **Buy/Sell Actions**: Place limit orders with custom price and size
- **Order Confirmation**: Real-time order status and ID tracking

### Orderbook Display
- **Traditional Layout**: Separate Ask and Bid sections
- **Price Sorting**: 
  - Asks: Highest price first (closest to spread)
  - Bids: Highest price first (closest to spread)
- **Liquidity Indicators**: Visual bars showing relative order sizes
- **Cumulative Totals**: Running totals for market depth analysis

## 📁 Project Structure

```
polymarket-dome-test-Oct22/
├── apps/
│   ├── web/                 # Next.js frontend application
│   │   ├── app/
│   │   │   ├── market/[slug]/  # Dynamic market pages
│   │   │   └── page.tsx        # Homepage with watchlist
│   │   └── package.json
│   └── backend/              # Express.js backend (minimal)
├── packages/
│   └── core/                # Shared TypeScript utilities
│       ├── src/index.ts     # Dome API integration
│       └── dist/            # Compiled output
├── watchlist.md             # Market watchlist (markdown)
└── pnpm-workspace.yaml      # Monorepo configuration
```

## 🔧 Configuration

### Environment Variables
Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_DOME_API_KEY=your_dome_api_key_here
```

### Watchlist Management
Edit `watchlist.md` to add markets:
```markdown
# Market Watchlist

https://polymarket.com/event/us-government-shutdown-by-october-1
us-government-shutdown-by-october-1
us-government-shutdown-by-october-1, 00000000-0000-0000-0000-000000000000
```

## 🛠️ Development

### Available Scripts
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm type-check   # Run TypeScript checks
```

### Tech Stack
- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Lightweight Charts
- **State Management**: React Hooks
- **API Integration**: Dome API
- **Trading**: Polymarket CLOB integration

## 📈 Trading Integration

### Polymarket CLOB API
The application integrates with Polymarket's Central Limit Order Book (CLOB) for:
- Order placement and management
- Real-time orderbook data
- Market depth analysis
- Trade execution

### Web3 Integration
- **Wallet Connection**: MetaMask and other Web3 wallets
- **Transaction Signing**: Secure order signing
- **Address Management**: Manual address input option

## ⚠️ Disclaimer

This is a trading application for educational and personal use. Trading prediction markets involves financial risk. Use at your own risk and never trade with money you cannot afford to lose.

## 📄 License

This project is for educational purposes. Please ensure compliance with Polymarket's terms of service and applicable regulations.
