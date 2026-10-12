
"use client";

import { useEffect, useState } from "react";
import RiskSimulator from "./RiskSimulator";
import LiquidationRisk from "./LiquidationRisk";
import FundingAnalysis from "./FundingAnalysis";
import VolatilityAnalysis from "./VolatilityAnalysis";
import FomoCheck from "./FomoCheck";

type Direction = "LONG" | "SHORT";
type View = "trade" | "risk" | "all";

type RiskTool =
  | "stress"
  | "liquidation"
  | "funding"
  | "volatility"
  | "fomo";

type VirtualTradeProps = {
  markPrice: number;
  market?: string;
  decimals?: number;
  view?: View;
};

type VirtualPosition = {
  market: string;
  direction: Direction;
  collateral: number;
  leverage: number;
  exposure: number;
  entryPrice: number;
  quantity: number;
  openedAt: string;
};

type PositionStore = Record<string, VirtualPosition>;

const STORAGE_KEY = "perpl-risklab-positions";
const LEGACY_STORAGE_KEY = "perpl-risklab-position";

const tools: { id: RiskTool; label: string }[] = [
  { id: "stress", label: "Price Stress" },
  { id: "liquidation", label: "Liquidation" },
  { id: "funding", label: "Funding" },
  { id: "volatility", label: "Volatility" },
  { id: "fomo", label: "FOMO Check" },
];

function normalizeMarket(value: string) {
  const symbol = value.trim().toUpperCase();

  return symbol.endsWith("-PERP")
    ? symbol
    : `${symbol}-PERP`;
}

function validPosition(
  value: unknown
): value is VirtualPosition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const position = value as Partial<VirtualPosition>;

  return (
    typeof position.market === "string" &&
    /^[A-Z0-9]+-PERP$/.test(position.market) &&
    (position.direction === "LONG" ||
      position.direction === "SHORT") &&
    typeof position.collateral === "number" &&
    Number.isFinite(position.collateral) &&
    position.collateral > 0 &&
    typeof position.leverage === "number" &&
    Number.isFinite(position.leverage) &&
    position.leverage >= 1 &&
    position.leverage <= 10 &&
    typeof position.exposure === "number" &&
    Number.isFinite(position.exposure) &&
    position.exposure > 0 &&
    typeof position.entryPrice === "number" &&
    Number.isFinite(position.entryPrice) &&
    position.entryPrice > 0 &&
    typeof position.quantity === "number" &&
    Number.isFinite(position.quantity) &&
    position.quantity > 0 &&
    typeof position.openedAt === "string" &&
    Number.isFinite(Date.parse(position.openedAt))
  );
}

function readPositions(): PositionStore {
  const result: PositionStore = {};

  try {
    const saved = window.localStorage.getItem(
      STORAGE_KEY
    );

    if (saved) {
      const parsed: unknown = JSON.parse(saved);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        for (const [key, value] of Object.entries(
          parsed
        )) {
          if (
            validPosition(value) &&
            key === value.market
          ) {
            result[key] = value;
          }
        }
      }
    }

    const legacy = window.localStorage.getItem(
      LEGACY_STORAGE_KEY
    );

    if (legacy) {
      const parsed: unknown = JSON.parse(legacy);

      if (
        validPosition(parsed) &&
        parsed.market === "MON-PERP" &&
        !result["MON-PERP"]
      ) {
        result["MON-PERP"] = parsed;
      }
    }
  } catch {
    // Ignore malformed saved data.
  }

  return result;
}

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

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";

  return `${sign}${formatMoney(Math.abs(value))}`;
}

