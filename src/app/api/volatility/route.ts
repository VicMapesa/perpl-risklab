
import { NextResponse } from "next/server";

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

const PRICE_DECIMALS = 6;
const CANDLE_SECONDS = 300;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const end = Date.now();
    const start = end - LOOKBACK_MS;

    const url =
      `https://app.perpl.xyz/api/v1/market-data/10/candles/` +
      `${CANDLE_SECONDS}/${start}-${end}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Perpl historical API returned ${response.status}`
      );
    }

    const data: PerplCandleResponse =
      await response.json();

    if (!Array.isArray(data.d)) {
      throw new Error("Invalid candle response");
    }

    const candles = data.d
      .filter(
        (candle) =>
          Number.isFinite(candle.t) &&
          Number.isFinite(candle.o) &&
          Number.isFinite(candle.h) &&
          Number.isFinite(candle.l) &&
          Number.isFinite(candle.c) &&
          candle.o > 0 &&
          candle.h > 0 &&
          candle.l > 0 &&
          candle.c > 0 &&
          candle.t >= start &&
          candle.t <= end
      )
      .sort((a, b) => a.t - b.t);

    if (candles.length < 2) {
      return NextResponse.json(
        { error: "Insufficient historical data" },
        { status: 503 }
      );
    }

    const divisor = 10 ** PRICE_DECIMALS;

    const firstOpen = candles[0].o / divisor;
    const lastClose =
      candles[candles.length - 1].c / divisor;

    const high =
      Math.max(...candles.map((c) => c.h)) / divisor;

    const low =
      Math.min(...candles.map((c) => c.l)) / divisor;

    const changePercent =
      ((lastClose - firstOpen) / firstOpen) * 100;

    const rangePercent =
      ((high - low) / firstOpen) * 100;

    const returns: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const previousClose = candles[i - 1].c;
      const currentClose = candles[i].c;

      returns.push(
        Math.log(currentClose / previousClose)
      );
    }

    const mean =
      returns.reduce((sum, value) => sum + value, 0) /
      returns.length;

    const variance =
      returns.reduce(
        (sum, value) => sum + (value - mean) ** 2,
        0
      ) / (returns.length - 1);

    const fiveMinuteVolatilityPercent =
      Math.sqrt(variance) * 100;

    // Descriptive scaling of observed five-minute
    // volatility to a 24-hour horizon.
    // This is not a forecast.
    const scaled24hVolatilityPercent =
      fiveMinuteVolatilityPercent * Math.sqrt(288);

    return NextResponse.json(
      {
        market: "MON-PERP",
        source: "Perpl",
        candleIntervalSeconds: CANDLE_SECONDS,
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
        observedTo: candles[candles.length - 1].t,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Volatility API error:", error);

    return NextResponse.json(
      { error: "Unable to fetch volatility data" },
      { status: 502 }
    );
  }
}
