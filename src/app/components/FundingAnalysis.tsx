
"use client";

import { useEffect, useState } from "react";

type FundingData = {
  market: string;
  symbol: string;
  marketId: number;
  rate: number;
  intervalSeconds: number;
  eventTimestamp: number | null;
};

type FundingAnalysisProps = {
  currentPrice: number;
  quantity: number;
  direction: "LONG" | "SHORT";
  market?: string;
};

const REFRESH_INTERVAL = 30000;

function normalizeMarket(value: string) {
  const symbol = value.trim().toUpperCase();

  return symbol.endsWith("-PERP")
    ? symbol
    : `${symbol}-PERP`;
}

function isFundingData(
  value: unknown
): value is FundingData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<FundingData>;

  return (
    typeof data.market === "string" &&
    typeof data.symbol === "string" &&
    typeof data.marketId === "number" &&
    Number.isInteger(data.marketId) &&
    typeof data.rate === "number" &&
    Number.isFinite(data.rate) &&
    typeof data.intervalSeconds === "number" &&
    Number.isFinite(data.intervalSeconds) &&
    data.intervalSeconds > 0 &&
    (data.eventTimestamp === null ||
      (typeof data.eventTimestamp === "number" &&
        Number.isFinite(data.eventTimestamp)))
  );
}

function formatMoney(
  value: number,
  digits = 2
) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function Metric({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlighted
          ? "border-violet-500/25 bg-violet-500/5"
          : "border-[#292e3d] bg-[#191d29]"
      }`}
    >
      <p className="text-sm text-[#a1a7b7]">
        {label}
      </p>

      <p className="risklab-number mt-3 break-words text-2xl font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

export default function FundingAnalysis({
  currentPrice,
  quantity,
  direction,
  market = "MON-PERP",
}: FundingAnalysisProps) {
  const selectedMarket = normalizeMarket(market);

  const [funding, setFunding] =
    useState<FundingData | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  useEffect(() => {
    let active = true;

    let controller: AbortController | null = null;

    async function loadFunding() {
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
          `/api/funding?market=${encodeURIComponent(
            symbol
          )}`,
          {
            cache: "no-store",
            signal: currentController.signal,
          }
        );

        if (!response.ok) {
          let message =
            "Unable to load Perpl funding data.";

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
            // Keep the default error message.
          }

          throw new Error(message);
        }

        const data: unknown = await response.json();

        if (!isFundingData(data)) {
          throw new Error(
            "Invalid funding data received."
          );
        }

        if (
          normalizeMarket(data.market) !==
          selectedMarket
        ) {
          throw new Error(
            "Funding response does not match the selected market."
          );
        }

        if (
          !active ||
          currentController.signal.aborted
        ) {
          return;
        }

        setFunding(data);
        setError("");
        setLastUpdated(new Date());
      } catch (err) {
        if (
          !active ||
          currentController.signal.aborted
        ) {
          return;
        }

        setFunding(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load Perpl funding data."
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

    setFunding(null);
    setError("");
    setLoading(true);
    setLastUpdated(null);

    void loadFunding();

    const interval = window.setInterval(
      () => void loadFunding(),
      REFRESH_INTERVAL
    );

    return () => {
      active = false;
      window.clearInterval(interval);
      controller?.abort();
    };
  }, [selectedMarket]);

  const currentFunding =
    funding &&
    normalizeMarket(funding.market) ===
      selectedMarket
      ? funding
      : null;

  // Perpl funding rate uses 1e6 scaling.
  const rateFraction = currentFunding
    ? currentFunding.rate / 1_000_000
    : 0;

  const positionValue =
    currentPrice * quantity;

  const paymentMagnitude = Math.abs(
    positionValue * rateFraction
  );

  return (
    <section className="mt-6 rounded-2xl border border-[#292e3d] bg-[#151820] p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.17em] text-violet-400">
        RISK LAB
      </p>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            Funding Analysis
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#a1a7b7]">
            Explore how a reported funding rate
            could affect your virtual position
            over one funding interval.
          </p>
        </div>

        <span className="rounded-lg border border-[#34394a] bg-[#191d29] px-3 py-2 text-xs font-medium text-[#c2c6d2]">
          {selectedMarket}
        </span>
      </div>

      {loading && !currentFunding && (
        <p
          role="status"
          className="mt-6 text-sm text-[#a1a7b7]"
        >
          Loading {selectedMarket} funding data...
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
            Funding estimates are unavailable
            until Perpl returns valid data.
          </p>
        </div>
      )}

      {currentFunding && (
        <>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <Metric
              label="Reported Funding Rate"
              value={`${(rateFraction * 100).toFixed(
                6
              )}%`}
            />

            <Metric
              label="Funding Interval"
              value={`${(
                currentFunding.intervalSeconds / 60
              ).toFixed(1)} min`}
            />

            <Metric
              label="Virtual Position Value"
              value={formatMoney(positionValue)}
            />

            <Metric
              label="Hypothetical Funding Amount"
              value={formatMoney(
                paymentMagnitude,
                4
              )}
              highlighted
            />
          </div>

          <div className="mt-5 rounded-xl border border-[#292e3d] bg-[#191d29] p-5">
            <p className="text-sm leading-7 text-[#c2c6d2]">
              Your virtual position is{" "}
              <span className="font-semibold text-white">
                {direction}
              </span>
              . The estimated amount represents
              one funding interval using the
              latest reported rate and current
              position value.
            </p>

            <p className="mt-3 text-xs leading-6 text-[#858b9d]">
              The amount is shown as an absolute
              magnitude. Whether a position pays
              or receives funding depends on
              the applicable market rules and
              funding direction.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#858b9d]">
            <span>
              Updates approximately every 30 seconds
            </span>

            {lastUpdated && (
              <span>
                Last received:{" "}
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          <p className="mt-4 text-xs leading-6 text-[#747c8e]">
            Educational simulation only. Funding
            rates can change. No real funding
            payments occur, and settlement
            mechanics are not modeled.
          </p>
        </>
      )}
    </section>
  );
}
