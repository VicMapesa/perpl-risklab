
"use client";

import { useEffect, useState } from "react";

type VolatilityData = {
  market: string;
  source: string;
  candleIntervalSeconds: number;
  candleCount: number;
  firstOpen: number;
  lastClose: number;
  high: number;
  low: number;
  changePercent: number;
  rangePercent: number;
  fiveMinuteVolatilityPercent: number;
  scaled24hVolatilityPercent: number;
  observedFrom: number;
  observedTo: number;
};

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function VolatilityAnalysis() {
  const [data, setData] = useState<VolatilityData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadVolatility() {
      try {
        const response = await fetch("/api/volatility", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Historical data unavailable");
        }

        const result = (await response.json()) as VolatilityData;

        if (
          !Number.isFinite(result.high) ||
          !Number.isFinite(result.low) ||
          !Number.isFinite(result.changePercent) ||
          !Number.isFinite(result.rangePercent) ||
          !Number.isFinite(result.fiveMinuteVolatilityPercent) ||
          !Number.isFinite(result.scaled24hVolatilityPercent)
        ) {
          throw new Error("Invalid volatility data");
        }

        if (active) {
          setData(result);
          setError("");
        }
      } catch {
        if (active) {
          setError("Unable to load Perpl historical data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadVolatility();

    const timer = window.setInterval(loadVolatility, 60000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
          Risk Lab
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          Volatility Analysis
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          Explore how much MON has moved over the
          last 24 hours using historical Perpl market data.
        </p>
      </div>

      {loading && !data && (
        <p className="text-sm text-zinc-400">
          Loading Perpl historical prices...
        </p>
      )}

      {error && (
        <p className="mb-4 text-sm text-amber-400">
          {error}
          {data && " Showing the last successful reading."}
        </p>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
              <p className="text-sm text-zinc-400">
                Observed Price Change
              </p>

              <p
                className={`mt-2 text-3xl font-bold ${
                  data.changePercent < 0
                    ? "text-red-400"
                    : data.changePercent > 0
                      ? "text-green-400"
                      : "text-white"
                }`}
              >
                {formatPercent(data.changePercent)}
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                First candle open to last candle close
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Observed High–Low Range
              </p>

              <p className="mt-2 text-3xl font-bold">
                {data.rangePercent.toFixed(2)}%
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                Range divided by the first opening price
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Highest Observed Price
              </p>

              <p className="mt-2 font-mono text-2xl font-bold">
                ${data.high.toFixed(6)}
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Lowest Observed Price
              </p>

              <p className="mt-2 font-mono text-2xl font-bold">
                ${data.low.toFixed(6)}
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Five-Minute Return Volatility
              </p>

              <p className="mt-2 text-2xl font-bold">
                {data.fiveMinuteVolatilityPercent.toFixed(2)}%
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                Sample standard deviation of five-minute
                log returns
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                24-Hour-Scaled Volatility
              </p>

              <p className="mt-2 text-2xl font-bold">
                {data.scaled24hVolatilityPercent.toFixed(2)}%
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                Five-minute volatility multiplied by
                the square root of 288
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-300">
              Based on {data.candleCount} Perpl candles
              with a {data.candleIntervalSeconds / 60}-minute
              interval. These measurements describe
              historical price movement, not the risk
              of a particular future trade.
            </p>

            <p className="mt-2 text-xs text-zinc-500">
              Observed period:{" "}
              {new Date(data.observedFrom).toLocaleString()}
              {" — "}
              {new Date(data.observedTo).toLocaleString()}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-300">
              Educational historical analysis only.
              The 24-hour-scaled volatility is a statistical
              transformation of observed returns, not a
              prediction or guaranteed price range.
              Volatility can change suddenly, and leveraged
              positions can experience amplified losses.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
