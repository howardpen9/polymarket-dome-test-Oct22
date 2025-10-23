import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { parseWatchlist } from "@poly/core";

export default async function Home() {
  const mdPath = path.join(process.cwd(), "..", "..", "watchlist.md");
  const md = fs.readFileSync(mdPath, "utf-8");
  const items = parseWatchlist(md);
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      <div className="grid gap-4 grid-cols-auto">
        {items.map((it, i) => (
          <Link key={i} href={`/market/${encodeURIComponent(it.slug)}`} className="card hover:bg-neutral-900 transition">
            <div className="text-lg font-medium">{it.slug}</div>
            {it.marketId && <div className="text-sm text-neutral-400">marketId: {it.marketId}</div>}
            <div className="text-xs text-neutral-500">Click to open</div>
          </Link>
        ))}
      </div>
      <p className="text-sm text-neutral-500">Edit <code>watchlist.md</code> at repo root to manage your list.</p>
    </main>
  );
}
