
"use client";

import { useEffect, useState } from "react";
import VirtualTrade from "./components/VirtualTrade";

type MarketData = {
  mark: number;
  last: number;
  mid: number;
  bid: number;
  ask: number;
  decimals: number;
};

const REFRESH_INTERVAL = 5000;

export default function Home() {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    async function updateMarket() {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch("/api/market", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data: MarketData = await response.json();

        if (
          !Number.isFinite(data.mark) ||
          data.mark <= 0 ||
          !Number.isFinite(data.last) ||
          !Number.isFinite(data.mid) ||
          !Number.isFinite(data.bid) ||
          !Number.isFinite(data.ask) ||
          !Number.isInteger(data.decimals) ||
          data.decimals < 0 ||
          data.decimals > 12
        ) {
          throw new Error("Invalid market data received");
        }

        if (!active) return;

        setMarket(data);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        if (!active) return;

        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError("Market update failed. Retrying automatically.");
      }
    }

    void updateMarket();

    const interval = window.setInterval(() => {
      void updateMarket();
    }, REFRESH_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(interval);
      controller?.abort();
    };
  }, []);

  function displayPrice(value: number) {
    return `$${value.toFixed(market?.decimals ?? 6)}`;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-violet-400">
            Perpl RiskLab
          </p>

          <h1 className="text-4xl font-bold">
            Understand the risk before risking real money.
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Paper trading and risk simulation powered by real Perpl market
            data.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-400">Perpl Market</p>
              <h2 className="text-2xl font-semibold">MON-PERP</h2>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-sm ${
                error
                  ? "bg-amber-500/10 text-amber-400"
                  : market
                    ? "bg-green-500/10 text-green-400"
                    : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {error
                ? "Data Delayed"
                : market
                  ? "Perpl Data Connected"
                  : "Connecting..."}
            </span>
          </div>

          <div className="mb-8">
            <p className="text-sm text-zinc-400">Mark Price</p>

            <p className="mt-1 text-5xl font-bold">
              {market ? displayPrice(market.mark) : "Loading..."}
            </p>

            {lastUpdated && (
              <p className="mt-3 text-xs text-zinc-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
                {" · "}Auto-refresh every 5 seconds
              </p>
            )}

            {error && (
              <p className="mt-3 text-sm text-amber-400">
                {error}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MarketValue
              label="Last Price"
              value={market ? displayPrice(market.last) : "—"}
            />

            <MarketValue
              label="Mid Price"
              value={market ? displayPrice(market.mid) : "—"}
            />

            <MarketValue
              label="Best Bid"
              value={market ? displayPrice(market.bid) : "—"}
            />

            <MarketValue
              label="Best Ask"
              value={market ? displayPrice(market.ask) : "—"}
            />
          </div>
        </section>

        {market && !error ? (
          <VirtualTrade markPrice={market.mark} />
        ) : market ? (
          <div className="mt-6 rounded-xl border border-amber-500/20 bg-zinc-900 p-5 text-sm text-amber-300">
            Market data is delayed. Paper trading is temporarily
            unavailable until a fresh price arrives.
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
            Waiting for Perpl market data...
          </div>
        )}
      </div>
    </main>
  );
}

function MarketValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-950 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}
