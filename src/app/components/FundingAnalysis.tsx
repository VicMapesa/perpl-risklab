
"use client";

import { useEffect, useState } from "react";

type Direction = "LONG" | "SHORT";

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
  direction: Direction;
  market?: string;
};

const REFRESH_INTERVAL_MS = 30_000;
const FUNDING_RATE_SCALE = 1_000_000;

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
    data.marketId >= 0 &&
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

function formatRate(rateFraction: number) {
  const percentage = rateFraction * 100;

  return `${percentage > 0 ? "+" : ""}${percentage.toFixed(6)}%`;
}

function formatInterval(seconds: number) {
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;

    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  if (seconds % 60 === 0) {
    const minutes = seconds / 60;

    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }

  return `${seconds} seconds`;
}

function Metric({
  label,
  value,
  description,
  highlighted = false,
}: {
  label: string;
  value: string;
  description: string;
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

      <p className="mt-3 text-xs leading-5 text-[#858b9d]">
        {description}
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
            selectedMarket ||
          data.symbol.trim().toUpperCase() !==
            symbol
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
      REFRESH_INTERVAL_MS
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

  const validPosition =
    Number.isFinite(currentPrice) &&
    currentPrice > 0 &&
    Number.isFinite(quantity) &&
    quantity > 0 &&
    (direction === "LONG" || direction === "SHORT");

  const positionValue = validPosition
    ? currentPrice * quantity
    : null;

  const validPositionValue =
    positionValue !== null &&
    Number.isFinite(positionValue) &&
    positionValue > 0;

  const rateFraction = currentFunding
    ? currentFunding.rate / FUNDING_RATE_SCALE
    : null;

  const paymentMagnitude =
    validPositionValue && rateFraction !== null
      ? Math.abs(positionValue * rateFraction)
      : null;

  const validPayment =
    paymentMagnitude !== null &&
    Number.isFinite(paymentMagnitude);

  const zeroFunding =
    currentFunding?.rate === 0;

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
            Explore how Perpl&apos;s reported funding
            rate could affect your virtual position
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
              value={formatRate(
                currentFunding.rate /
                  FUNDING_RATE_SCALE
              )}
              description="Perpl's reported rate converted from millionths into a percentage. A negative rate is shown with a minus sign."
            />

            <Metric
              label="Funding Interval"
              value={formatInterval(
                currentFunding.intervalSeconds
              )}
              description="The interval associated with the reported funding rate. This is not a countdown to the next payment."
            />

            <Metric
              label="Virtual Position Value"
              value={
                validPositionValue
                  ? formatMoney(positionValue)
                  : "Unavailable"
              }
              description="Current market price multiplied by your virtual position quantity."
            />

            <Metric
              label="Hypothetical Funding Magnitude"
              value={
                validPayment
                  ? formatMoney(
                      paymentMagnitude,
                      4
                    )
                  : "Unavailable"
              }
              highlighted
              description="The absolute size of one hypothetical funding amount. It does not indicate whether your position pays or receives it."
            />
          </div>

          {!validPositionValue && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
            >
              <p className="text-sm leading-6 text-amber-300">
                The virtual position price or
                quantity is invalid. Funding
                amounts cannot be calculated.
              </p>
            </div>
          )}

          {zeroFunding && validPositionValue && (
            <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <p className="text-sm leading-6 text-violet-200">
                Perpl currently reports a zero
                funding rate for this market.
                Under this simplified calculation,
                the hypothetical funding amount
                for one interval is $0.
              </p>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-[#292e3d] bg-[#191d29] p-5">
            <p className="text-sm font-semibold text-white">
              What does funding mean?
            </p>

            <p className="mt-3 text-sm leading-7 text-[#c2c6d2]">
              Perpetual futures use funding
              payments to help keep contract
              prices aligned with their
              underlying markets.
            </p>

            <p className="mt-3 text-sm leading-7 text-[#c2c6d2]">
              Your virtual position is{" "}
              <span className="font-semibold text-white">
                {direction}
              </span>
              . The hypothetical amount above
              uses the reported rate and your
              current virtual position value
              for one funding interval.
            </p>

            <p className="mt-3 text-sm leading-7 text-[#c2c6d2]">
              The calculation shows the
              <span className="font-semibold text-white">
                {" "}size of a possible funding payment
              </span>
              , not its direction. We have
              not verified Perpl&apos;s exact
              pay-versus-receive convention,
              so this simulator does not
              label the amount as a cost
              or income.
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-[#292e3d] bg-[#191d29] p-5">
            <p className="text-sm font-semibold text-white">
              How is the amount calculated?
            </p>

            <p className="mt-3 text-sm leading-6 text-[#a1a7b7]">
              Position value × absolute funding rate
              = hypothetical funding magnitude.
            </p>

            <p className="mt-3 text-xs leading-6 text-[#858b9d]">
              This is a one-interval estimate.
              Funding rates and position values
              can change before settlement.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#858b9d]">
            <span>
              Refreshes approximately every 30 seconds
            </span>

            {lastUpdated && (
              <span>
                Last received:{" "}
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          <p className="mt-4 text-xs leading-6 text-[#747c8e]">
            Educational simulation only. The
            displayed funding amount is not an
            actual payment or guaranteed
            settlement value. Funding rates can
            change. No real funding payments
            occur, and full exchange settlement
            mechanics are not modeled.
          </p>
        </>
      )}
    </section>
  );
}
