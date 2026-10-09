
"use client";

import { useEffect, useState } from "react";
import VirtualTrade from "./VirtualTrade";

type MarketPrices = {
  mark: number;
  last: number;
  mid: number;
  bid: number;
  ask: number;
  decimals: number;
};

type PerplMarket = {
  id: number;
  name: string;
  config: {
    price_decimals: number;
  };
  state: {
    mrk: number;
    lst: number;
    mid: number;
    bid: number;
    ask: number;
  };
};

type PerplContext = {
  markets: PerplMarket[];
};

type LiveMarketProps = {
  initialPrices: MarketPrices;
};

const REFRESH_INTERVAL = 5000;

export default function LiveMarket({
  initialPrices,
}: LiveMarketProps) {
  const [prices, setPrices] = useState(initialPrices);
  const [status, setStatus] = useState<
    "live" | "updating" | "error"
  >("live");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    async function updatePrices() {
      controller = new AbortController();

      try {
        const response = await fetch("/api/market", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Market API returned ${response.status}`);
        }

        const updatedPrices = (await response.json()) as MarketPrices;

        if (
          !Number.isFinite(updatedPrices.mark) ||
          updatedPrices.mark <= 0 ||
          !Number.isFinite(updatedPrices.last) ||
          !Number.isFinite(updatedPrices.mid) ||
          !Number.isFinite(updatedPrices.bid) ||
          !Number.isFinite(updatedPrices.ask)
        ) {
          throw new Error("Invalid market price data");
        }

        if (!active) return;

        setPrices(updatedPrices);
        setStatus("live");
        setLastUpdated(new Date());
      } catch (error) {
        if (!active) return;

        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setStatus("error");
      }
    }

    updatePrices();

    const interval = window.setInterval(updatePrices, REFRESH_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(interval);
      controller?.abort();
    };
  }, []);

  function formatPrice(value: number) {
    return `$${value.toFixed(prices.decimals)}`;
  }

  return (
    <>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">Perpl Market</p>
            <h2 className="text-2xl font-semibold">MON-PERP</h2>
          </div>

          <div className="text-right">
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                status === "live"
                  ? "bg-green-500/10 text-green-400"
                  : status === "error"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-amber-500/10 text-amber-400"
              }`}
            >
              {status === "live"
                ? "Live Perpl Data"
                : status === "error"
                  ? "Connection Error"
                  : "Updating"}
            </span>

            <p className="mt-2 text-xs text-zinc-500">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString()}`
                : "Connecting to market feed"}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-sm text-zinc-400">Mark Price</p>

          <p className="mt-1 text-5xl font-bold">
            {formatPrice(prices.mark)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MarketValue
            label="Last Price"
            value={formatPrice(prices.last)}
          />

          <MarketValue
            label="Mid Price"
            value={formatPrice(prices.mid)}
          />

          <MarketValue
            label="Best Bid"
            value={formatPrice(prices.bid)}
          />

          <MarketValue
            label="Best Ask"
            value={formatPrice(prices.ask)}
          />
        </div>

        {status === "error" && (
          <p className="mt-4 text-sm text-red-400">
            Could not refresh market data. Showing the last available
            prices. Retrying automatically.
          </p>
        )}
      </section>

      <VirtualTrade markPrice={prices.mark} />
    </>
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
      <p className="mt-1 font-mono text-lg font-semibold">
        {value}
      </p>
    </div>
  );
}
