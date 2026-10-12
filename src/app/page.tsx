
"use client";

import { useEffect, useState } from "react";
import VirtualTrade from "./components/VirtualTrade";

type MarketData = {
  mark: number;
  last: number;
  mid: number;
  bid: number;
  ask: number;
  decimals: number;
  marketId: number;
  symbol: string;
  market: string;
};

type MarketOption = {
  id: number;
  symbol: string;
  label: string;
  decimals: number;
};

type Tab = "overview" | "trade" | "risk" | "learn";

type Topic = {
  title: string;
  description: string;
  example: string;
};

const REFRESH_INTERVAL = 5000;
const DEFAULT_MARKET = "MON";
const SELECTED_MARKET_STORAGE_KEY =
  "perpl-risklab-selected-market";

const navigation: {
  id: Tab;
  label: string;
  icon: string;
}[] = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "trade", label: "Paper Trade", icon: "↗" },
  { id: "risk", label: "Risk Lab", icon: "◇" },
  { id: "learn", label: "Learn", icon: "◎" },
];

const topics: Topic[] = [
  {
    title: "Long & Short",
    description:
      "A LONG position benefits from rising prices. A SHORT position benefits from falling prices. Both can lose when the market moves against them.",
    example:
      "If a virtual LONG enters at $1 and the price rises to $1.10, the underlying price has risen by 10%. A SHORT would be exposed to the opposite direction.",
  },
  {
    title: "Leverage",
    description:
      "Leverage multiplies your exposure relative to your collateral. It magnifies both gains and losses.",
    example:
      "$50 of virtual collateral with 5× leverage creates $250 of position exposure. A 2% underlying price move can change the position's value by approximately $5 before costs.",
  },
  {
    title: "Collateral",
    description:
      "Collateral is the margin supporting a position. In RiskLab, all collateral is virtual.",
    example:
      "A virtual position backed by $50 collateral uses pretend funds. There is no wallet connection, deposit, or real order.",
  },
  {
    title: "Liquidation",
    description:
      "Real perpetual markets may liquidate a position when its margin becomes insufficient. RiskLab uses simplified assumptions to illustrate margin pressure.",
    example:
      "Higher leverage leaves less room for adverse price movement. RiskLab's estimates are not official Perpl liquidation prices.",
  },
  {
    title: "Funding",
    description:
      "Perpetual contracts can involve recurring funding transfers between long and short participants.",
    example:
      "Depending on the funding rate and position direction, funding may be paid or received. The rate can change over time.",
  },
  {
    title: "Volatility",
    description:
      "Volatility describes how much prices fluctuate. Larger swings can have a greater effect on leveraged positions.",
    example:
      "Two markets can have similar prices but very different movement patterns. The more volatile one may experience sharper changes.",
  },
  {
    title: "FOMO",
    description:
      "Fear of missing out can encourage entering a position after a sharp price rally.",
    example:
      "A market may rally and then pull back. FOMO Check lets you explore that hypothetical reversal rather than assuming a rally will continue.",
  },
  {
    title: "Mark Price",
    description:
      "Mark price is a reference used to value perpetual positions. RiskLab uses Perpl's reported mark price for its virtual calculations.",
    example:
      "Mark price and the latest traded price can differ. Your virtual position is evaluated using the mark price.",
  },
  {
    title: "Unrealized P&L",
    description:
      "Unrealized profit or loss is the estimated change in a position's value while it remains open.",
    example:
      "RiskLab's basic virtual P&L excludes trading fees, funding, slippage, and liquidation mechanics.",
  },
];

function isMarketData(value: unknown): value is MarketData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<MarketData>;

  return (
    typeof data.mark === "number" &&
    Number.isFinite(data.mark) &&
    data.mark > 0 &&
    [data.last, data.mid, data.bid, data.ask].every(
      (price) =>
        typeof price === "number" &&
        Number.isFinite(price)
    ) &&
    typeof data.decimals === "number" &&
    Number.isInteger(data.decimals) &&
    data.decimals >= 0 &&
    data.decimals <= 12 &&
    typeof data.marketId === "number" &&
    Number.isInteger(data.marketId) &&
    typeof data.symbol === "string" &&
    typeof data.market === "string"
  );
}