export default function VirtualTrade({
  markPrice,
  market = "MON-PERP",
  decimals = 6,
  view = "all",
}: VirtualTradeProps) {
  const selectedMarket = normalizeMarket(market);

  const assetSymbol = selectedMarket.replace(
    /-PERP$/,
    ""
  );

  const priceDecimals = Math.min(
    12,
    Math.max(0, Math.trunc(decimals))
  );

  const [collateral, setCollateral] = useState(50);
  const [leverage, setLeverage] = useState(5);

  const [direction, setDirection] =
    useState<Direction>("LONG");

  const [positions, setPositions] =
    useState<PositionStore>({});

  const [loaded, setLoaded] = useState(false);

  const [riskTool, setRiskTool] =
    useState<RiskTool>("stress");

  const [storageError, setStorageError] =
    useState<string | null>(null);

  useEffect(() => {
    const restored = readPositions();

    setPositions(restored);
    setLoaded(true);

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(restored)
      );
    } catch {
      // Storage may be unavailable.
    }
  }, []);

  const position = positions[selectedMarket] ?? null;

  const exposure = collateral * leverage;

  const showTrade = view === "trade" || view === "all";
  const showRisk = view === "risk" || view === "all";

  const validPrice =
    Number.isFinite(markPrice) && markPrice > 0;

  function displayPrice(value: number) {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: priceDecimals,
      maximumFractionDigits: priceDecimals,
    })}`;
  }

  function savePositions(next: PositionStore) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      setPositions(next);
      return true;
    } catch {
      return false;
    }
  }

  function openVirtualPosition() {
    if (
      !loaded ||
      !validPrice ||
      !Number.isFinite(collateral) ||
      collateral <= 0 ||
      !Number.isFinite(leverage) ||
      leverage < 1 ||
      leverage > 10 ||
      !Number.isFinite(exposure) ||
      exposure <= 0 ||
      position
    ) {
      return;
    }

    const newPosition: VirtualPosition = {
      market: selectedMarket,
      direction,
      collateral,
      leverage,
      exposure,
      entryPrice: markPrice,
      quantity: exposure / markPrice,
      openedAt: new Date().toISOString(),
    };

    const next = {
      ...positions,
      [selectedMarket]: newPosition,
    };

    if (savePositions(next)) {
      setStorageError(null);
    } else {
      setStorageError(
        "Could not save this position in your browser."
      );
    }
  }

  function closeVirtualPosition() {
    const next = { ...positions };
    delete next[selectedMarket];

    if (savePositions(next)) {
      setStorageError(null);
    } else {
      setStorageError(
        "Could not update your saved positions."
      );
    }
  }

  if (!loaded) {
    return (
      <div className="risklab-card p-6 text-sm text-[#a1a7b7]">
        Loading virtual workspace...
      </div>
    );
  }

  const pnl =
    position && validPrice
      ? calculatePnL(position, markPrice)
      : 0;

  const pnlPercent = position
    ? (pnl / position.collateral) * 100
    : 0;

  const virtualEquity = position
    ? position.collateral + pnl
    : 0;

  const pnlColor =
    pnl > 0
      ? "text-emerald-400"
      : pnl < 0
        ? "text-rose-400"
        : "text-white";

  return (
    <div className="space-y-6">
      {storageError && (
        <p
          role="alert"
          className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300"
        >
          {storageError}
        </p>
      )}

      {showTrade && (
        <section className="risklab-card p-6 sm:p-8">
          {position ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="risklab-label">
                    ACTIVE VIRTUAL POSITION
                  </p>

                  <h2 className="mt-3 text-2xl font-semibold">
                    {position.market}
                  </h2>

                  <p className="mt-2 text-sm text-[#a1a7b7]">
                    Your simulated position uses this
                    market&apos;s mark price.
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    position.direction === "LONG"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {position.direction}
                </span>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Unrealized P&L"
                  value={formatSignedMoney(pnl)}
                  color={pnlColor}
                />

                <Metric
                  label="Return on Collateral"
                  value={`${
                    pnlPercent > 0 ? "+" : ""
                  }${pnlPercent.toFixed(2)}%`}
                  color={pnlColor}
                />

                <Metric
                  label="Hypothetical Equity"
                  value={formatMoney(virtualEquity)}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <PositionValue
                  label="Entry Price"
                  value={displayPrice(
                    position.entryPrice
                  )}
                />

                <PositionValue
                  label="Current Mark"
                  value={displayPrice(markPrice)}
                />

                <PositionValue
                  label="Collateral"
                  value={formatMoney(
                    position.collateral
                  )}
                />

                <PositionValue
                  label="Leverage"
                  value={`${position.leverage}×`}
                />

                <PositionValue
                  label="Exposure"
                  value={formatMoney(
                    position.exposure
                  )}
                />

                <PositionValue
                  label={`Virtual ${assetSymbol} Size`}
                  value={`${position.quantity.toLocaleString(
                    "en-US",
                    {
                      maximumFractionDigits: 6,
                    }
                  )} ${assetSymbol}`}
                />
              </div>

              <p className="mt-6 text-xs leading-6 text-[#858b9d]">
                Simulation only. No order was sent to
                Perpl. P&amp;L excludes fees, funding,
                slippage, and liquidation mechanics.
              </p>

              <button
                type="button"
                onClick={closeVirtualPosition}
                className="mt-5 w-full rounded-xl border border-[#34394a] px-5 py-3 text-sm font-semibold text-[#c2c6d2] transition hover:border-rose-500/40 hover:text-rose-300"
              >
                Close Virtual Position
              </button>
            </>
          ) : (
            <>
              <p className="risklab-label">
                NEW PAPER POSITION
              </p>

              <h2 className="mt-3 text-2xl font-semibold">
                Build a virtual trade
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-7 text-[#a1a7b7]">
                Choose a direction, set your pretend
                collateral, and explore leveraged
                exposure. No real money is used.
              </p>

              <div className="mt-8 grid gap-7 md:grid-cols-2">
                <div>
                  <p className="mb-3 text-sm text-[#a1a7b7]">
                    Direction
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDirection("LONG")
                      }
                      aria-pressed={
                        direction === "LONG"
                      }
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        direction === "LONG"
                          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40"
                          : "bg-[#191d29] text-[#a1a7b7] hover:text-white"
                      }`}
                    >
                      LONG
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDirection("SHORT")
                      }
                      aria-pressed={
                        direction === "SHORT"
                      }
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        direction === "SHORT"
                          ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40"
                          : "bg-[#191d29] text-[#a1a7b7] hover:text-white"
                      }`}
                    >
                      SHORT
                    </button>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-[#858b9d]">
                    LONG benefits from rising prices.
                    SHORT benefits from falling prices.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="collateral"
                    className="mb-3 block text-sm text-[#a1a7b7]"
                  >
                    Virtual collateral
                  </label>

                  <div className="flex items-center rounded-xl border border-[#303545] bg-[#191d29] px-4">
                    <span className="text-[#858b9d]">
                      $
                    </span>

                    <input
                      id="collateral"
                      type="number"
                      min="1"
                      step="any"
                      value={collateral}
                      onChange={(event) =>
                        setCollateral(
                          Number(event.target.value)
                        )
                      }
                      className="w-full bg-transparent px-2 py-3 text-white outline-none"
                    />
                  </div>

                  <p className="mt-3 text-xs text-[#858b9d]">
                    Pretend funds supporting the position.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="leverage"
                    className="mb-3 block text-sm text-[#a1a7b7]"
                  >
                    Leverage:{" "}
                    <span className="font-semibold text-white">
                      {leverage}×
                    </span>
                  </label>

                  <input
                    id="leverage"
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={leverage}
                    onChange={(event) =>
                      setLeverage(
                        Number(event.target.value)
                      )
                    }
                    className="w-full accent-violet-500"
                  />

                  <div className="mt-2 flex justify-between text-xs text-[#747c8e]">
                    <span>1×</span>
                    <span>10×</span>
                  </div>

                  <p className="mt-3 text-xs text-[#858b9d]">
                    Higher leverage magnifies gains and
                    losses.
                  </p>
                </div>

                <div className="rounded-xl border border-[#292e3d] bg-[#191d29] p-5">
                  <p className="text-sm text-[#858b9d]">
                    {selectedMarket} Mark Price
                  </p>

                  <p className="risklab-number mt-2 break-all text-xl font-semibold">
                    {validPrice
                      ? displayPrice(markPrice)
                      : "Unavailable"}
                  </p>

                  <p className="mt-3 text-xs text-[#858b9d]">
                    Reference for the virtual entry price.
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
                <p className="text-sm text-[#a1a7b7]">
                  Virtual exposure
                </p>

                <p className="risklab-number mt-2 text-3xl font-semibold">
                  {Number.isFinite(exposure)
                    ? formatMoney(exposure)
                    : "—"}
                </p>

                <p className="mt-2 text-xs text-[#858b9d]">
                  {formatMoney(collateral)} × {leverage}×
                  leverage
                </p>
              </div>

              <button
                type="button"
                onClick={openVirtualPosition}
                disabled={
                  !validPrice ||
                  !Number.isFinite(collateral) ||
                  collateral <= 0 ||
                  !Number.isFinite(exposure) ||
                  exposure <= 0
                }
                className="mt-6 w-full rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Open Virtual Position
              </button>
            </>
          )}
        </section>
      )}

      {showRisk && (
        <section className="risklab-card p-6 sm:p-8">
          <div>
            <p className="risklab-label">
              RISK TOOLKIT
            </p>

            <h2 className="mt-3 text-2xl font-semibold">
              Explore trading risk
            </h2>

            <p className="mt-2 text-sm leading-7 text-[#a1a7b7]">
              Select a tool to explore one risk at a time.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() =>
                  setRiskTool(tool.id)
                }
                aria-pressed={
                  riskTool === tool.id
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  riskTool === tool.id
                    ? "bg-[#332747] text-violet-200 ring-1 ring-violet-500/30"
                    : "border border-[#292e3d] bg-[#191d29] text-[#a1a7b7] hover:text-white"
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          <div className="mt-7">
            {!position &&
              ["stress", "liquidation", "funding"].includes(
                riskTool
              ) && (
                <div className="rounded-xl border border-[#34394a] bg-[#191d29] p-5 text-sm leading-7 text-[#a1a7b7]">
                  Open a virtual position in{" "}
                  <span className="font-semibold text-white">
                    {selectedMarket}
                  </span>{" "}
                  on the Paper Trade page to use this
                  analysis.
                </div>
              )}

            {riskTool === "volatility" && (
              <VolatilityAnalysis
                market={selectedMarket}
              />
            )}

            {riskTool === "fomo" && (
              <FomoCheck
                market={selectedMarket}
                collateral={
                  position?.collateral ?? collateral
                }
                leverage={
                  position?.leverage ?? leverage
                }
              />
            )}

            {position && riskTool === "stress" && (
              <RiskSimulator
                market={selectedMarket}
                decimals={priceDecimals}
                entryPrice={position.entryPrice}
                currentPrice={markPrice}
                collateral={position.collateral}
                leverage={position.leverage}
                quantity={position.quantity}
                direction={position.direction}
              />
            )}

            {position &&
              riskTool === "liquidation" && (
                <LiquidationRisk
                  entryPrice={position.entryPrice}
                  currentPrice={markPrice}
                  collateral={position.collateral}
                  quantity={position.quantity}
                  direction={position.direction}
                />
              )}

            {position && riskTool === "funding" && (
              <FundingAnalysis
                market={selectedMarket}
                currentPrice={markPrice}
                quantity={position.quantity}
                direction={position.direction}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-[#292e3d] bg-[#191d29] p-5">
      <p className="text-xs text-[#858b9d]">
        {label}
      </p>

      <p
        className={`risklab-number mt-3 break-words text-2xl font-semibold ${color}`}
      >
        {value}
      </p>
    </div>
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
    <div className="rounded-xl border border-[#292e3d] bg-[#191d29] p-4">
      <p className="text-xs text-[#858b9d]">
        {label}
      </p>

      <p className="risklab-number mt-2 break-words text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}
