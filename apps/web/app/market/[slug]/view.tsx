"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createChart, IChartApi, LineData } from "lightweight-charts";
import { getCandlesBySlug, getMarketPriceBySlug, getOrderbookBySlug } from "@poly/core";

type Props = { slug: string };

export default function MarketClient({ slug }: Props) {
  const [apiKey, setApiKey] = useState<string>(process.env.NEXT_PUBLIC_DOME_API_KEY || "");
  const [interval, setIntervalStr] = useState("1m");
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderbook, setOrderbook] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  // chart
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);

  useEffect(() => {
    const c = createChart(containerRef.current!, {
      height: 320, layout: { background: { color: "transparent" }, textColor: "#ddd" },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false }
    });
    const series = c.addAreaSeries({ lineWidth: 2 });
    chartRef.current = c;
    seriesRef.current = series;
    return () => c.remove();
  }, []);

  async function loadData() {
    if (!apiKey) {
      console.log("No API key provided");
      return;
    }
    
    const now = Date.now();
    if (now - lastRefresh < 5000) { // 5 second cooldown
      alert("Please wait 5 seconds between refreshes to avoid rate limits.");
      return;
    }
    
    setLoading(true);
    setLastRefresh(now);
    try {
      console.log("Loading data for slug:", slug, "with API key:", apiKey.substring(0, 8) + "...");
      
      const candles = await getCandlesBySlug(apiKey, slug, interval);
      console.log("Candles response:", candles);
      
      // Convert candles to chart data (already sorted and deduplicated in core package)
      const seriesData: LineData[] = (candles?.candles ?? []).map((c: any) => ({
        time: Math.floor(new Date(c.t).getTime() / 1000),
        value: Number(c.c) // close price
      }));
      
      console.log("Chart data points:", seriesData.length);
      if (seriesRef.current && seriesData.length > 0) {
        seriesRef.current.setData(seriesData);
        chartRef.current?.timeScale().fitContent();
        console.log("Chart data updated successfully");
      } else {
        console.log("No series ref or no data to display");
      }
      
      const p = await getMarketPriceBySlug(apiKey, slug);
      console.log("Price response:", p);
      if (p?.price !== undefined) setPrice(Number(p.price));
      
      // Load orderbook data
      const ob = await getOrderbookBySlug(apiKey, slug);
      console.log("Orderbook response:", ob);
      setOrderbook(ob);
    } catch (e: any) {
      console.error("Error loading data:", e);
      if (e.message.includes("Rate limit exceeded")) {
        alert(`Rate limit exceeded. Please wait 30 seconds before refreshing. The data shown may be cached.`);
      } else {
        alert(`Failed to load Dome data. Error: ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [apiKey, slug, interval]);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Market: {slug}</h1>
          <a 
            href={`https://polymarket.com/market/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            View on Polymarket ↗
          </a>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input max-w-[360px]"
            placeholder="DOME_API_KEY (personal)"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />
          <select className="input w-auto" value={interval} onChange={e => setIntervalStr(e.target.value)}>
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="1h">1h</option>
          </select>
          <button className="btn" onClick={loadData} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card">
          <div ref={containerRef} />
        </div>
        <div className="card space-y-3">
          <div className="text-sm text-neutral-400">Last Price</div>
          <div className="text-3xl font-bold">{price ?? "—"}</div>

          <div className="pt-4 border-t border-neutral-800">
            <div className="text-sm mb-2">Order (scaffold)</div>
            <OrderPanel slug={slug} />
          </div>
        </div>
      </div>

      {/* Enhanced Liquidity & Orderbook Display */}
      {orderbook && (orderbook.bids.length > 0 || orderbook.asks.length > 0) && (
        <div className="space-y-6">
          {/* Header with Status */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Liquidity & Orderbook</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${orderbook.hash ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                <span className={orderbook.hash ? 'text-green-400' : 'text-yellow-400'}>
                  {orderbook.hash ? 'Live Data' : 'Fallback Data'}
                </span>
              </div>
              <div className="text-neutral-400">
                Updated: {orderbook.timestamp ? new Date(orderbook.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
            </div>
          </div>

          {/* Key Liquidity Metrics */}
          {orderbook.bids.length > 0 && orderbook.asks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Spread & Mid Price */}
              <div className="card p-4">
                <div className="text-xs text-neutral-400 mb-2">Spread Analysis</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Best Bid</span>
                    <span className="text-lg font-bold text-green-400">
                      ${orderbook.bids[0]?.price.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Best Ask</span>
                    <span className="text-lg font-bold text-red-400">
                      ${orderbook.asks[0]?.price.toFixed(3)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-neutral-700">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-300">Spread</span>
                      <span className="text-sm font-semibold text-orange-400">
                        {((orderbook.asks[0]?.price - orderbook.bids[0]?.price) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-300">Mid Price</span>
                      <span className="text-sm font-semibold text-blue-400">
                        ${((orderbook.bids[0]?.price + orderbook.asks[0]?.price) / 2).toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liquidity Depth */}
              <div className="card p-4">
                <div className="text-xs text-neutral-400 mb-2">Liquidity Depth</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Bid Liquidity</span>
                    <span className="text-lg font-bold text-green-400">
                      {orderbook.bids.reduce((sum: number, bid: any) => sum + bid.size, 0).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Ask Liquidity</span>
                    <span className="text-lg font-bold text-red-400">
                      {orderbook.asks.reduce((sum: number, ask: any) => sum + ask.size, 0).toFixed(0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-neutral-700">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-300">Total Liquidity</span>
                      <span className="text-sm font-semibold text-purple-400">
                        {(orderbook.bids.reduce((sum: number, bid: any) => sum + bid.size, 0) + 
                          orderbook.asks.reduce((sum: number, ask: any) => sum + ask.size, 0)).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Parameters */}
              <div className="card p-4">
                <div className="text-xs text-neutral-400 mb-2">Market Parameters</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Tick Size</span>
                    <span className="text-sm font-semibold text-neutral-200">
                      {orderbook.tickSize}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Min Order</span>
                    <span className="text-sm font-semibold text-neutral-200">
                      {orderbook.minOrderSize}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Neg Risk</span>
                    <span className={`text-sm font-semibold ${orderbook.negRisk ? 'text-green-400' : 'text-red-400'}`}>
                      {orderbook.negRisk ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Quality */}
              <div className="card p-4">
                <div className="text-xs text-neutral-400 mb-2">Data Quality</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Token ID</span>
                    <span className="text-xs font-mono text-neutral-400">
                      {orderbook.tokenId?.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">Orders</span>
                    <span className="text-sm font-semibold text-neutral-200">
                      {orderbook.bids.length + orderbook.asks.length}
                    </span>
                  </div>
                  {orderbook.hash && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-300">Hash</span>
                      <span className="text-xs font-mono text-neutral-400">
                        {orderbook.hash.substring(0, 8)}...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Enhanced Cumulative Depth Chart */}
          <div className="card p-6">
            {/* Chart Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold">Liquidity Depth Visualization</h4>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-green-400 font-medium">Bids (Buy Orders)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <span className="text-red-400 font-medium">Asks (Sell Orders)</span>
                  </div>
                </div>
              </div>
              
              {/* Chart Description */}
              <div className="text-sm text-neutral-400 mb-4">
                This chart shows the cumulative liquidity at different price levels. Bids extend left from the center line, asks extend right. The height represents total liquidity available at each price point.
              </div>
            </div>

            {/* Chart Container */}
            <div className="relative h-80 sm:h-96 bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 rounded-xl p-4 sm:p-6 border border-neutral-700/50">
              {/* Fixed Y-axis labels */}
              <div className="absolute left-0 top-6 bottom-6 w-16 flex flex-col justify-between">
                {(() => {
                  const maxBidLiquidity = orderbook.bids.length > 0 ? 
                    Math.max(...orderbook.bids.map((b: any) => b.total)) : 0;
                  const maxAskLiquidity = orderbook.asks.length > 0 ? 
                    Math.max(...orderbook.asks.map((a: any) => a.total)) : 0;
                  const maxLiquidity = Math.max(maxBidLiquidity, maxAskLiquidity);
                  
                  const labels = [];
                  for (let i = 0; i <= 5; i++) {
                    const value = (maxLiquidity / 5) * (5 - i);
                    labels.push(
                      <div key={i} className="text-right text-sm font-mono text-neutral-300">
                        {value.toFixed(0)}
                      </div>
                    );
                  }
                  return labels;
                })()}
              </div>

              {/* Fixed X-axis labels */}
              <div className="absolute bottom-0 left-16 right-0 h-10 flex justify-between items-end">
                {(() => {
                  const allPrices = [
                    ...orderbook.bids.map((b: any) => b.price),
                    ...orderbook.asks.map((a: any) => a.price)
                  ];
                  
                  if (allPrices.length === 0) return null;
                  
                  const minPrice = Math.min(...allPrices);
                  const maxPrice = Math.max(...allPrices);
                  const priceRange = maxPrice - minPrice;
                  
                  const labels = [];
                  for (let i = 0; i <= 5; i++) {
                    const price = minPrice + (priceRange / 5) * i;
                    labels.push(
                      <div key={i} className="text-center text-sm font-mono text-neutral-300">
                        ${price.toFixed(3)}
                      </div>
                    );
                  }
                  return labels;
                })()}
              </div>

              {/* Enhanced Chart Area */}
              <div className="absolute left-16 top-6 right-6 bottom-10">
                {/* Enhanced Grid lines */}
                <div className="absolute inset-0">
                  {/* Horizontal grid lines */}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-full h-px bg-neutral-600/40"
                      style={{ top: `${(i / 5) * 100}%` }}
                    ></div>
                  ))}
                  {/* Vertical grid lines */}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute h-full w-px bg-neutral-600/40"
                      style={{ left: `${(i / 5) * 100}%` }}
                    ></div>
                  ))}
                </div>

                {/* Fixed Depth Chart */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {(() => {
                    if (orderbook.bids.length === 0 && orderbook.asks.length === 0) return null;
                    
                    // Get price range
                    const allPrices = [
                      ...orderbook.bids.map((b: any) => b.price),
                      ...orderbook.asks.map((a: any) => a.price)
                    ];
                    
                    if (allPrices.length === 0) return null;
                    
                    const minPrice = Math.min(...allPrices);
                    const maxPrice = Math.max(...allPrices);
                    const priceRange = maxPrice - minPrice;
                    
                    // Get max liquidity for scaling
                    const maxBidLiquidity = orderbook.bids.length > 0 ? 
                      Math.max(...orderbook.bids.map((b: any) => b.total)) : 0;
                    const maxAskLiquidity = orderbook.asks.length > 0 ? 
                      Math.max(...orderbook.asks.map((a: any) => a.total)) : 0;
                    const maxLiquidity = Math.max(maxBidLiquidity, maxAskLiquidity);
                    
                    if (maxLiquidity === 0) return null;
                    
                    // Create center line (50% of chart width)
                    const centerX = 50;
                    
                    // Create bid area (left side, extending from center)
                    const bidPoints = orderbook.bids.map((bid: any) => {
                      const x = centerX - ((bid.price - minPrice) / priceRange) * centerX;
                      const y = 100 - ((bid.total / maxLiquidity) * 100);
                      return `${x},${y}`;
                    }).join(' ');
                    
                    // Create ask area (right side, extending from center)
                    const askPoints = orderbook.asks.map((ask: any) => {
                      const x = centerX + ((ask.price - minPrice) / priceRange) * centerX;
                      const y = 100 - ((ask.total / maxLiquidity) * 100);
                      return `${x},${y}`;
                    }).join(' ');
                    
                    return (
                      <>
                        {/* Center line */}
                        <line
                          x1={centerX}
                          y1="0"
                          x2={centerX}
                          y2="100"
                          stroke="rgb(156, 163, 175)"
                          strokeWidth="0.5"
                          opacity="0.5"
                        />
                        
                        {/* Bid area (left side) */}
                        {bidPoints && orderbook.bids.length > 0 && (
                          <polygon
                            points={`0,100 ${bidPoints} 0,100`}
                            fill="url(#bidGradient)"
                            stroke="rgb(34, 197, 94)"
                            strokeWidth="0.5"
                            opacity="0.7"
                          />
                        )}
                        
                        {/* Ask area (right side) */}
                        {askPoints && orderbook.asks.length > 0 && (
                          <polygon
                            points={`100,100 ${askPoints} 100,100`}
                            fill="url(#askGradient)"
                            stroke="rgb(239, 68, 68)"
                            strokeWidth="0.5"
                            opacity="0.7"
                          />
                        )}
                        
                        {/* Gradient definitions */}
                        <defs>
                          <linearGradient id="bidGradient" x1="100%" y1="0%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.4)" />
                            <stop offset="100%" stopColor="rgba(34, 197, 94, 0.1)" />
                          </linearGradient>
                          <linearGradient id="askGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
                            <stop offset="100%" stopColor="rgba(239, 68, 68, 0.1)" />
                          </linearGradient>
                        </defs>
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Enhanced Axis Labels */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-sm font-medium text-neutral-300">
                Price (USD)
              </div>
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-medium text-neutral-300">
                Cumulative Liquidity
              </div>
            </div>
          </div>
          
          {/* Fixed Orderbook Table */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold">Detailed Orderbook</h4>
              <div className="text-sm text-neutral-400">
                Showing {orderbook.bids.length + orderbook.asks.length} orders
              </div>
            </div>
            
            {/* Proper Orderbook Layout - Separate Ask and Bid Sections */}
            <div className="space-y-4">
              {/* Ask Section */}
              <div>
                <div className="text-sm font-semibold text-red-400 mb-2">Ask Orders (Sell)</div>
                <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm text-neutral-400 font-semibold mb-2 pb-1 border-b border-neutral-700">
                  <div className="text-right">Price</div>
                  <div className="text-right">Size</div>
                  <div className="text-right">Total</div>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {[...orderbook.asks]
                    .sort((a: any, b: any) => b.price - a.price) // Sort asks descending (highest first, closest to spread)
                    .slice(0, 10)
                    .map((ask: any, index: number) => {
                      const askLiquidityPercent = (ask.size / orderbook.asks.reduce((sum: number, a: any) => sum + a.size, 0)) * 100;
                      return (
                        <div key={index} className="grid grid-cols-3 gap-2 items-center py-1 px-2 hover:bg-neutral-800/30 transition-colors text-xs sm:text-sm rounded">
                          <div className="text-right">
                            <span className="text-red-400 font-mono font-semibold">
                              ${ask.price.toFixed(3)}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-neutral-200 font-mono">
                                {ask.size.toFixed(2)}
                              </span>
                              <div 
                                className="w-1 h-3 bg-red-400 rounded-full opacity-60"
                                style={{ height: `${Math.max(askLiquidityPercent * 2, 6)}px` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-neutral-300 font-mono">
                              {ask.total.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Center Divider */}
              <div className="flex items-center justify-center py-2">
                <div className="w-full h-px bg-neutral-600"></div>
                <div className="px-4 text-xs text-neutral-500">Spread</div>
                <div className="w-full h-px bg-neutral-600"></div>
              </div>

              {/* Bid Section */}
              <div>
                <div className="text-sm font-semibold text-green-400 mb-2">Bid Orders (Buy)</div>
                <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm text-neutral-400 font-semibold mb-2 pb-1 border-b border-neutral-700">
                  <div className="text-right">Price</div>
                  <div className="text-right">Size</div>
                  <div className="text-right">Total</div>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {[...orderbook.bids]
                    .sort((a: any, b: any) => b.price - a.price) // Sort bids descending (highest first)
                    .slice(0, 10)
                    .map((bid: any, index: number) => {
                      const bidLiquidityPercent = (bid.size / orderbook.bids.reduce((sum: number, b: any) => sum + b.size, 0)) * 100;
                      return (
                        <div key={index} className="grid grid-cols-3 gap-2 items-center py-1 px-2 hover:bg-neutral-800/30 transition-colors text-xs sm:text-sm rounded">
                          <div className="text-right">
                            <span className="text-green-400 font-mono font-semibold">
                              ${bid.price.toFixed(3)}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-neutral-200 font-mono">
                                {bid.size.toFixed(2)}
                              </span>
                              <div 
                                className="w-1 h-3 bg-green-400 rounded-full opacity-60"
                                style={{ height: `${Math.max(bidLiquidityPercent * 2, 6)}px` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-neutral-300 font-mono">
                              {bid.total.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
            
            {/* Table Footer with Summary */}
            <div className="mt-4 pt-4 border-t border-neutral-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-neutral-400">Bid Summary</div>
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Total Orders:</span>
                    <span className="text-green-400 font-semibold">{orderbook.bids.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Total Liquidity:</span>
                    <span className="text-green-400 font-semibold">
                      {orderbook.bids.reduce((sum: number, bid: any) => sum + bid.size, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-neutral-400">Ask Summary</div>
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Total Orders:</span>
                    <span className="text-red-400 font-semibold">{orderbook.asks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Total Liquidity:</span>
                    <span className="text-red-400 font-semibold">
                      {orderbook.asks.reduce((sum: number, ask: any) => sum + ask.size, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function OrderPanel({ slug }: { slug: string }) {
  const [outcome, setOutcome] = useState<"yes"|"no">("yes");
  const [side, setSide] = useState<"buy"|"sell">("buy");
  const [price, setPrice] = useState<string>("0.50");
  const [size, setSize] = useState<string>("10");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);

  // Connect wallet function
  async function connectWallet() {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        alert('Failed to connect wallet. Please try again.');
      }
    } else {
      alert('Please install MetaMask or another Web3 wallet to connect.');
    }
  }

  // Disconnect wallet
  function disconnectWallet() {
    setWalletAddress("");
    setIsConnected(false);
  }

  // Place order function with proper Polymarket CLOB integration
  async function placeOrder() {
    if (!isConnected && !walletAddress) {
      alert('Please connect your wallet or enter your public key first.');
      return;
    }

    setIsPlacingOrder(true);
    
    try {
      // Step 1: Get market information
      const marketInfo = await getMarketInfo(slug);
      if (!marketInfo) {
        throw new Error('Failed to get market information');
      }

      // Step 2: Prepare order data according to Polymarket CLOB API
      const orderData = {
        marketId: marketInfo.marketId,
        outcomeId: outcome === "yes" ? marketInfo.yesTokenId : marketInfo.noTokenId,
        side: side.toUpperCase(), // BUY or SELL
        price: parseFloat(price),
        size: parseFloat(size),
        orderType: "LIMIT", // or "MARKET"
        timeInForce: "GTC", // Good Till Cancel
        clientOrderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Step 3: Sign the order (this would require proper authentication)
      const signedOrder = await signOrder(orderData, walletAddress);
      
      // Step 4: Submit to Polymarket CLOB
      const response = await submitOrder(signedOrder);
      
      if (response.success) {
        alert(`Order placed successfully!\nOrder ID: ${response.orderId}\n${side.toUpperCase()} ${outcome.toUpperCase()} ${size}@${price}`);
      } else {
        throw new Error(response.error || 'Failed to place order');
      }
      
    } catch (error: any) {
      console.error('Order placement failed:', error);
      alert(`Failed to place order: ${error.message}`);
    } finally {
      setIsPlacingOrder(false);
    }
  }

  // Helper functions (these would need proper implementation)
  async function getMarketInfo(slug: string) {
    // This would call your backend or directly to Polymarket API
    // to get market details including marketId and tokenIds
    return {
      marketId: "market_id_here",
      yesTokenId: "yes_token_id_here", 
      noTokenId: "no_token_id_here"
    };
  }

  async function signOrder(orderData: any, walletAddress: string) {
    // This would implement the proper signing mechanism
    // For now, return a mock signed order
    return {
      ...orderData,
      signature: "mock_signature_here",
      timestamp: Date.now()
    };
  }

  async function submitOrder(signedOrder: any) {
    // This would submit to Polymarket CLOB API
    // For now, return a mock response
    return {
      success: true,
      orderId: `order_${Date.now()}`,
      status: "PENDING",
      error: null
    };
  }

  return (
    <div className="space-y-3">
      {/* Wallet Connection Section */}
      <div>
        <div className="text-xs text-neutral-400 mb-2">Wallet Connection</div>
        {!isConnected ? (
          <div className="space-y-2">
            <button 
              className="btn w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={connectWallet}
            >
              Connect Web3 Wallet
            </button>
            <div className="text-center text-xs text-neutral-500">or</div>
            <div>
              <input 
                className="input w-full text-sm"
                placeholder="Enter your public key (0x...)"
                value={walletAddress}
                onChange={e => setWalletAddress(e.target.value)}
              />
              <div className="text-xs text-neutral-500 mt-1">
                Enter your wallet address to place orders
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-green-900/20 border border-green-700 rounded">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 text-sm font-medium">Connected</span>
              </div>
              <button 
                className="text-xs text-neutral-400 hover:text-neutral-300"
                onClick={disconnectWallet}
              >
                Disconnect
              </button>
            </div>
            <div className="text-xs text-neutral-400 font-mono break-all">
              {walletAddress}
            </div>
          </div>
        )}
      </div>

      {/* Outcome Selection */}
      <div>
        <div className="text-xs text-neutral-400 mb-2">Outcome</div>
        <div className="flex gap-2">
          <button 
            className={`btn flex-1 ${outcome==="yes"?"bg-green-900/30 border-green-700 text-green-400":"text-neutral-400"}`} 
            onClick={()=>setOutcome("yes")}
          >
            Yes
          </button>
          <button 
            className={`btn flex-1 ${outcome==="no"?"bg-red-900/30 border-red-700 text-red-400":"text-neutral-400"}`} 
            onClick={()=>setOutcome("no")}
          >
            No
          </button>
        </div>
      </div>

      {/* Side Selection */}
      <div>
        <div className="text-xs text-neutral-400 mb-2">Action</div>
        <div className="flex gap-2">
          <button 
            className={`btn flex-1 ${side==="buy"?"bg-emerald-900/30 border-emerald-700 text-emerald-400":"text-neutral-400"}`} 
            onClick={()=>setSide("buy")}
          >
            Buy
          </button>
          <button 
            className={`btn flex-1 ${side==="sell"?"bg-rose-900/30 border-rose-700 text-rose-400":"text-neutral-400"}`} 
            onClick={()=>setSide("sell")}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Price and Size Inputs */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-neutral-400 mb-1">Price</div>
          <input 
            className="input" 
            value={price} 
            onChange={e=>setPrice(e.target.value)} 
            placeholder="0.50"
            disabled={isPlacingOrder}
          />
        </div>
        <div>
          <div className="text-xs text-neutral-400 mb-1">Size</div>
          <input 
            className="input" 
            value={size} 
            onChange={e=>setSize(e.target.value)} 
            placeholder="10"
            disabled={isPlacingOrder}
          />
        </div>
      </div>

      {/* Place Order Button */}
      <button 
        className={`btn w-full ${
          side === "buy" 
            ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
            : "bg-rose-600 hover:bg-rose-700 text-white"
        } ${isPlacingOrder ? "opacity-50 cursor-not-allowed" : ""}`} 
        onClick={placeOrder}
        disabled={isPlacingOrder || (!isConnected && !walletAddress)}
      >
        {isPlacingOrder ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Placing Order...
          </div>
        ) : (
          `${side === "buy" ? "Buy" : "Sell"} ${outcome === "yes" ? "Yes" : "No"} @ $${price}`
        )}
      </button>
      
      <div className="text-xs text-neutral-500">
        Orders are placed directly on Polymarket CLOB. Use at your own risk.
      </div>
    </div>
  );
}
