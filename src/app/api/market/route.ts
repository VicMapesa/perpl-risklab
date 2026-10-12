
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PERPL_CONTEXT_URL =
  "https://app.perpl.xyz/api/v1/pub/context";

const DEFAULT_MARKET = "MON";

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

type MarketOption = {
  id: number;
  symbol: string;
  label: string;
  decimals: number;
};

function normalizeSymbol(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/-PERP$/, "");
}

function isValidMarket(
  market: unknown
): market is PerplMarket {
  if (!market || typeof market !== "object") {
    return false;
  }

  const candidate = market as Partial<PerplMarket>;

  return (
    typeof candidate.id === "number" &&
    Number.isInteger(candidate.id) &&
    typeof candidate.name === "string" &&
    candidate.name.length > 0 &&
    candidate.config !== undefined &&
    Number.isInteger(
      candidate.config.price_decimals
    ) &&
    candidate.config.price_decimals >= 0 &&
    candidate.config.price_decimals <= 12 &&
    candidate.state !== undefined &&
    [
      candidate.state.mrk,
      candidate.state.lst,
      candidate.state.mid,
      candidate.state.bid,
      candidate.state.ask,
    ].every(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value)
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(PERPL_CONTEXT_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(
        `Perpl API returned ${response.status}`
      );
    }

    const data = (await response.json()) as PerplContext;

    if (!Array.isArray(data.markets)) {
      throw new Error("Invalid Perpl market response");
    }

    const markets = data.markets.filter(isValidMarket);

    if (markets.length === 0) {
      throw new Error("No valid Perpl markets found");
    }

    const marketOptions: MarketOption[] = markets
      .map((market) => ({
        id: market.id,
        symbol: normalizeSymbol(market.name),
        label: `${normalizeSymbol(market.name)}-PERP`,
        decimals: market.config.price_decimals,
      }))
      .sort((a, b) => a.id - b.id);

    const headers = {
      "Cache-Control": "no-store",
    };

    // Return the available markets for the selector.
    if (
      request.nextUrl.searchParams.get("list") === "1"
    ) {
      return NextResponse.json(
        { markets: marketOptions },
        { headers }
      );
    }

    // Accept either a market symbol or a market ID.
    // Existing callers still default to MON.
    const requestedSymbol =
      request.nextUrl.searchParams.get("market");

    const requestedId =
      request.nextUrl.searchParams.get("id");

    let selectedMarket: PerplMarket | undefined;

    if (requestedId !== null) {
      const id = Number(requestedId);

      if (!Number.isInteger(id)) {
        return NextResponse.json(
          { error: "Invalid market ID" },
          { status: 400, headers }
        );
      }

      selectedMarket = markets.find(
        (market) => market.id === id
      );
    } else {
      const symbol = normalizeSymbol(
        requestedSymbol || DEFAULT_MARKET
      );

      selectedMarket = markets.find(
        (market) =>
          normalizeSymbol(market.name) === symbol
      );
    }

    if (!selectedMarket) {
      return NextResponse.json(
        {
          error: "Market not found on Perpl",
          availableMarkets: marketOptions,
        },
        { status: 404, headers }
      );
    }

    const decimals =
      selectedMarket.config.price_decimals;

    const divisor = 10 ** decimals;

    const prices = {
      mark: selectedMarket.state.mrk / divisor,
      last: selectedMarket.state.lst / divisor,
      mid: selectedMarket.state.mid / divisor,
      bid: selectedMarket.state.bid / divisor,
      ask: selectedMarket.state.ask / divisor,
      decimals,
    };

    if (
      Object.values(prices).some(
        (value) => !Number.isFinite(value)
      ) ||
      prices.mark <= 0
    ) {
      throw new Error(
        "Invalid price data for selected market"
      );
    }

    return NextResponse.json(
      {
        ...prices,
        marketId: selectedMarket.id,
        symbol: normalizeSymbol(selectedMarket.name),
        market: `${normalizeSymbol(
          selectedMarket.name
        )}-PERP`,
      },
      { headers }
    );
  } catch (error) {
    console.error(
      "RiskLab market API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to fetch Perpl market data",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
