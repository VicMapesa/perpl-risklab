
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

  const selectedMarket = market.trim().toUpperCase().endsWith("-PERP")
    ? market.trim().toUpperCase()
    : `${market.trim().toUpperCase()}-PERP`;

  const assetSymbol = selectedMarket.replace(/-PERP$/, "");

  const priceDecimals = Number.isFinite(decimals)
    ? Math.min(12, Math.max(0, Math.trunc(decimals)))
    : 6;

  const simulatedPrice = currentPrice * (1 + priceChange / 100);

  const multiplier = direction === "LONG" ? 1 : -1;

  const simulatedPnL =
    (simulatedPrice - entryPrice) * quantity * multiplier;

  const currentPnL =
    (currentPrice - entryPrice) * quantity * multiplier;

  const simulatedEquity = collateral + simulatedPnL;

  const returnOnCollateral =
    collateral > 0 ? (simulatedPnL / collateral) * 100 : 0;

  const additionalPnL = simulatedPnL - currentPnL;

  const isNegative = simulatedPnL < 0;

  function formatMoney(value: number) {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";

    return `${sign}$${Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatPrice(value: number) {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: priceDecimals,
      maximumFractionDigits: priceDecimals,
    })}`;
  }

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

        <p className="mt-2 text-sm text-zinc-400">
          Explore how a hypothetical {assetSymbol} price movement
          could affect your virtual position.
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
          className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-violet-500"
        >
          Reset Scenario
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ResultCard
          label={`Simulated ${assetSymbol} Price`}
          value={formatPrice(simulatedPrice)}
        />

        <ResultCard
          label="Hypothetical P&L"
          value={formatMoney(simulatedPnL)}
          color={
            isNegative
              ? "red"
              : simulatedPnL > 0
                ? "green"
                : "default"
          }
        />

        <ResultCard
          label="Return on Collateral"
          value={`${returnOnCollateral > 0 ? "+" : ""}${returnOnCollateral.toFixed(2)}%`}
          color={
            isNegative
              ? "red"
              : simulatedPnL > 0
                ? "green"
                : "default"
          }
        />

        <ResultCard
          label="Hypothetical Equity"
          value={formatMoney(simulatedEquity)}
          color={simulatedEquity <= 0 ? "red" : "default"}
        />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
        <p className="text-sm text-zinc-400">
          Additional P&L versus the current market price
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
      </div>

      {simulatedEquity <= 0 && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="font-semibold text-red-400">
            Virtual collateral exhausted
          </p>

          <p className="mt-2 text-sm text-zinc-300">
            In this simplified scenario, losses equal or exceed
            your initial collateral. A real perpetual exchange
            may liquidate a position before this point.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
        <p className="text-xs leading-6 text-zinc-400">
          Educational simulation only. Price changes are hypothetical,
          not forecasts. Results exclude fees, funding, slippage,
          maintenance margin, and actual Perpl liquidation rules.
        </p>
      </div>

      <p className="mt-4 text-xs leading-6 text-zinc-500">
        Market: {selectedMarket} · Position: {direction} ·{" "}
        {leverage}× leverage · Entry {formatPrice(entryPrice)} ·{" "}
        Current {formatPrice(currentPrice)}
      </p>
    </section>
  );
}

function ResultCard({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string;
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

      <p className={`mt-2 break-words text-2xl font-bold ${textColor}`}>
        {value}
      </p>
    </div>
  );
}
