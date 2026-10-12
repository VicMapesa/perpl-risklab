
"use client";

import { useState } from "react";

type Direction = "LONG" | "SHORT";

type RiskSimulatorProps = {
  entryPrice: number;
  currentPrice: number;
  collateral: number;
  leverage: number;
  quantity: number;
  direction: Direction;
  market?: string;
  decimals?: number;
};

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";

  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function RiskSimulator({
  entryPrice,
  currentPrice,
  collateral,
  leverage,
  quantity,
  direction,
  market = "MON-PERP",
  decimals = 6,
}: RiskSimulatorProps) {
  const [priceChange, setPriceChange] = useState(0);

  const selectedMarket = market
    .trim()
    .toUpperCase()
    .endsWith("-PERP")
    ? market.trim().toUpperCase()
    : `${market.trim().toUpperCase()}-PERP`;

  const assetSymbol = selectedMarket.replace(/-PERP$/, "");

  const priceDecimals = Number.isFinite(decimals)
    ? Math.min(12, Math.max(0, Math.trunc(decimals)))
    : 6;

  function formatPrice(value: number) {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: priceDecimals,
      maximumFractionDigits: priceDecimals,
    })}`;
  }

  const validInputs =
    Number.isFinite(entryPrice) &&
    entryPrice > 0 &&
    Number.isFinite(currentPrice) &&
    currentPrice > 0 &&
    Number.isFinite(collateral) &&
    collateral > 0 &&
    Number.isFinite(leverage) &&
    leverage >= 1 &&
    Number.isFinite(quantity) &&
    quantity > 0 &&
    (direction === "LONG" || direction === "SHORT");

  if (!validInputs) {
    return (
      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
          Risk Lab
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          Price Stress Simulator
        </h2>

        <p
          role="status"
          className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-300"
        >
          This scenario cannot be calculated because the
          current market price or virtual position data
          is unavailable or invalid. Please try again
          when valid data is available.
        </p>
      </section>
    );
  }

  const simulatedPrice =
    currentPrice * (1 + priceChange / 100);

  const multiplier = direction === "LONG" ? 1 : -1;

  const simulatedPnL =
    (simulatedPrice - entryPrice) *
    quantity *
    multiplier;

  const currentPnL =
    (currentPrice - entryPrice) *
    quantity *
    multiplier;

  const additionalPnL = simulatedPnL - currentPnL;

  const simulatedEquity = collateral + simulatedPnL;

  const returnOnCollateral =
    (simulatedPnL / collateral) * 100;

  const collateralExhausted = simulatedEquity <= 0;

  const pnlColor =
    simulatedPnL < 0
      ? "red"
      : simulatedPnL > 0
        ? "green"
        : "default";

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
          Risk Lab
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">
            Price Stress Simulator
          </h2>

          <span className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300">
            {selectedMarket}
          </span>
        </div>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Explore how a hypothetical {assetSymbol} price
          movement could affect your existing virtual{" "}
          {direction} position.
        </p>
      </div>

      <div className="rounded-xl bg-zinc-950 p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">
            Price change from current mark
          </p>

          <p
            className={`text-2xl font-bold ${
              priceChange < 0
                ? "text-red-400"
                : priceChange > 0
                  ? "text-green-400"
                  : "text-white"
            }`}
          >
            {priceChange > 0 ? "+" : ""}
            {priceChange}%
          </p>
        </div>

        <input
          type="range"
          min="-30"
          max="30"
          step="1"
          value={priceChange}
          onChange={(event) =>
            setPriceChange(Number(event.target.value))
          }
          aria-label="Hypothetical price change"
          className="w-full accent-violet-500"
        />

        <div className="mt-2 flex justify-between text-xs text-zinc-500">
          <span>-30%</span>
          <span>0%</span>
          <span>+30%</span>
        </div>

        <button
          type="button"
          onClick={() => setPriceChange(0)}
          className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-violet-500"
        >
          Reset Scenario
        </button>

        <p className="mt-4 text-xs leading-5 text-zinc-500">
          The slider changes the current market price
          for this simulation only. It does not change
          your saved virtual position.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ResultCard
          label={`Simulated ${assetSymbol} Price`}
          value={formatPrice(simulatedPrice)}
          description="The hypothetical market price after applying the slider's percentage change."
        />

        <ResultCard
          label="Hypothetical P&L"
          value={formatMoney(simulatedPnL)}
          color={pnlColor}
          description="Total simulated profit or loss measured from your original entry price."
        />

        <ResultCard
          label="Return on Collateral"
          value={`${returnOnCollateral > 0 ? "+" : ""}${returnOnCollateral.toFixed(2)}%`}
          color={pnlColor}
          description="Total hypothetical P&L expressed as a percentage of your starting collateral."
        />

        <ResultCard
          label="Hypothetical Equity"
          value={formatMoney(simulatedEquity)}
          color={
            simulatedEquity <= 0
              ? "red"
              : "default"
          }
          description="Starting collateral plus total hypothetical P&L, before trading costs."
        />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950 p-5">
        <p className="text-sm text-zinc-400">
          Additional P&L versus current price
        </p>

        <p
          className={`mt-2 text-xl font-semibold ${
            additionalPnL < 0
              ? "text-red-400"
              : additionalPnL > 0
                ? "text-green-400"
                : "text-white"
          }`}
        >
          {formatMoney(additionalPnL)}
        </p>

        <p className="mt-2 text-xs leading-5 text-zinc-500">
          This shows only the extra profit or loss
          caused by the simulated price movement.
          Unlike total hypothetical P&L, it does not
          include gains or losses already accumulated
          since the position was opened.
        </p>
      </div>

      {collateralExhausted && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
        >
          <p className="font-semibold text-red-400">
            Virtual collateral exhausted
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Under this simplified scenario, losses
            equal or exceed the starting collateral.
            A real perpetual exchange may liquidate
            the position before this point.
            Negative hypothetical equity is shown
            for educational purposes and does not
            represent an actual account balance.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-950 p-5">
        <p className="text-sm font-semibold text-white">
          How to read this scenario
        </p>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Your{" "}
          <span className="font-semibold text-white">
            {direction}
          </span>{" "}
          position generally benefits when{" "}
          {direction === "LONG"
            ? "prices rise"
            : "prices fall"}{" "}
          and loses value when{" "}
          {direction === "LONG"
            ? "prices fall"
            : "prices rise"}.
        </p>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Leverage increases the market exposure
          controlled by your collateral. The P&L
          calculation uses the position quantity
          and the difference between the entry
          price and simulated price.
        </p>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          The scenario is calculated from the current
          mark price, but total hypothetical P&L
          is measured from your original entry price.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm leading-6 text-amber-300">
          Educational simulation only. Price changes
          are hypothetical, not forecasts. Results
          exclude fees, funding, slippage, maintenance
          margin, and Perpl&apos;s actual liquidation
          rules. Real trading outcomes may differ.
        </p>
      </div>

      <p className="mt-4 text-xs leading-6 text-zinc-500">
        Market: {selectedMarket} · Position: {direction} ·{" "}
        {leverage}× leverage · Entry{" "}
        {formatPrice(entryPrice)} · Current{" "}
        {formatPrice(currentPrice)}
      </p>
    </section>
  );
}

function ResultCard({
  label,
  value,
  description,
  color = "default",
}: {
  label: string;
  value: string;
  description: string;
  color?: "red" | "green" | "default";
}) {
  const textColor =
    color === "red"
      ? "text-red-400"
      : color === "green"
        ? "text-green-400"
        : "text-white";

  return (
    <div className="rounded-xl bg-zinc-950 p-5">
      <p className="text-sm text-zinc-400">
        {label}
      </p>

      <p
        className={`mt-2 break-words text-2xl font-bold ${textColor}`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        {description}
      </p>
    </div>
  );
}
