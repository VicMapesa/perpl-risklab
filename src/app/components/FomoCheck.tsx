
"use client";

import { useEffect, useState } from "react";

type FomoData = {
  market: string;
  symbol?: string;
  decimals?: number;
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
  market?: string;
};

function normalizeMarket(value: string) {
  const normalized = value.trim().toUpperCase();

  return normalized.endsWith("-PERP")
    ? normalized
    : `${normalized}-PERP`;
}

function formatPrice(value: number, decimals: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function isValidFomoData(
  value: unknown,
  expectedMarket: string
): value is FomoData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<FomoData>;

  return (
    result.market === expectedMarket &&
    typeof result.source === "string" &&
    typeof result.currentPrice === "number" &&
    Number.isFinite(result.currentPrice) &&
    result.currentPrice > 0 &&
    typeof result.hourAgoPrice === "number" &&
    Number.isFinite(result.hourAgoPrice) &&
    result.hourAgoPrice > 0 &&
    typeof result.dayStartPrice === "number" &&
    Number.isFinite(result.dayStartPrice) &&
    result.dayStartPrice > 0 &&
    typeof result.dayHigh === "number" &&
    Number.isFinite(result.dayHigh) &&
    result.dayHigh > 0 &&
    typeof result.dayLow === "number" &&
    Number.isFinite(result.dayLow) &&
    result.dayLow > 0 &&
    typeof result.oneHourChangePercent === "number" &&
    Number.isFinite(result.oneHourChangePercent) &&
    typeof result.dayChangePercent === "number" &&
    Number.isFinite(result.dayChangePercent) &&
    typeof result.candleCount === "number" &&
    Number.isInteger(result.candleCount) &&
    result.candleCount > 0 &&
    typeof result.observedAt === "number" &&
    Number.isFinite(result.observedAt) &&
    (
      result.decimals === undefined ||
      (
        Number.isInteger(result.decimals) &&
        result.decimals >= 0 &&
        result.decimals <= 12
      )
    )
  );
}

