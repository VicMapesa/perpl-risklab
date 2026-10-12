
import { NextRequest, NextResponse } from "next/server";

type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

type MarketOption = {
  id: number;
  symbol: string;
  label: string;
  decimals: number;
};

const INTERVAL_SECONDS = 300;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MARKET = "MON";

const PERPL_API = "https://app.perpl.xyz/api/v1";

function isMarketOption(value: unknown): value is MarketOption {
  if (!value || typeof value !== "object") {
    return false;
  }

  const market = value as Partial<MarketOption>;

  return (
    typeof market.id === "number" &&
    Number.isInteger(market.id) &&
    market.id >= 0 &&
    typeof market.symbol === "string" &&
    /^[A-Z0-9]+$/.test(market.symbol) &&
    market.label === `${market.symbol}-PERP` &&
    typeof market.decimals === "number" &&
    Number.isInteger(market.decimals) &&
    market.decimals >= 0 &&
    market.decimals <= 12
  );
}

function isCandle(value: unknown): value is Candle {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candle = value as Partial<Candle>;

  return (
    typeof candle.t === "number" &&
    Number.isFinite(candle.t) &&
    typeof candle.o === "number" &&
    Number.isFinite(candle.o) &&
    candle.o > 0 &&
    typeof candle.h === "number" &&
    Number.isFinite(candle.h) &&
    candle.h > 0 &&
    typeof candle.l === "number" &&
    Number.isFinite(candle.l) &&
    candle.l > 0 &&
    typeof candle.c === "number" &&
    Number.isFinite(candle.c) &&
    candle.c > 0 &&
    candle.h >= Math.max(candle.o, candle.c, candle.l) &&
    candle.l <= Math.min(candle.o, candle.c, candle.h)
  );
}

async function discoverMarkets(
  request: NextRequest
): Promise<MarketOption[]> {
  const url = new URL("/api/market?list=1", request.url);

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(
      `Market discovery returned ${response.status}`
    );
  }

  const data: unknown = await response.json();

  if (
    !data ||
    typeof data !== "object" ||
    !("markets" in data) ||
    !Array.isArray(data.markets)
  ) {
    throw new Error("Invalid market discovery response");
  }

  return data.markets.filter(isMarketOption);
}

export async function GET(request: NextRequest) {
  try {
    const requestedMarket =
      request.nextUrl.searchParams
        .get("market")
        ?.trim()
        .toUpperCase() || DEFAULT_MARKET;

    const symbol = requestedMarket.replace(/-PERP$/, "");

    if (!/^[A-Z0-9]+$/.test(symbol)) {
      return NextResponse.json(
        { error: "Invalid market symbol" },
        { status: 400 }
      );
    }

    const markets = await discoverMarkets(request);

    const selectedMarket = markets.find(
      (market) => market.symbol === symbol
    );

    if (!selectedMarket) {
      return NextResponse.json(
        {
          error: `Market ${symbol} is not available`,
        },
        { status: 404 }
      );
    }

    const end = Date.now();
    const start = end - LOOKBACK_MS;

    const url =
      `${PERPL_API}/market-data/` +
      `${selectedMarket.id}/candles/` +
      `${INTERVAL_SECONDS}/${start}-${end}`;

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(
        `Perpl historical API returned ${response.status}`
      );
    }

    const data: unknown = await response.json();

    if (
      !data ||
      typeof data !== "object" ||
      !("d" in data) ||
      !Array.isArray(data.d)
    ) {
      throw new Error("Invalid candle response");
    }

    const candles = data.d
      .filter(
        (candle): candle is Candle =>
          isCandle(candle) &&
          candle.t >= start &&
          candle.t <= end
      )
      .sort((a, b) => a.t - b.t);

    if (candles.length < 24) {
      return NextResponse.json(
        {
          error:
            `Insufficient historical candles for ${selectedMarket.label}`,
        },
        { status: 503 }
      );
    }

    const latest = candles[candles.length - 1];
    const first = candles[0];

    // Candle timestamps are milliseconds.
    // Find the candle closest to one hour before
    // the latest candle, without using future data.
    const hourTarget = latest.t - 60 * 60 * 1000;

    const oneHourEarlier = [...candles]
      .reverse()
      .find((candle) => candle.t <= hourTarget);

    if (!oneHourEarlier) {
      return NextResponse.json(
        {
          error:
            `Insufficient hourly history for ${selectedMarket.label}`,
        },
        { status: 503 }
      );
    }

    // Reject large gaps in the one-hour comparison.
    if (
      hourTarget - oneHourEarlier.t >
      INTERVAL_SECONDS * 1000
    ) {
      return NextResponse.json(
        {
          error:
            `Incomplete hourly history for ${selectedMarket.label}`,
        },
        { status: 503 }
      );
    }

    const priceScale = 10 ** selectedMarket.decimals;

    const currentPrice = latest.c / priceScale;
    const hourAgoPrice = oneHourEarlier.c / priceScale;
    const dayStartPrice = first.o / priceScale;

    const oneHourChangePercent =
      ((currentPrice - hourAgoPrice) /
        hourAgoPrice) *
      100;

    const dayChangePercent =
      ((currentPrice - dayStartPrice) /
        dayStartPrice) *
      100;

    const dayHigh =
      Math.max(...candles.map((candle) => candle.h)) /
      priceScale;

    const dayLow =
      Math.min(...candles.map((candle) => candle.l)) /
      priceScale;

    return NextResponse.json(
      {
        market: selectedMarket.label,
        symbol: selectedMarket.symbol,
        marketId: selectedMarket.id,
        decimals: selectedMarket.decimals,
        source: "Perpl",
        currentPrice,
        hourAgoPrice,
        dayStartPrice,
        dayHigh,
        dayLow,
        oneHourChangePercent,
        dayChangePercent,
        candleCount: candles.length,
        observedAt: latest.t,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("FOMO Check API error:", error);

    return NextResponse.json(
      {
        error: "Unable to fetch FOMO Check data",
      },
      { status: 502 }
    );
  }
}
