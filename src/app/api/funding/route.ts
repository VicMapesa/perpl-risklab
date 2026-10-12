
import { NextRequest, NextResponse } from "next/server";

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

const PERPL_CONTEXT_URL =
  "https://app.perpl.xyz/api/v1/pub/context";

const REQUEST_TIMEOUT_MS = 10000;

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const requestedMarket = (
    request.nextUrl.searchParams.get("market") ??
    "MON"
  )
    .trim()
    .toUpperCase()
    .replace(/-PERP$/, "");

  if (!/^[A-Z0-9]{1,20}$/.test(requestedMarket)) {
    return errorResponse(
      "Invalid market symbol",
      400
    );
  }

  try {
    const response = await fetch(PERPL_CONTEXT_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Perpl API returned ${response.status}`
      );
    }

    const data: unknown = await response.json();

    if (
      !data ||
      typeof data !== "object" ||
      !("markets" in data) ||
      !Array.isArray(data.markets)
    ) {
      return errorResponse(
        "Invalid Perpl market response",
        502
      );
    }

    const markets = data.markets as PerplMarket[];

    const selectedMarket = markets.find(
      (market) =>
        market &&
        typeof market.name === "string" &&
        market.name.toUpperCase() ===
          requestedMarket &&
        Number.isInteger(market.id)
    );

    if (!selectedMarket) {
      return errorResponse(
        `${requestedMarket}-PERP market not found`,
        404
      );
    }

    const rate = selectedMarket.funding?.rate;
    const intervalSeconds =
      selectedMarket.funding_interval_sec;

    if (
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      typeof intervalSeconds !== "number" ||
      !Number.isFinite(intervalSeconds) ||
      intervalSeconds <= 0
    ) {
      return errorResponse(
        `Valid funding data unavailable for ${requestedMarket}-PERP`,
        503
      );
    }

    const rawTimestamp =
      selectedMarket.funding?.at?.t;

    const eventTimestamp =
      typeof rawTimestamp === "number" &&
      Number.isFinite(rawTimestamp)
        ? rawTimestamp
        : null;

    return NextResponse.json(
      {
        market: `${selectedMarket.name}-PERP`,
        symbol: selectedMarket.name,
        marketId: selectedMarket.id,
        rate,
        intervalSeconds,
        eventTimestamp,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Perpl funding API error:",
      error
    );

    return errorResponse(
      "Unable to fetch Perpl funding data",
      502
    );
  }
}
