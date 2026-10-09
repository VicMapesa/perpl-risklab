
"use client";

type Direction = "LONG" | "SHORT";

type LiquidationRiskProps = {
  entryPrice: number;
  currentPrice: number;
  collateral: number;
  quantity: number;
  direction: Direction;
};

const MAINTENANCE_MARGIN_RATE = 0.05;

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function LiquidationRisk({
  entryPrice,
  currentPrice,
  collateral,
  quantity,
  direction,
}: LiquidationRiskProps) {
  if (
    entryPrice <= 0 ||
    currentPrice <= 0 ||
    collateral <= 0 ||
    quantity <= 0
  ) {
    return null;
  }

  const multiplier = direction === "LONG" ? 1 : -1;

  const pnl =
    (currentPrice - entryPrice) * quantity * multiplier;

  const equity = collateral + pnl;
  const positionValue = currentPrice * quantity;

  const maintenanceRequirement =
    positionValue * MAINTENANCE_MARGIN_RATE;

  const marginBuffer = equity - maintenanceRequirement;

  const estimatedThreshold =
    direction === "LONG"
      ? (quantity * entryPrice - collateral) /
        (quantity * (1 - MAINTENANCE_MARGIN_RATE))
      : (quantity * entryPrice + collateral) /
        (quantity * (1 + MAINTENANCE_MARGIN_RATE));

  const validThreshold =
    Number.isFinite(estimatedThreshold) &&
    estimatedThreshold > 0;

  const adverseDistancePercent = validThreshold
    ? direction === "LONG"
      ? ((currentPrice - estimatedThreshold) /
          currentPrice) *
        100
      : ((estimatedThreshold - currentPrice) /
          currentPrice) *
        100
    : null;

  const thresholdReached = marginBuffer <= 0;

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
          Risk Lab
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          Liquidation Risk
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          Understand how losses reduce the margin
          available to support your virtual position.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Estimated Maintenance Requirement
          </p>
          <p className="mt-2 text-2xl font-bold">
            {money(maintenanceRequirement)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            5% of current virtual position value
          </p>
        </div>

        <div className="rounded-xl bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Estimated Margin Buffer
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
          <p className="mt-2 text-xs text-zinc-500">
            Hypothetical equity minus maintenance requirement
          </p>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Simplified Risk Threshold
          </p>
          <p className="mt-2 font-mono text-2xl font-bold">
            {validThreshold
              ? `$${estimatedThreshold.toFixed(6)}`
              : "Not applicable"}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Estimated price where the margin buffer
            reaches zero in this simplified model
          </p>
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-400">
            Distance to Simplified Threshold
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              thresholdReached
                ? "text-red-400"
                : "text-white"
            }`}
          >
            {adverseDistancePercent === null
              ? "Not applicable"
              : thresholdReached
                ? "Threshold crossed"
                : `${Math.max(0, adverseDistancePercent).toFixed(2)}%`}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {direction === "LONG"
              ? "Adverse downward price movement"
              : "Adverse upward price movement"}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm text-amber-300">
          Educational estimate only — NOT an official
          Perpl liquidation price. This simplified
          model assumes a 5% maintenance margin and
          excludes trading fees, funding, slippage,
          other account balances, and Perpl's complete
          liquidation mechanics. Actual liquidation
          may occur at a different price.
        </p>
      </div>
    </section>
  );
}
