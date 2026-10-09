
import { NextResponse } from "next/server";

type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

type CandleResponse = {
  d: Candle[];
};

const PRICE_SCALE = 1_000_000;
const INTERVAL_SECONDS = 300;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const end = Date.now();
    const start = end - LOOKBACK_MS;

    const url =
      `https://app.perpl.xyz/api/v1/market-data/10/candles/` +
      `${INTERVAL_SECONDS}/${start}-${end}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Perpl API returned ${response.status}`
      );
    }

    const data: CandleResponse = await response.json();

    if (!Array.isArray(data.d)) {
      throw new Error("Invalid candle response");
    }

    const candles = data.d
      .filter(
        (c) =>
          Number.isFinite(c.t) &&
          Number.isFinite(c.o) &&
          Number.isFinite(c.h) &&
          Number.isFinite(c.l) &&
          Number.isFinite(c.c) &&
          c.o > 0 &&
          c.h > 0 &&
          c.l > 0 &&
          c.c > 0 &&
          c.t >= start &&
          c.t <= end
      )
      .sort((a, b) => a.t - b.t);

    if (candles.length < 24) {
      return NextResponse.json(
        { error: "Insufficient historical candles" },
        { status: 503 }
      );
    }

    const latest = candles[candles.length - 1];

    // Approximately one hour earlier:
    // 12 five-minute candle intervals.
    const oneHourEarlier =
      candles[candles.length - 13];

    const first = candles[0];

    if (!oneHourEarlier) {
      return NextResponse.json(
        { error: "Insufficient hourly history" },
        { status: 503 }
      );
    }

    const currentPrice = latest.c / PRICE_SCALE;
    const hourAgoPrice =
      oneHourEarlier.c / PRICE_SCALE;
    const dayStartPrice = first.o / PRICE_SCALE;

    const oneHourChangePercent =
      ((currentPrice - hourAgoPrice) /
        hourAgoPrice) *
      100;

    const dayChangePercent =
      ((currentPrice - dayStartPrice) /
        dayStartPrice) *
      100;

    const dayHigh =
      Math.max(...candles.map((c) => c.h)) /
      PRICE_SCALE;

    const dayLow =
      Math.min(...candles.map((c) => c.l)) /
      PRICE_SCALE;

    return NextResponse.json(
      {
        market: "MON-PERP",
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
      { error: "Unable to fetch FOMO Check data" },
      { status: 502 }
    );
  }
}
