
import { NextRequest, NextResponse } from "next/server";

type PerplCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: string;
  n: number;
};

type PerplCandleResponse = {
  mt: number;
  r: number;
  d: PerplCandle[];
};

type MarketOption = {
  id: number;
  symbol: string;
  label: string;
  decimals: number;
};

const CANDLE_SECONDS = 300;
const CANDLE_INTERVAL_MS = CANDLE_SECONDS * 1000;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

const DEFAULT_MARKET = "MON";

const PERPL_API =
  "https://app.perpl.xyz/api/v1";

function isMarketOption(
  value: unknown
): value is MarketOption {
  if (!value || typeof value !== "object") {
    return false;
  }

  const market = value as Partial<MarketOption>;

  return (
    typeof market.id === "number" &&
    Number.isInteger(market.id) &&
    typeof market.symbol === "string" &&
    /^[A-Z0-9]+$/.test(market.symbol) &&
    market.label === `${market.symbol}-PERP` &&
    typeof market.decimals === "number" &&
    Number.isInteger(market.decimals) &&
    market.decimals >= 0 &&
    market.decimals <= 12
  );
}

function isCandle(
  value: unknown
): value is PerplCandle {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candle = value as Partial<PerplCandle>;

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
    candle.c > 0
  );
}

async function discoverMarkets(
  request: NextRequest
): Promise<MarketOption[]> {
  const url = new URL(
    "/api/market?list=1",
    request.url
  );

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
    throw new Error(
      "Invalid market discovery response"
    );
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

    const symbol = requestedMarket.replace(
      /-PERP$/,
      ""
    );

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
      `${CANDLE_SECONDS}/${start}-${end}`;

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

    const candleResponse =
      data as PerplCandleResponse;

    const candles = candleResponse.d
      .filter(
        (candle) =>
          isCandle(candle) &&
          candle.t >= start &&
          candle.t <= end
      )
      .sort((a, b) => a.t - b.t);

    if (candles.length < 3) {
      return NextResponse.json(
        {
          error:
            `Insufficient historical data for ${selectedMarket.label}`,
        },
        { status: 503 }
      );
    }

    const divisor =
      10 ** selectedMarket.decimals;

    const firstOpen =
      candles[0].o / divisor;

    const lastClose =
      candles[candles.length - 1].c / divisor;

    const high =
      Math.max(...candles.map((c) => c.h)) /
      divisor;

    const low =
      Math.min(...candles.map((c) => c.l)) /
      divisor;

    const changePercent =
      ((lastClose - firstOpen) / firstOpen) * 100;

    const rangePercent =
      ((high - low) / firstOpen) * 100;

    const returns: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const previousCandle = candles[i - 1];
      const currentCandle = candles[i];

      const timeDifference =
        currentCandle.t - previousCandle.t;

      // Only consecutive five-minute candles
      // can produce a five-minute return.
      if (timeDifference !== CANDLE_INTERVAL_MS) {
        continue;
      }

      returns.push(
        Math.log(
          currentCandle.c / previousCandle.c
        )
      );
    }

    // Sample standard deviation requires
    // at least two valid return observations.
    if (returns.length < 2) {
      return NextResponse.json(
        {
          error:
            `Insufficient consecutive five-minute candles for ${selectedMarket.label}`,
        },
        { status: 503 }
      );
    }

    const mean =
      returns.reduce(
        (sum, value) => sum + value,
        0
      ) / returns.length;

    const variance =
      returns.reduce(
        (sum, value) =>
          sum + (value - mean) ** 2,
        0
      ) / (returns.length - 1);

    const fiveMinuteVolatilityPercent =
      Math.sqrt(variance) * 100;

    // Statistical scaling, not a forecast.
    const scaled24hVolatilityPercent =
      fiveMinuteVolatilityPercent *
      Math.sqrt(288);

    return NextResponse.json(
      {
        market: selectedMarket.label,
        symbol: selectedMarket.symbol,
        marketId: selectedMarket.id,
        decimals: selectedMarket.decimals,
        source: "Perpl",
        candleIntervalSeconds:
          CANDLE_SECONDS,
        candleCount: candles.length,
        firstOpen,
        lastClose,
        high,
        low,
        changePercent,
        rangePercent,
        fiveMinuteVolatilityPercent,
        scaled24hVolatilityPercent,
        observedFrom: candles[0].t,
        observedTo:
          candles[candles.length - 1].t,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Volatility API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to fetch volatility data",
      },
      { status: 502 }
    );
  }
}
