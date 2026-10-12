
"use client";

import { useEffect, useState } from "react";

type VolatilityData = {
  market: string;
  symbol: string;
  marketId: number;
  decimals: number;
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

type VolatilityAnalysisProps = {
  market?: string;
};

const REFRESH_INTERVAL = 60000;

function normalizeMarket(value: string) {
  const symbol = value.trim().toUpperCase();

  return symbol.endsWith("-PERP")
    ? symbol
    : `${symbol}-PERP`;
}

function isVolatilityData(
  value: unknown
): value is VolatilityData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<VolatilityData>;

  const numericFields = [
    data.marketId,
    data.decimals,
    data.candleIntervalSeconds,
    data.candleCount,
    data.firstOpen,
    data.lastClose,
    data.high,
    data.low,
    data.changePercent,
    data.rangePercent,
    data.fiveMinuteVolatilityPercent,
    data.scaled24hVolatilityPercent,
    data.observedFrom,
    data.observedTo,
  ];

  return (
    typeof data.market === "string" &&
    typeof data.symbol === "string" &&
    typeof data.source === "string" &&
    numericFields.every(
      (number) =>
        typeof number === "number" &&
        Number.isFinite(number)
    ) &&
    typeof data.decimals === "number" &&
    Number.isInteger(data.decimals) &&
    data.decimals >= 0 &&
    data.decimals <= 12 &&
    typeof data.candleCount === "number" &&
    data.candleCount >= 3 &&
    typeof data.candleIntervalSeconds === "number" &&
    data.candleIntervalSeconds > 0
  );
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPrice(
  value: number,
  decimals: number
) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function Metric({
  label,
  value,
  description,
  highlighted = false,
  valueColor = "text-white",
}: {
  label: string;
  value: string;
  description?: string;
  highlighted?: boolean;
  valueColor?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlighted
          ? "border-violet-500/30 bg-violet-500/5"
          : "border-[#292e3d] bg-[#191d29]"
      }`}
    >
      <p className="text-sm text-[#a1a7b7]">
        {label}
      </p>

      <p
        className={`risklab-number mt-3 break-words text-2xl font-semibold ${valueColor}`}
      >
        {value}
      </p>

      {description && (
        <p className="mt-2 text-xs leading-5 text-[#858b9d]">
          {description}
        </p>
      )}
    </div>
  );
}

export default function VolatilityAnalysis({
  market = "MON-PERP",
}: VolatilityAnalysisProps) {
  const selectedMarket = normalizeMarket(market);

  const [data, setData] =
    useState<VolatilityData | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  useEffect(() => {
    let active = true;

    let controller: AbortController | null = null;

    async function loadVolatility() {
      controller?.abort();

      const currentController =
        new AbortController();

      controller = currentController;

      try {
        const symbol = selectedMarket.replace(
          /-PERP$/,
          ""
        );

        const response = await fetch(
          `/api/volatility?market=${encodeURIComponent(
            symbol
          )}`,
          {
            cache: "no-store",
            signal: currentController.signal,
          }
        );

        if (!response.ok) {
          let message =
            "Unable to load historical data.";

          try {
            const body: unknown =
              await response.json();

            if (
              body &&
              typeof body === "object" &&
              "error" in body &&
              typeof body.error === "string"
            ) {
              message = body.error;
            }
          } catch {
            // Keep the default message.
          }

          throw new Error(message);
        }

        const result: unknown =
          await response.json();

        if (!isVolatilityData(result)) {
          throw new Error(
            "Invalid volatility data received."
          );
        }

        if (
          normalizeMarket(result.market) !==
          selectedMarket
        ) {
          throw new Error(
            "Historical data does not match the selected market."
          );
        }

        if (
          !active ||
          currentController.signal.aborted
        ) {
          return;
        }

        setData(result);
        setError("");
        setLastUpdated(new Date());
      } catch (err) {
        if (
          !active ||
          currentController.signal.aborted
        ) {
          return;
        }

        setData(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load Perpl historical data."
        );
      } finally {
        if (
          active &&
          !currentController.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }

    setData(null);
    setError("");
    setLoading(true);
    setLastUpdated(null);

    void loadVolatility();

    const timer = window.setInterval(
      () => void loadVolatility(),
      REFRESH_INTERVAL
    );

    return () => {
      active = false;
      window.clearInterval(timer);
      controller?.abort();
    };
  }, [selectedMarket]);

  const currentData =
    data &&
    normalizeMarket(data.market) === selectedMarket
      ? data
      : null;

  return (
    <section className="mt-6 rounded-2xl border border-[#292e3d] bg-[#151820] p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.17em] text-violet-400">
        RISK LAB
      </p>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            Volatility Analysis
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#a1a7b7]">
            Explore how much {selectedMarket} has
            moved over the last 24 hours using
            historical Perpl market data.
          </p>
        </div>

        <span className="rounded-lg border border-[#34394a] bg-[#191d29] px-3 py-2 text-xs font-medium text-[#c2c6d2]">
          {selectedMarket}
        </span>
      </div>

      {loading && !currentData && (
        <p
          role="status"
          className="mt-6 text-sm text-[#a1a7b7]"
        >
          Loading {selectedMarket} historical prices...
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-[#34394a] bg-[#191d29] p-5"
        >
          <p className="text-sm text-[#c2c6d2]">
            {error}
          </p>

          <p className="mt-2 text-xs text-[#858b9d]">
            Historical metrics are unavailable
            until valid data is received.
          </p>
        </div>
      )}

      {currentData && (
        <>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <Metric
              label="Observed Price Change"
              value={formatPercent(
                currentData.changePercent
              )}
              description="First candle open to last candle close"
              highlighted
              valueColor={
                currentData.changePercent > 0
                  ? "text-emerald-400"
                  : currentData.changePercent < 0
                    ? "text-rose-400"
                    : "text-white"
              }
            />

            <Metric
              label="Observed High–Low Range"
              value={`${currentData.rangePercent.toFixed(
                2
              )}%`}
              description="Range divided by the first opening price"
            />

            <Metric
              label="Highest Observed Price"
              value={formatPrice(
                currentData.high,
                currentData.decimals
              )}
            />

            <Metric
              label="Lowest Observed Price"
              value={formatPrice(
                currentData.low,
                currentData.decimals
              )}
            />

            <Metric
              label="Five-Minute Return Volatility"
              value={`${currentData.fiveMinuteVolatilityPercent.toFixed(
                2
              )}%`}
              description="Sample standard deviation of five-minute log returns"
            />

            <Metric
              label="24-Hour-Scaled Volatility"
              value={`${currentData.scaled24hVolatilityPercent.toFixed(
                2
              )}%`}
              description="Five-minute volatility multiplied by the square root of 288"
            />
          </div>

          <div className="mt-5 rounded-xl border border-[#292e3d] bg-[#191d29] p-5">
            <p className="text-sm leading-7 text-[#c2c6d2]">
              Based on {currentData.candleCount}{" "}
              Perpl candles with a{" "}
              {currentData.candleIntervalSeconds / 60}
              -minute interval.
            </p>

            <p className="mt-2 text-xs leading-6 text-[#858b9d]">
              Observed period:{" "}
              {new Date(
                currentData.observedFrom
              ).toLocaleString()}
              {" — "}
              {new Date(
                currentData.observedTo
              ).toLocaleString()}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-[#292e3d] bg-[#191d29] p-4">
            <p className="text-xs leading-6 text-[#858b9d]">
              Educational historical analysis only.
              The 24-hour-scaled volatility is a
              statistical transformation of
              observed returns, not a prediction
              or guaranteed price range.
              Volatility can change suddenly,
              and leverage amplifies exposure.
            </p>
          </div>

          {lastUpdated && (
            <p className="mt-4 text-xs text-[#747c8e]">
              Last received:{" "}
              {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </>
      )}
    </section>
  );
}
