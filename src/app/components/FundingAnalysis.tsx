
"use client";

import { useEffect, useState } from "react";

type FundingData = {
  rate: number;
  intervalSeconds: number;
  eventTimestamp: number | null;
};

type FundingAnalysisProps = {
  currentPrice: number;
  quantity: number;
  direction: "LONG" | "SHORT";
};

export default function FundingAnalysis({
  currentPrice,
  quantity,
  direction,
}: FundingAnalysisProps) {
  const [funding, setFunding] = useState<FundingData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadFunding() {
      try {
        const response = await fetch("/api/funding", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Funding data unavailable");
        }

        const data = (await response.json()) as FundingData;

        if (active) {
          setFunding(data);
          setError("");
        }
      } catch {
        if (active) {
          setError("Unable to load Perpl funding data.");
        }
      }
    }

    loadFunding();
    const interval = setInterval(loadFunding, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const positionValue = currentPrice * quantity;
  const rateFraction = funding ? funding.rate / 1_000_000 : 0;
  const paymentMagnitude = Math.abs(positionValue * rateFraction);

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
        Risk Lab
      </p>

      <h2 className="mt-2 text-2xl font-semibold">
        Funding Analysis
      </h2>

      <p className="mt-2 text-sm text-zinc-400">
        Perpetual positions can involve funding transfers
        even when the market price does not move.
      </p>

      {error && (
        <p className="mt-5 text-sm text-amber-400">{error}</p>
      )}

      {!funding ? (
        <p className="mt-5 text-zinc-400">
          Waiting for Perpl funding data...
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Latest Reported Funding Rate
              </p>
              <p className="mt-2 text-2xl font-bold">
                {(rateFraction * 100).toFixed(4)}%
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Funding Interval
              </p>
              <p className="mt-2 text-2xl font-bold">
                {(funding.intervalSeconds / 60).toFixed(1)} minutes
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                Virtual Position Value
              </p>
              <p className="mt-2 text-2xl font-bold">
                ${positionValue.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
              <p className="text-sm text-zinc-400">
                Hypothetical Funding Magnitude
              </p>
              <p className="mt-2 text-2xl font-bold">
                ${paymentMagnitude.toFixed(4)}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                One funding event, assuming the reported rate
                and current position value
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-300">
              Your virtual position is {direction}. This panel
              shows the absolute funding amount, not whether
              your position pays or receives it.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-300">
              Educational simulation only. The latest reported
              funding rate is not a guaranteed future rate.
              Payment direction and actual settlement mechanics
              are not modeled. No real funding payments occur.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
