
"use client";

import { useEffect, useState } from "react";

type Direction = "LONG" | "SHORT";

type LiquidationRiskProps = {
  entryPrice: number;
  currentPrice: number;
  collateral: number;
  quantity: number;
  direction: Direction;
  market?: string;
};

type MarginData = {
  market: string;
  maintenanceMarginRaw: number;
};

const DEFAULT_ILLUSTRATIVE_RATE = 5;

function money(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function price(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  })}`;
}

function isMarginData(
  value: unknown
): value is MarginData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<MarginData>;

  return (
    typeof data.market === "string" &&
    typeof data.maintenanceMarginRaw === "number" &&
    Number.isFinite(data.maintenanceMarginRaw) &&
    data.maintenanceMarginRaw >= 0
  );
}

export default function LiquidationRisk({
  entryPrice,
  currentPrice,
  collateral,
  quantity,
  direction,
  market = "MON-PERP",
}: LiquidationRiskProps) {
  const [marginData, setMarginData] =
    useState<MarginData | null>(null);

  const [marginError, setMarginError] =
    useState(false);

  const [
    illustrativeRatePercent,
    setIllustrativeRatePercent,
  ] = useState(DEFAULT_ILLUSTRATIVE_RATE);

  const symbol = market.replace(/-PERP$/, "");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMargin() {
      setMarginData(null);
      setMarginError(false);

      try {
        const response = await fetch(
          `/api/market?market=${encodeURIComponent(symbol)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Market API returned ${response.status}`
          );
        }

        const data: unknown = await response.json();

        if (
          !isMarginData(data) ||
          data.market !== market
        ) {
          throw new Error(
            "Invalid maintenance margin data"
          );
        }

        if (!controller.signal.aborted) {
          setMarginData(data);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(
          "Unable to load maintenance margin:",
          error
        );

        setMarginError(true);
      }
    }

    void loadMargin();

    return () => controller.abort();
  }, [market, symbol]);

  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(collateral) ||
    !Number.isFinite(quantity) ||
    entryPrice <= 0 ||
    currentPrice <= 0 ||
    collateral <= 0 ||
    quantity <= 0
  ) {
    return null;
  }

  const maintenanceRate =
    illustrativeRatePercent / 100;

  const multiplier = direction === "LONG" ? 1 : -1;

  const pnl =
    (currentPrice - entryPrice) *
    quantity *
    multiplier;

  const equity = collateral + pnl;

  const positionValue = currentPrice * quantity;

  const maintenanceRequirement =
    positionValue * maintenanceRate;

  const marginBuffer =
    equity - maintenanceRequirement;

  const estimatedThreshold =
    direction === "LONG"
      ? (quantity * entryPrice - collateral) /
        (quantity * (1 - maintenanceRate))
      : (quantity * entryPrice + collateral) /
        (quantity * (1 + maintenanceRate));

  const validThreshold =
    Number.isFinite(estimatedThreshold) &&
    estimatedThreshold > 0;

  const thresholdReached = marginBuffer <= 0;

  const adverseDistancePercent = validThreshold
    ? direction === "LONG"
      ? ((currentPrice - estimatedThreshold) /
          currentPrice) *
        100
      : ((estimatedThreshold - currentPrice) /
          currentPrice) *
        100
    : null;

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
          Risk Lab
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          Liquidation Risk Simulator
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Explore how price movements affect the equity
          supporting your virtual {market} position.
          This is a simplified educational model,
          not Perpl&apos;s liquidation engine.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
          Perpl market data
        </p>

        <p className="mt-3 text-sm text-zinc-300">
          Market:{" "}
          <span className="font-semibold text-white">
            {market}
          </span>
        </p>

        <p className="mt-2 text-sm text-zinc-300">
          Raw maintenance parameter:{" "}
          <span className="font-semibold text-white">
            {marginData
              ? marginData.maintenanceMarginRaw.toLocaleString(
                  "en-US"
                )
              : marginError
                ? "Unavailable"
                : "Loading..."}
          </span>
        </p>

        <p className="mt-3 text-xs leading-5 text-zinc-400">
          This raw value comes from Perpl&apos;s
          public market API. Its percentage conversion
          has not been independently verified, so it
          is not used in the simulation below.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-950 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">
              Illustrative maintenance rate
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              An educational assumption, not a verified
              Perpl requirement.
            </p>
          </div>

          <p className="text-xl font-bold text-violet-300">
            {illustrativeRatePercent.toFixed(1)}%
          </p>
        </div>

        <input
          type="range"
          min="1"
          max="20"
          step="0.5"
          value={illustrativeRatePercent}
          onChange={(event) =>
            setIllustrativeRatePercent(
              Number(event.target.value)
            )
          }
          aria-label="Illustrative maintenance rate"
          className="mt-5 w-full accent-violet-500"
        />

        <div className="mt-2 flex justify-between text-xs text-zinc-500">
          <span>1%</span>
          <span>20%</span>
        </div>

        <p className="mt-4 text-xs leading-5 text-zinc-400">
          Move the slider to see how a different assumed
          maintenance requirement changes the simulated
          margin buffer and risk threshold.
        </p>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Virtual Position Value
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(positionValue)}
          </p>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Current mark price multiplied by the
            quantity of your virtual position.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Hypothetical Equity
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              equity < 0
                ? "text-red-400"
                : "text-white"
            }`}
          >
            {money(equity)}
          </p>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Your virtual collateral plus unrealized
            profit or loss.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Illustrative Maintenance Requirement
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(maintenanceRequirement)}
          </p>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            {illustrativeRatePercent.toFixed(1)}% of
            the current virtual position value.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Simulated Margin Buffer
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              thresholdReached
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {money(marginBuffer)}
          </p>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Equity minus the illustrative maintenance
            requirement. A negative buffer means this
            model&apos;s threshold has been crossed.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Simplified Risk Threshold
          </p>

          <p className="mt-2 break-all font-mono text-2xl font-bold">
            {validThreshold
              ? price(estimatedThreshold)
              : "Not applicable"}
          </p>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            The hypothetical mark price where equity
            would equal the assumed maintenance
            requirement.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Distance to Simulated Threshold
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              thresholdReached
                ? "text-red-400"
                : "text-white"
            }`}
          >
            {thresholdReached
              ? "Threshold crossed"
              : adverseDistancePercent === null
                ? "Not applicable"
                : `${Math.max(
                    0,
                    adverseDistancePercent
                  ).toFixed(2)}%`}
          </p>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            {direction === "LONG"
              ? "Estimated downward price movement needed to reach the model's threshold."
              : "Estimated upward price movement needed to reach the model's threshold."}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5">
        <p className="text-sm font-semibold text-white">
          What does this mean?
        </p>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Your{" "}
          <span className="font-semibold text-white">
            {direction}
          </span>{" "}
          position is exposed to{" "}
          {direction === "LONG"
            ? "falling prices"
            : "rising prices"}.
          When the market moves against the position,
          unrealized losses reduce its hypothetical
          equity.
        </p>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          The margin buffer measures how much equity
          remains above the assumed maintenance
          requirement. The simplified risk threshold
          shows the price where that buffer would
          reach zero under this model.
        </p>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Changing the illustrative maintenance rate
          changes the threshold. That demonstrates why
          maintenance-margin assumptions matter when
          estimating liquidation risk.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm leading-6 text-amber-300">
          Educational simulation only — NOT an official
          Perpl liquidation calculation. The maintenance
          percentage is user-adjustable and illustrative.
          The raw Perpl market parameter is displayed
          separately because its conversion has not
          been verified. This model excludes fees,
          funding, slippage, other account balances,
          and Perpl&apos;s complete liquidation mechanics.
          Actual liquidation may occur at a different
          price.
        </p>
      </div>
    </section>
  );
}
