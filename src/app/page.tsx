
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

  function goToTrading() {
    document.getElementById("virtual-trading")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#0d0d16]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-xl font-black shadow-lg shadow-violet-900/30">
              R
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight">
                Perpl <span className="text-violet-400">RiskLab</span>
              </p>
              <p className="text-xs text-zinc-500">
                Learn risk. Trade virtually.
              </p>
            </div>
          </div>

          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400">
            ● 100% Virtual Simulation
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#211735] via-[#141324] to-[#101018] px-6 py-10 sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />

          <div className="relative max-w-3xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-violet-300">
              Welcome to your trading risk lab
            </p>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Understand trading risk
              <span className="block text-violet-400">
                before risking real money.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              Curious about crypto trading? Practice with pretend money,
              explore what happens when prices move, and discover how
              leverage changes your potential gains and losses.
            </p>

            <p className="mt-3 text-sm text-zinc-400">
              Powered by real Perpl market data. No wallet, deposits,
              or real trades required.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={goToTrading}
                className="rounded-xl bg-violet-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
              >
                Start Learning →
              </button>

              <a
                href="#how-it-works"
                className="rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
              >
                How It Works
              </a>
            </div>
          </div>
        </section>

        {/* BEGINNER JOURNEY */}
        <section id="how-it-works" className="mt-14 scroll-mt-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
              Simple by design
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Learn in three easy steps
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
              You don't need trading experience to get started.
              Explore at your own pace.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <JourneyCard
              number="01"
              icon="↗"
              title="Try a virtual trade"
              description="Choose whether to explore a price rise or fall. Use pretend collateral and choose your leverage."
            />

            <JourneyCard
              number="02"
              icon="↔"
              title="Change the scenario"
              description="Move the price simulator and see how your hypothetical profit, loss, and remaining equity change."
            />

            <JourneyCard
              number="03"
              icon="✦"
              title="Understand the risk"
              description="Explore liquidation risk, funding, volatility, and the danger of entering after a price rally."
            />
          </div>
        </section>

        {/* MARKET */}
        <section className="mt-14 overflow-hidden rounded-3xl border border-white/10 bg-[#15151e] p-5 sm:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
                Real market data
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                MON-PERP
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                A perpetual futures market for MON on Perpl.
              </p>
            </div>

            <span
              role="status"
              className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                error
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                  : market
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400"
              }`}
            >
              {error
                ? "● Market Data Delayed"
                : market
                  ? "● Perpl Data Connected"
                  : "● Connecting to Perpl..."}
            </span>
          </div>

          <div className="mb-8 rounded-2xl border border-violet-500/10 bg-[#101019] p-5 sm:p-7">
            <p className="text-sm text-zinc-400">
              Current Mark Price
            </p>

            <p className="mt-2 break-all font-mono text-4xl font-bold tracking-tight sm:text-5xl">
              {market ? displayPrice(market.mark) : "Loading..."}
            </p>

            <p className="mt-3 max-w-xl text-xs leading-6 text-zinc-500">
              The mark price is a reference price used to evaluate
              perpetual futures positions. Your virtual position
              uses this price to estimate unrealized profit or loss.
            </p>

            {lastUpdated && (
              <p className="mt-4 text-xs text-zinc-500">
                Updated: {lastUpdated.toLocaleTimeString()}
                {" · "}Refreshes every 5 seconds
              </p>
            )}

            {error && (
              <p className="mt-3 text-sm text-amber-400">
                {error}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MarketValue
              label="Last Price"
              explanation="Most recent reported trade price"
              value={market ? displayPrice(market.last) : "—"}
            />

            <MarketValue
              label="Mid Price"
              explanation="Midpoint between bid and ask"
              value={market ? displayPrice(market.mid) : "—"}
            />

            <MarketValue
              label="Best Bid"
              explanation="Highest currently quoted buy price"
              value={market ? displayPrice(market.bid) : "—"}
            />

            <MarketValue
              label="Best Ask"
              explanation="Lowest currently quoted sell price"
              value={market ? displayPrice(market.ask) : "—"}
            />
          </div>
        </section>

        {/* TRADING */}
        <section id="virtual-trading" className="mt-14 scroll-mt-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
              Your interactive playground
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Ready to explore?
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
              Start a virtual position below. LONG explores a price
              increase; SHORT explores a price decrease. Both can
              produce losses when the market moves against the position.
            </p>
          </div>

          {market && !error ? (
            <VirtualTrade markPrice={market.mark} />
          ) : market ? (
            <div className="rounded-2xl border border-amber-500/20 bg-[#15151e] p-6 text-sm text-amber-300">
              Market data is delayed. Paper trading is temporarily
              unavailable until a fresh price arrives.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#15151e] p-6 text-zinc-400">
              Waiting for Perpl market data...
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="mt-16 border-t border-white/10 pt-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-zinc-200">
                Perpl RiskLab
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Learn through simulation. Understand the risk.
              </p>
            </div>

            <p className="max-w-sm text-xs leading-6 text-zinc-500">
              Educational simulation only. No real trading,
              wallet connection, or financial recommendations.
              Simplified risk estimates are not exchange
              liquidation calculations.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

function JourneyCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#15151e] p-6 transition hover:border-violet-500/30">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-2xl font-bold text-violet-400">
          {icon}
        </div>

        <span className="font-mono text-sm text-zinc-600">
          {number}
        </span>
      </div>

      <h3 className="text-lg font-bold">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-zinc-400">
        {description}
      </p>
    </div>
  );
}

function MarketValue({
  label,
  value,
  explanation,
}: {
  label: string;
  value: string;
  explanation: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-[#0d0d14] p-4 sm:p-5">
      <p className="text-xs font-medium text-zinc-400">
        {label}
      </p>

      <p className="mt-3 break-all font-mono text-base font-semibold text-white sm:text-lg">
        {value}
      </p>

      <p className="mt-3 text-xs leading-5 text-zinc-500">
        {explanation}
      </p>
    </div>
  );
}