function isMarketOption(
  value: unknown
): value is MarketOption {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<MarketOption>;

  return (
    typeof item.id === "number" &&
    Number.isInteger(item.id) &&
    typeof item.symbol === "string" &&
    /^[A-Z0-9]+$/.test(item.symbol) &&
    item.label === `${item.symbol}-PERP` &&
    typeof item.decimals === "number" &&
    Number.isInteger(item.decimals) &&
    item.decimals >= 0 &&
    item.decimals <= 12
  );
}

function displayPrice(
  value: number,
  decimals: number
) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export default function Home() {
  const [activeTab, setActiveTab] =
    useState<Tab>("overview");

  const [selectedSymbol, setSelectedSymbol] =
    useState(DEFAULT_MARKET);

  const [marketSelectionRestored, setMarketSelectionRestored] =
    useState(false);

  const [availableMarkets, setAvailableMarkets] =
    useState<MarketOption[]>([]);

  const [marketsError, setMarketsError] =
    useState<string | null>(null);

  const [market, setMarket] =
    useState<MarketData | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const [selectedTopic, setSelectedTopic] =
    useState(0);

  // Restore the last selected market after the page loads.
  useEffect(() => {
    try {
      const savedSymbol = window.localStorage.getItem(
        SELECTED_MARKET_STORAGE_KEY
      );

      if (
        savedSymbol &&
        /^[A-Z0-9]+$/.test(savedSymbol)
      ) {
        setSelectedSymbol(savedSymbol);
      }
    } catch (err) {
      console.warn(
        "Unable to restore selected market:",
        err
      );
    } finally {
      setMarketSelectionRestored(true);
    }
  }, []);

  // Remember the selected market across refreshes.
  useEffect(() => {
    if (!marketSelectionRestored) {
      return;
    }

    try {
      window.localStorage.setItem(
        SELECTED_MARKET_STORAGE_KEY,
        selectedSymbol
      );
    } catch (err) {
      console.warn(
        "Unable to save selected market:",
        err
      );
    }
  }, [selectedSymbol, marketSelectionRestored]);

  // Discover markets from Perpl.
  useEffect(() => {
    const controller = new AbortController();

    async function loadMarkets() {
      try {
        const response = await fetch(
          "/api/market?list=1",
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Market list returned ${response.status}`
          );
        }

        const data: unknown = await response.json();

        if (
          !data ||
          typeof data !== "object" ||
          !("markets" in data) ||
          !Array.isArray(data.markets)
        ) {
          throw new Error("Invalid market list");
        }

        const options = data.markets.filter(
          isMarketOption
        );

        if (options.length === 0) {
          throw new Error("No markets available");
        }

        if (!controller.signal.aborted) {
          setAvailableMarkets(options);
          setMarketsError(null);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(
          "Unable to load market list:",
          err
        );

        setMarketsError(
          "Unable to load the market list."
        );
      }
    }

    void loadMarkets();

    return () => controller.abort();
  }, []);

  // Fetch only the selected market after restoration.
  useEffect(() => {
    if (!marketSelectionRestored) {
      return;
    }

    let active = true;
    let controller: AbortController | null = null;

    async function updateMarket() {
      controller?.abort();

      const currentController =
        new AbortController();

      controller = currentController;

      try {
        const response = await fetch(
          `/api/market?market=${encodeURIComponent(
            selectedSymbol
          )}`,
          {
            cache: "no-store",
            signal: currentController.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Market API returned ${response.status}`
          );
        }

        const data: unknown = await response.json();

        if (!isMarketData(data)) {
          throw new Error(
            "Invalid market data received"
          );
        }

        if (
          data.symbol !== selectedSymbol ||
          data.market !== `${selectedSymbol}-PERP`
        ) {
          throw new Error(
            "Market response does not match selection"
          );
        }

        if (
          !active ||
          currentController.signal.aborted
        ) {
          return;
        }

        setMarket(data);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        if (
          !active ||
          currentController.signal.aborted
        ) {
          return;
        }

        console.error(
          "Market update failed:",
          err
        );

        setError(
          "Market update failed. Retrying automatically."
        );
      }
    }

    setMarket(null);
    setLastUpdated(null);
    setError(null);

    void updateMarket();

    const interval = window.setInterval(
      () => void updateMarket(),
      REFRESH_INTERVAL
    );

    return () => {
      active = false;
      window.clearInterval(interval);
      controller?.abort();
    };
  }, [selectedSymbol, marketSelectionRestored]);

  function navigate(tab: Tab) {
    setActiveTab(tab);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function selectMarket(symbol: string) {
    if (symbol === selectedSymbol) {
      return;
    }

    setSelectedSymbol(symbol);
    setMarket(null);
    setLastUpdated(null);
    setError(null);
  }

  const selectedMarketLabel =
    `${selectedSymbol}-PERP`;

  const currentMarket =
    market?.symbol === selectedSymbol
      ? market
      : null;

  const connected = Boolean(
    currentMarket && !error
  );

  const marketPrice = currentMarket
    ? displayPrice(
        currentMarket.mark,
        currentMarket.decimals
      )
    : "Connecting...";

  return (
    <main className="min-h-screen bg-[#090b12] text-[#f4f4f7]">
      <header className="sticky top-0 z-40 border-b border-[#242837] bg-[#0c0e16]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => navigate("overview")}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-lg font-black text-white">
              R
            </span>

            <span>
              <span className="block text-lg font-bold tracking-tight">
                Perpl{" "}
                <span className="text-violet-400">
                  RiskLab
                </span>
              </span>

              <span className="block text-[11px] text-[#858b9d]">
                Perpetual risk simulator
              </span>
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="global-market"
              className="text-xs text-[#858b9d]"
            >
              Market
            </label>

            <select
              id="global-market"
              value={selectedSymbol}
              onChange={(event) =>
                selectMarket(event.target.value)
              }
              disabled={
                !marketSelectionRestored ||
                availableMarkets.length === 0
              }
              className="min-w-[150px] cursor-pointer rounded-xl border border-[#34394a] bg-[#191d29] px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!availableMarkets.some(
                (option) =>
                  option.symbol === selectedSymbol
              ) && (
                <option value={selectedSymbol}>
                  {selectedMarketLabel}
                </option>
              )}

              {availableMarkets.map((option) => (
                <option
                  key={option.id}
                  value={option.symbol}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <span
              role="status"
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${
                error || marketsError
                  ? "border-amber-500/20 text-amber-300"
                  : connected
                    ? "border-emerald-500/20 text-emerald-300"
                    : "border-[#303545] text-[#a1a7b7]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  error || marketsError
                    ? "bg-amber-400"
                    : connected
                      ? "bg-emerald-400"
                      : "bg-[#858b9d]"
                }`}
              />

              {error || marketsError
                ? "Market delayed"
                : connected
                  ? "Perpl connected"
                  : "Connecting"}
            </span>

            <span className="rounded-full border border-[#303545] px-3 py-2 text-xs text-[#a1a7b7]">
              Simulation only
            </span>
          </div>
        </div>

        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 pb-3 sm:px-8"
        >
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={
                activeTab === item.id
                  ? "page"
                  : undefined
              }
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-[#252037] text-violet-200"
                  : "text-[#9096a8] hover:bg-[#191d29] hover:text-white"
              }`}
            >
              <span className="mr-2 text-base">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8">
        {marketsError && (
          <p
            role="alert"
            className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-300"
          >
            {marketsError} Refresh the page to
            retry market discovery.
          </p>
        )}

        {activeTab === "overview" && (
          <div className="space-y-10">
            <section className="grid items-center gap-8 lg:grid-cols-[1fr_0.85fr] lg:gap-12">
              <div className="py-5">
                <Eyebrow>
                  PERPL RISKLAB
                </Eyebrow>

                <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                  Understand the risk
                  <span className="block text-violet-400">
                    before the trade.
                  </span>
                </h1>

                <p className="mt-6 max-w-lg text-base leading-8 text-[#a1a7b7]">
                  Practice perpetual trading with virtual
                  positions, Perpl market data, and simple
                  risk simulations.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <PrimaryButton
                    onClick={() => navigate("trade")}
                  >
                    Start paper trading
                    <span aria-hidden="true">↗</span>
                  </PrimaryButton>

                  <SecondaryButton
                    onClick={() => navigate("risk")}
                  >
                    Explore Risk Lab
                  </SecondaryButton>
                </div>

                <p className="mt-5 text-xs text-[#777e90]">
                  No wallet · No deposits · No real trades
                </p>
              </div>

              <div className="risklab-card overflow-hidden p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Eyebrow>
                      MARKET SNAPSHOT
                    </Eyebrow>

                    <h2 className="mt-3 text-xl font-semibold">
                      {selectedMarketLabel}
                    </h2>

                    <p className="mt-1 text-sm text-[#858b9d]">
                      Perpl mark price
                    </p>
                  </div>

                  <span className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
                    Perpetual
                  </span>
                </div>

                <div className="mt-9">
                  <p className="risklab-number break-all text-3xl font-semibold sm:text-4xl">
                    {marketPrice}
                  </p>

                  <p className="mt-3 text-xs text-[#858b9d]">
                    {error
                      ? "Connection delayed — showing last received data"
                      : connected
                        ? "Market reference updates every 5 seconds"
                        : "Waiting for market data"}
                  </p>
                </div>

                <div className="risklab-divider my-7" />

                <div className="grid grid-cols-2 gap-x-5 gap-y-6">
                  <CompactMetric
                    label="Last"
                    value={
                      currentMarket
                        ? displayPrice(
                            currentMarket.last,
                            currentMarket.decimals
                          )
                        : "—"
                    }
                  />

                  <CompactMetric
                    label="Mid"
                    value={
                      currentMarket
                        ? displayPrice(
                            currentMarket.mid,
                            currentMarket.decimals
                          )
                        : "—"
                    }
                  />

                  <CompactMetric
                    label="Best bid"
                    value={
                      currentMarket
                        ? displayPrice(
                            currentMarket.bid,
                            currentMarket.decimals
                          )
                        : "—"
                    }
                  />

                  <CompactMetric
                    label="Best ask"
                    value={
                      currentMarket
                        ? displayPrice(
                            currentMarket.ask,
                            currentMarket.decimals
                          )
                        : "—"
                    }
                  />
                </div>

                {lastUpdated && (
                  <p className="mt-7 text-xs text-[#747c8e]">
                    Last received:{" "}
                    {lastUpdated.toLocaleTimeString()}
                  </p>
                )}

                {error && (
                  <p
                    role="alert"
                    className="mt-3 text-xs text-amber-300"
                  >
                    {error}
                  </p>
                )}
              </div>
            </section>

            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <Eyebrow>
                    YOUR WORKSPACE
                  </Eyebrow>

                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Explore RiskLab
                  </h2>
                </div>

                <p className="max-w-md text-sm text-[#858b9d]">
                  Three simple ways to build your understanding.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FeatureCard
                  number="01"
                  icon="↗"
                  title="Paper Trade"
                  description="Create a virtual position and follow its performance."
                  action="Open trading workspace"
                  onClick={() => navigate("trade")}
                />

                <FeatureCard
                  number="02"
                  icon="◇"
                  title="Risk Lab"
                  description="Explore price moves, liquidation, funding, volatility, and FOMO."
                  action="Explore risk tools"
                  onClick={() => navigate("risk")}
                />

                <FeatureCard
                  number="03"
                  icon="◎"
                  title="Learn"
                  description="Understand perpetual trading concepts with simple examples."
                  action="Browse lessons"
                  onClick={() => navigate("learn")}
                />
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#242837] pt-6">
              <p className="text-sm text-[#a1a7b7]">
                Learn → Practice → Analyze
              </p>

              <p className="text-xs text-[#747c8e]">
                Built for exploration, not execution.
              </p>
            </div>
          </div>
        )}

        {activeTab === "trade" && (
          <div className="space-y-7">
            <PageHeading
              eyebrow="PAPER TRADING"
              title="Practice without the pressure."
              description={`Build a virtual ${selectedMarketLabel} position and explore how market movement changes its estimated value.`}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#292e3d] bg-[#12151f] px-5 py-4">
              <div>
                <p className="text-xs text-[#858b9d]">
                  {selectedMarketLabel} · Mark price
                </p>

                <p className="risklab-number mt-1 text-xl font-semibold">
                  {marketPrice}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-[#858b9d]">
                  Market status
                </p>

                <p className="mt-1 text-sm text-[#a1a7b7]">
                  {error
                    ? "Delayed"
                    : connected
                      ? "Updating every 5 seconds"
                      : "Connecting"}
                </p>
              </div>
            </div>

            {error && <MarketWarning />}

            {currentMarket && !error ? (
              <VirtualTrade
                key={selectedMarketLabel}
                markPrice={currentMarket.mark}
                market={currentMarket.market}
                decimals={currentMarket.decimals}
                view="trade"
              />
            ) : (
              <LoadingPanel />
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#242837] pt-6">
              <p className="max-w-xl text-sm leading-6 text-[#858b9d]">
                Your position is virtual. Estimated P&L
                excludes fees, funding, slippage, and
                liquidation.
              </p>

              <SecondaryButton
                onClick={() => navigate("risk")}
              >
                Continue to Risk Lab →
              </SecondaryButton>
            </div>
          </div>
        )}

        {activeTab === "risk" && (
          <div className="space-y-7">
            <PageHeading
              eyebrow="RISK ANALYSIS"
              title="Explore what could happen."
              description={`Explore scenarios for ${selectedMarketLabel}. Choose one risk tool at a time.`}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#292e3d] bg-[#12151f] px-5 py-4">
              <div>
                <p className="text-xs text-[#858b9d]">
                  Market reference · {selectedMarketLabel}
                </p>

                <p className="risklab-number mt-1 text-xl font-semibold">
                  {marketPrice}
                </p>
              </div>

              <span className="text-xs text-[#858b9d]">
                Educational scenarios · No real orders
              </span>
            </div>

            {error && <MarketWarning />}

            {currentMarket && !error ? (
              <VirtualTrade
                key={selectedMarketLabel}
                markPrice={currentMarket.mark}
                market={currentMarket.market}
                decimals={currentMarket.decimals}
                view="risk"
              />
            ) : (
              <LoadingPanel />
            )}

            <p className="border-t border-[#242837] pt-6 text-sm leading-7 text-[#858b9d]">
              All scenarios are illustrative.
              Liquidation estimates use simplified
              assumptions and are not official Perpl
              liquidation calculations.
            </p>
          </div>
        )}

        {activeTab === "learn" && (
          <div className="space-y-8">
            <PageHeading
              eyebrow="LEARN"
              title="Get comfortable with the basics."
              description="Straightforward explanations of perpetual trading. Choose a topic to see what it means and how it works."
            />

            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <section
                aria-label="Learning topics"
                className="risklab-card p-3"
              >
                <div className="px-3 pb-3 pt-3">
                  <Eyebrow>TOPICS</Eyebrow>
                </div>

                <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
                  {topics.map((topic, index) => (
                    <button
                      key={topic.title}
                      type="button"
                      onClick={() =>
                        setSelectedTopic(index)
                      }
                      aria-pressed={
                        selectedTopic === index
                      }
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                        selectedTopic === index
                          ? "bg-[#28223b] font-semibold text-violet-200"
                          : "text-[#a1a7b7] hover:bg-[#202534] hover:text-white"
                      }`}
                    >
                      <span>{topic.title}</span>

                      <span className="text-xs opacity-60">
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <article className="risklab-card flex min-h-[390px] flex-col p-6 sm:p-9">
                <div className="flex items-center justify-between gap-4">
                  <Eyebrow>
                    CONCEPT EXPLAINED
                  </Eyebrow>

                  <span className="text-xs text-[#747c8e]">
                    {String(
                      selectedTopic + 1
                    ).padStart(2, "0")}{" "}
                    / {topics.length}
                  </span>
                </div>

                <h2 className="mt-8 text-3xl font-semibold tracking-tight">
                  {topics[selectedTopic].title}
                </h2>

                <p className="mt-5 max-w-2xl text-base leading-8 text-[#a1a7b7]">
                  {topics[selectedTopic].description}
                </p>

                <div className="mt-9 rounded-2xl border border-[#292e3d] bg-[#191d29] p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-300">
                    Simple example
                  </p>

                  <p className="mt-3 text-sm leading-7 text-[#c2c6d2]">
                    {topics[selectedTopic].example}
                  </p>
                </div>

                <div className="mt-auto flex flex-wrap justify-between gap-3 pt-9">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTopic((current) =>
                        Math.max(0, current - 1)
                      )
                    }
                    disabled={selectedTopic === 0}
                    className="rounded-xl border border-[#303545] px-5 py-3 text-sm text-[#c2c6d2] transition-colors hover:bg-[#202534] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ← Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTopic((current) =>
                        Math.min(
                          topics.length - 1,
                          current + 1
                        )
                      )
                    }
                    disabled={
                      selectedTopic ===
                      topics.length - 1
                    }
                    className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next topic →
                  </button>
                </div>
              </article>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#242837] pt-6">
              <p className="text-sm text-[#858b9d]">
                Ready to explore these concepts in action?
              </p>

              <SecondaryButton
                onClick={() => navigate("trade")}
              >
                Try Paper Trading →
              </SecondaryButton>
            </div>
          </div>
        )}

        <footer className="mt-16 flex flex-col justify-between gap-5 border-t border-[#242837] pt-7 sm:flex-row">
          <div>
            <p className="text-sm font-semibold">
              Perpl{" "}
              <span className="text-violet-400">
                RiskLab
              </span>
            </p>

            <p className="mt-2 text-xs text-[#747c8e]">
              Learn risk. Trade virtually.
            </p>
          </div>

          <p className="max-w-xl text-xs leading-6 text-[#747c8e]">
            Educational simulation only. No wallet,
            deposits, or real orders. Virtual P&L
            excludes fees, funding, slippage, and
            liquidation mechanics. Risk estimates are
            simplified and are not official Perpl
            liquidation calculations.
          </p>
        </footer>
      </div>
    </main>
  );
}

function Eyebrow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.17em] text-violet-400">
      {children}
    </p>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <Eyebrow>{eyebrow}</Eyebrow>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>

      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#a1a7b7] sm:text-base">
        {description}
      </p>
    </div>
  );
}

function CompactMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[#858b9d]">
        {label}
      </p>

      <p className="risklab-number mt-2 break-all text-sm font-medium text-[#e5e7ed] sm:text-base">
        {value}
      </p>
    </div>
  );
}

function FeatureCard({
  number,
  icon,
  title,
  description,
  action,
  onClick,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="risklab-card-interactive group flex min-h-[235px] flex-col p-6 text-left sm:p-7"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-xl text-violet-300">
          {icon}
        </span>

        <span className="text-xs text-[#747c8e]">
          {number}
        </span>
      </div>

      <h3 className="mt-7 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-2 max-w-xs text-sm leading-6 text-[#a1a7b7]">
        {description}
      </p>

      <span className="mt-auto pt-6 text-sm font-medium text-violet-300">
        {action}{" "}
        <span
          aria-hidden="true"
          className="inline-block transition-transform group-hover:translate-x-1"
        >
          →
        </span>
      </span>
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-3 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-3 rounded-xl border border-[#34394a] bg-[#151924] px-6 py-3 text-sm font-medium text-[#e5e7ed] transition-colors hover:bg-[#202534]"
    >
      {children}
    </button>
  );
}

function MarketWarning() {
  return (
    <p
      role="alert"
      className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-300"
    >
      Market data is delayed. The last received mark
      price may be stale. Wait for the connection to
      recover before creating new simulations.
    </p>
  );
}

function LoadingPanel() {
  return (
    <div
      role="status"
      className="risklab-card p-8 text-sm text-[#a1a7b7]"
    >
      Waiting for Perpl market data...
    </div>
  );
}
