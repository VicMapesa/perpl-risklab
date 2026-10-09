
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PerplMarket = {
  id: number;
  name: string;
  config: {
    price_decimals: number;
  };
  state: {
    mrk: number;
    lst: number;
    mid: number;
    bid: number;
    ask: number;
  };
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
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`Perpl API returned ${response.status}`);
    }

    const data = (await response.json()) as PerplContext;

    const mon = data.markets.find(
      (market) => market.id === 10 && market.name === "MON"
    );

    if (!mon) {
      throw new Error("MON market not found");
    }

    const decimals = mon.config.price_decimals;
    const divisor = 10 ** decimals;

    const prices = {
      mark: mon.state.mrk / divisor,
      last: mon.state.lst / divisor,
      mid: mon.state.mid / divisor,
      bid: mon.state.bid / divisor,
      ask: mon.state.ask / divisor,
      decimals,
    };

    if (
      Object.values(prices).some(
        (value) => !Number.isFinite(value)
      ) ||
      prices.mark <= 0
    ) {
      throw new Error("Invalid market data");
    }

    return NextResponse.json(prices, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("RiskLab market API error:", error);

    return NextResponse.json(
      { error: "Unable to fetch Perpl market data" },
      { status: 502 }
    );
  }
}
