
import { NextResponse } from "next/server";

type PerplMarket = {
  id: number;
  name: string;
  funding?: {
    rate?: number;
    at?: {
      t?: number;
    };
  };
  funding_interval_sec?: number;
};

type PerplContext = {
  markets: PerplMarket[];
};

export async function GET() {
  try {
    const response = await fetch(
      "https://app.perpl.xyz/api/v1/pub/context",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Perpl API returned ${response.status}`
      );
    }

    const data: PerplContext = await response.json();

    const mon = data.markets.find(
      (market) =>
        market.id === 10 && market.name === "MON"
    );

    if (!mon) {
      return NextResponse.json(
        { error: "MON market not found" },
        { status: 404 }
      );
    }

    const rate = mon.funding?.rate;
    const intervalSeconds = mon.funding_interval_sec;

    if (
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      typeof intervalSeconds !== "number" ||
      !Number.isFinite(intervalSeconds) ||
      intervalSeconds <= 0
    ) {
      return NextResponse.json(
        { error: "Valid funding data unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        rate,
        intervalSeconds,
        eventTimestamp: mon.funding?.at?.t ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Perpl funding API error:", error);

    return NextResponse.json(
      { error: "Unable to fetch Perpl funding data" },
      { status: 502 }
    );
  }
}
