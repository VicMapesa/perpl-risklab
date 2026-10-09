
"use client";

import { useEffect, useState } from "react";
import RiskSimulator from "./RiskSimulator";
import LiquidationRisk from "./LiquidationRisk";
import FundingAnalysis from "./FundingAnalysis";
import VolatilityAnalysis from "./VolatilityAnalysis";
import FomoCheck from "./FomoCheck";

type Direction = "LONG" | "SHORT";

type VirtualTradeProps = {
  markPrice: number;
};

type VirtualPosition = {
  market: "MON-PERP";
  direction: Direction;
  collateral: number;
  leverage: number;
  exposure: number;
  entryPrice: number;
  quantity: number;
  openedAt: string;
};

const STORAGE_KEY = "perpl-risklab-position";

function calculatePnL(
  position: VirtualPosition,
  currentPrice: number
) {
  const multiplier =
    position.direction === "LONG" ? 1 : -1;

  return (
    (currentPrice - position.entryPrice) *
    position.quantity *
    multiplier
  );
}

function formatSignedMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export default function VirtualTrade({
  markPrice,
}: VirtualTradeProps) {
  const [collateral, setCollateral] = useState(50);
  const [leverage, setLeverage] = useState(5);
  const [direction, setDirection] =
    useState<Direction>("LONG");

  const [position, setPosition] =
    useState<VirtualPosition | null>(null);

  const exposure = collateral * leverage;

  useEffect(() => {
    const savedPosition =
      window.localStorage.getItem(STORAGE_KEY);

    if (!savedPosition) return;

    try {
      const parsed = JSON.parse(
        savedPosition
      ) as VirtualPosition;

      if (
        parsed.market !== "MON-PERP" ||
        !["LONG", "SHORT"].includes(parsed.direction) ||
        !Number.isFinite(parsed.entryPrice) ||
        parsed.entryPrice <= 0 ||
        !Number.isFinite(parsed.quantity) ||
        parsed.quantity <= 0 ||
        !Number.isFinite(parsed.collateral) ||
        parsed.collateral <= 0 ||
        !Number.isFinite(parsed.leverage) ||
        parsed.leverage <= 0
      ) {
        throw new Error("Invalid saved position");
      }

      setPosition(parsed);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function openVirtualPosition() {
    if (
      !Number.isFinite(collateral) ||
      collateral <= 0 ||
      !Number.isFinite(markPrice) ||
      markPrice <= 0 ||
      leverage <= 0
    ) {
      return;
    }

    const newPosition: VirtualPosition = {
      market: "MON-PERP",
      direction,
      collateral,
      leverage,
      exposure,
      entryPrice: markPrice,
      quantity: exposure / markPrice,
      openedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(newPosition)
    );

    setPosition(newPosition);
  }

  function closeVirtualPosition() {
    window.localStorage.removeItem(STORAGE_KEY);
    setPosition(null);
  }

  if (position) {
    const pnl = calculatePnL(position, markPrice);
    const pnlPercent =
      (pnl / position.collateral) * 100;

    const virtualEquity =
      position.collateral + pnl;

    const pnlColor =
      pnl > 0
        ? "text-green-400"
        : pnl < 0
          ? "text-red-400"
          : "text-white";

    return (
      <>
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
                Paper Position
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {position.market}
              </h2>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                position.direction === "LONG"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {position.direction}
            </span>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
              <p className="text-sm text-zinc-400">
                Unrealized P&amp;L
              </p>

              <p
                className={`mt-2 text-3xl font-bold ${pnlColor}`}
              >
                {formatSignedMoney(pnl)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Return on Collateral
              </p>

              <p
                className={`mt-2 text-3xl font-bold ${pnlColor}`}
              >
                {pnl > 0 ? "+" : ""}
                {pnlPercent.toFixed(2)}%
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Hypothetical Equity
              </p>

              <p className="mt-2 text-3xl font-bold">
                ${virtualEquity.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <PositionValue
              label="Entry Price"
              value={`$${position.entryPrice.toFixed(6)}`}
            />

            <PositionValue
              label="Current Mark"
              value={`$${markPrice.toFixed(6)}`}
            />

            <PositionValue
              label="Collateral"
              value={`$${position.collateral.toFixed(2)}`}
            />

            <PositionValue
              label="Leverage"
              value={`${position.leverage}×`}
            />

            <PositionValue
              label="Exposure"
              value={`$${position.exposure.toFixed(2)}`}
            />

            <PositionValue
              label="Virtual MON Size"
              value={`${position.quantity.toFixed(2)} MON`}
            />
          </div>

          <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-300">
              Simulation only — no order was sent to
              Perpl and no real funds were used.
              P&amp;L excludes trading fees, funding,
              slippage, and liquidation mechanics.
            </p>
          </div>

          <button
            type="button"
            onClick={closeVirtualPosition}
            className="mt-6 w-full rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-zinc-300 transition hover:border-red-500/50 hover:text-red-400"
          >
            Close Virtual Position
          </button>
        </section>

        <RiskSimulator
          entryPrice={position.entryPrice}
          currentPrice={markPrice}
          collateral={position.collateral}
          leverage={position.leverage}
          quantity={position.quantity}
          direction={position.direction}
        />

        <LiquidationRisk
          entryPrice={position.entryPrice}
          currentPrice={markPrice}
          collateral={position.collateral}
          quantity={position.quantity}
          direction={position.direction}
        />

        <FundingAnalysis
          currentPrice={markPrice}
          quantity={position.quantity}
          direction={position.direction}
        />

        <VolatilityAnalysis />

        <FomoCheck
          collateral={position.collateral}
          leverage={position.leverage}
        />
      </>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
          Paper Trade
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          Build a Virtual Position
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          No real funds are used. This position exists
          only inside RiskLab.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm text-zinc-400">
            Direction
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection("LONG")}
              className={`rounded-xl px-4 py-3 font-semibold transition ${
                direction === "LONG"
                  ? "bg-green-500 text-black"
                  : "bg-zinc-950 text-zinc-400 hover:text-white"
              }`}
            >
              LONG
            </button>

            <button
              type="button"
              onClick={() => setDirection("SHORT")}
              className={`rounded-xl px-4 py-3 font-semibold transition ${
                direction === "SHORT"
                  ? "bg-red-500 text-white"
                  : "bg-zinc-950 text-zinc-400 hover:text-white"
              }`}
            >
              SHORT
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="collateral"
            className="mb-2 block text-sm text-zinc-400"
          >
            Virtual Collateral
          </label>

          <div className="flex items-center rounded-xl bg-zinc-950 px-4">
            <span className="text-zinc-500">$</span>

            <input
              id="collateral"
              type="number"
              min="1"
              step="any"
              value={collateral}
              onChange={(event) =>
                setCollateral(
                  Math.max(0, Number(event.target.value))
                )
              }
              className="w-full bg-transparent px-2 py-3 text-white outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="leverage"
            className="mb-2 block text-sm text-zinc-400"
          >
            Leverage: {leverage}×
          </label>

          <input
            id="leverage"
            type="range"
            min="1"
            max="10"
            step="1"
            value={leverage}
            onChange={(event) =>
              setLeverage(Number(event.target.value))
            }
            className="w-full accent-violet-500"
          />

          <div className="mt-2 flex justify-between text-xs text-zinc-600">
            <span>1×</span>
            <span>10×</span>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-950 p-4">
          <p className="text-sm text-zinc-500">
            Current MON Mark Price
          </p>

          <p className="mt-1 font-mono text-lg font-semibold">
            ${markPrice.toFixed(6)}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">
              Virtual Exposure
            </p>

            <p className="mt-1 text-3xl font-bold">
              ${exposure.toFixed(2)}
            </p>
          </div>

          <div className="text-right text-sm text-zinc-400">
            <p>
              ${collateral.toFixed(2)} × {leverage}×
            </p>

            <p
              className={
                direction === "LONG"
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {direction}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={openVirtualPosition}
        disabled={
          !Number.isFinite(collateral) ||
          collateral <= 0 ||
          !Number.isFinite(markPrice) ||
          markPrice <= 0
        }
        className="mt-6 w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Open Virtual Position
      </button>
    </section>
  );
}

function PositionValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-950 p-4">
      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <p className="mt-1 font-mono font-semibold text-white">
        {value}
      </p>
    </div>
  );
}