export default function FomoCheck({
  collateral,
  leverage,
  market = "MON-PERP",
}: FomoCheckProps) {
  const selectedMarket = normalizeMarket(market);
  const assetSymbol = selectedMarket.replace(/-PERP$/, "");

  const [data, setData] = useState<FomoData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [pullbackPercent, setPullbackPercent] = useState(5);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadData() {
      try {
        const response = await fetch(
          `/api/fomo?market=${encodeURIComponent(assetSymbol)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Historical data unavailable (${response.status})`
          );
        }

        const result: unknown = await response.json();

        if (!isValidFomoData(result, selectedMarket)) {
          throw new Error("Invalid or mismatched market data");
        }

        if (active) {
          setData(result);
          setError("");
        }
      } catch (caughtError) {
        if (
          active &&
          !(
            caughtError instanceof Error &&
            caughtError.name === "AbortError"
          )
        ) {
          setError(
            `Unable to load historical prices for ${selectedMarket}.`
          );
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
      controller.abort();
      window.clearInterval(timer);
    };
  }, [assetSymbol, selectedMarket]);

  // Never show historical data belonging to another market.
  const visibleData =
    data?.market === selectedMarket ? data : null;

  const priceDecimals = visibleData?.decimals ?? 6;

  const exposure = collateral * leverage;

  const scenarioPrice = visibleData
    ? visibleData.currentPrice * (1 - pullbackPercent / 100)
    : 0;

  const scenarioPnL =
    -(exposure * pullbackPercent) / 100;

  const scenarioEquity = collateral + scenarioPnL;

  const scenarioReturn =
    collateral > 0
      ? (scenarioPnL / collateral) * 100
      : 0;

  const recentRally =
    visibleData !== null &&
    visibleData.oneHourChangePercent > 0;

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
          Risk Lab
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">
            FOMO Check
          </h2>

          <span className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300">
            {selectedMarket}
          </span>
        </div>

        <p className="mt-2 text-sm text-zinc-400">
          Explore the risk of entering a leveraged {assetSymbol}
          LONG after a price increase. This is an educational
          scenario, not a trading signal.
        </p>
      </div>

      {loading && !visibleData && !error && (
        <p className="text-sm text-zinc-400">
          Loading {selectedMarket} historical prices...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 text-sm text-rose-400"
        >
          {error}
          {visibleData && " Showing the last successful reading."}
        </p>
      )}

      {visibleData && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
              <p className="text-sm text-zinc-400">
                Observed 1-Hour Price Change
              </p>

              <p
                className={`mt-2 text-3xl font-bold ${
                  visibleData.oneHourChangePercent > 0
                    ? "text-green-400"
                    : visibleData.oneHourChangePercent < 0
                      ? "text-red-400"
                      : "text-white"
                }`}
              >
                {signedPercent(
                  visibleData.oneHourChangePercent
                )}
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
                  visibleData.dayChangePercent < 0
                    ? "text-red-400"
                    : visibleData.dayChangePercent > 0
                      ? "text-green-400"
                      : "text-white"
                }`}
              >
                {signedPercent(
                  visibleData.dayChangePercent
                )}
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Latest Candle Close
              </p>

              <p className="mt-2 break-words font-mono text-2xl font-bold">
                {formatPrice(
                  visibleData.currentPrice,
                  priceDecimals
                )}
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Price One Hour Earlier
              </p>

              <p className="mt-2 break-words font-mono text-2xl font-bold">
                {formatPrice(
                  visibleData.hourAgoPrice,
                  priceDecimals
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
            <p className="font-semibold text-white">
              Historical Context
            </p>

            <p className="mt-2 text-sm text-zinc-300">
              {recentRally
                ? `${assetSymbol} increased over the observed one-hour period. A recent price increase does not guarantee that the increase will continue.`
                : `${assetSymbol} did not increase over the observed one-hour period. The downside scenario below remains useful for understanding leveraged exposure.`}
            </p>

            <p className="mt-2 text-sm text-zinc-400">
              Observed 24-hour range:{" "}
              {formatPrice(
                visibleData.dayLow,
                priceDecimals
              )}{" "}
              to{" "}
              {formatPrice(
                visibleData.dayHigh,
                priceDecimals
              )}
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-400">
              Hypothetical Rally-Entry Scenario
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              What if {assetSymbol} falls after a new LONG entry?
            </h3>

            <p className="mt-2 text-sm text-zinc-400">
              Assume a new virtual LONG is opened at
              the latest candle close using{" "}
              {formatMoney(collateral)} collateral and{" "}
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
                value={formatPrice(
                  visibleData.currentPrice,
                  priceDecimals
                )}
              />

              <ScenarioValue
                label="Hypothetical Price After Decline"
                value={formatPrice(
                  scenarioPrice,
                  priceDecimals
                )}
              />

              <ScenarioValue
                label="Virtual Exposure"
                value={formatMoney(exposure)}
              />

              <ScenarioValue
                label="Hypothetical P&L"
                value={`-${formatMoney(
                  Math.abs(scenarioPnL)
                )}`}
                negative
              />

              <ScenarioValue
                label="Return on Collateral"
                value={`${scenarioReturn.toFixed(2)}%`}
                negative
              />

              <ScenarioValue
                label="Hypothetical Equity"
                value={formatMoney(scenarioEquity)}
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
              Based on {visibleData.candleCount} historical
              Perpl candles. Latest observed candle:{" "}
              {new Date(
                visibleData.observedAt
              ).toLocaleString()}.
              FOMO is a human behavior and cannot be
              determined from price changes alone.
            </p>
          </div>

          <p className="mt-4 text-xs leading-6 text-zinc-500">
            Educational simulation only. This is not a
            FOMO diagnosis, price prediction, buy/sell
            signal, or real trade. Scenario P&amp;L excludes
            trading fees, funding, slippage, maintenance
            margin, and actual liquidation mechanics.
          </p>
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
        className={`mt-2 break-words text-xl font-bold ${
          negative ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
