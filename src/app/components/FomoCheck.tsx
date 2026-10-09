
"use client";

import { useEffect, useState } from "react";

type FomoData = {
  market: string;
  source: string;
  currentPrice: number;
  hourAgoPrice: number;
  dayStartPrice: number;
  dayHigh: number;
  dayLow: number;
  oneHourChangePercent: number;
  dayChangePercent: number;
  candleCount: number;
  observedAt: number;
};

type FomoCheckProps = {
  collateral: number;
  leverage: number;
};

function price(value: number) {
  return `$${value.toFixed(6)}`;
}

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function FomoCheck({
  collateral,
  leverage,
}: FomoCheckProps) {
  const [data, setData] = useState<FomoData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [pullbackPercent, setPullbackPercent] = useState(5);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const response = await fetch("/api/fomo", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("FOMO data unavailable");
        }

        const result = (await response.json()) as FomoData;

        if (
          !Number.isFinite(result.currentPrice) ||
          result.currentPrice <= 0 ||
          !Number.isFinite(result.hourAgoPrice) ||
          result.hourAgoPrice <= 0 ||
          !Number.isFinite(result.dayHigh) ||
          !Number.isFinite(result.dayLow) ||
          !Number.isFinite(result.oneHourChangePercent) ||
          !Number.isFinite(result.dayChangePercent)
        ) {
          throw new Error("Invalid historical data");
        }

        if (active) {
          setData(result);
          setError("");
        }
      } catch {
        if (active) {
          setError("Unable to load historical MON prices.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    const timer = window.setInterval(loadData, 60000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const exposure = collateral * leverage;

  const scenarioPrice = data
    ? data.currentPrice * (1 - pullbackPercent / 100)
    : 0;

  const scenarioPnL =
    -(exposure * pullbackPercent) / 100;

  const scenarioEquity = collateral + scenarioPnL;

  const scenarioReturn =
    collateral > 0
      ? (scenarioPnL / collateral) * 100
      : 0;

  const recentRally =
    data !== null && data.oneHourChangePercent > 0;

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
          Risk Lab
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          FOMO Check
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          Explore the risk of entering a leveraged LONG
          after a price increase. This is an educational
          scenario, not a trading signal.
        </p>
      </div>

      {loading && !data && (
        <p className="text-sm text-zinc-400">
          Loading Perpl price history...
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
                Observed 1-Hour Price Change
              </p>

              <p
                className={`mt-2 text-3xl font-bold ${
                  data.oneHourChangePercent > 0
                    ? "text-green-400"
                    : data.oneHourChangePercent < 0
                      ? "text-red-400"
                      : "text-white"
                }`}
              >
                {signedPercent(data.oneHourChangePercent)}
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                Latest candle close versus approximately
                one hour earlier
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Observed 24-Hour Price Change
              </p>

              <p
                className={`mt-2 text-3xl font-bold ${
                  data.dayChangePercent < 0
                    ? "text-red-400"
                    : data.dayChangePercent > 0
                      ? "text-green-400"
                      : "text-white"
                }`}
              >
                {signedPercent(data.dayChangePercent)}
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Latest Candle Close
              </p>

              <p className="mt-2 font-mono text-2xl font-bold">
                {price(data.currentPrice)}
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Price One Hour Earlier
              </p>

              <p className="mt-2 font-mono text-2xl font-bold">
                {price(data.hourAgoPrice)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
            <p className="font-semibold text-white">
              Historical Context
            </p>

            <p className="mt-2 text-sm text-zinc-300">
              {recentRally
                ? "MON increased over the observed one-hour period. A recent price increase does not guarantee that the increase will continue."
                : "MON did not increase over the observed one-hour period. The downside scenario below remains useful for understanding leveraged exposure."}
            </p>

            <p className="mt-2 text-sm text-zinc-400">
              Observed 24-hour range:{" "}
              {price(data.dayLow)} to {price(data.dayHigh)}
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
              Hypothetical Rally-Entry Scenario
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              What if MON falls after a new LONG entry?
            </h3>

            <p className="mt-2 text-sm text-zinc-400">
              Assume a new virtual LONG is opened at
              the latest candle close using{" "}
              ${collateral.toFixed(2)} collateral and{" "}
              {leverage}× leverage. This does not modify
              your existing paper position.
            </p>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <label
                  htmlFor="fomo-pullback"
                  className="text-sm text-zinc-300"
                >
                  Hypothetical price decline
                </label>

                <span className="text-xl font-bold text-red-400">
                  -{pullbackPercent}%
                </span>
              </div>

              <input
                id="fomo-pullback"
                type="range"
                min="1"
                max="30"
                step="1"
                value={pullbackPercent}
                onChange={(event) =>
                  setPullbackPercent(
                    Number(event.target.value)
                  )
                }
                className="w-full accent-violet-500"
              />

              <div className="mt-2 flex justify-between text-xs text-zinc-500">
                <span>-1%</span>
                <span>-30%</span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ScenarioValue
                label="Hypothetical Entry Price"
                value={price(data.currentPrice)}
              />

              <ScenarioValue
                label="Hypothetical Price After Decline"
                value={price(scenarioPrice)}
              />

              <ScenarioValue
                label="Virtual Exposure"
                value={`$${exposure.toFixed(2)}`}
              />

              <ScenarioValue
                label="Hypothetical P&L"
                value={`-$${Math.abs(scenarioPnL).toFixed(2)}`}
                negative
              />

              <ScenarioValue
                label="Return on Collateral"
                value={`${scenarioReturn.toFixed(2)}%`}
                negative
              />

              <ScenarioValue
                label="Hypothetical Equity"
                value={`$${scenarioEquity.toFixed(2)}`}
                negative={scenarioEquity <= 0}
              />
            </div>

            {scenarioEquity <= 0 && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-sm text-red-300">
                  In this simplified model, the
                  hypothetical loss equals or exceeds
                  the starting collateral. An actual
                  leveraged position could be liquidated
                  before reaching this scenario price.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-300">
              Based on {data.candleCount} historical
              Perpl candles. Latest observed candle:{" "}
              {new Date(data.observedAt).toLocaleString()}.
              FOMO is a human behavior and cannot be
              determined from price changes alone.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-300">
              Educational simulation only. This is not
              a FOMO diagnosis, price prediction, buy/sell
              signal, or real trade. Scenario P&L excludes
              trading fees, funding, slippage, maintenance
              margin, and actual liquidation mechanics.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function ScenarioValue({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl bg-zinc-950 p-4">
      <p className="text-sm text-zinc-400">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          negative ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
