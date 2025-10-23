import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container space-y-6">
          <header className="flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">Poly Terminal</Link>
            <nav className="flex items-center gap-3">
              <Link href="/" className="btn">Watchlist</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
