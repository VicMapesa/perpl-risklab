# Perpl RiskLab

**Learn risk. Trade virtually.**

Perpl RiskLab is an educational perpetual futures risk simulator built for the **Monad Metropolis hackathon**. It combines live public market data from Perpl with virtual paper trading and interactive risk-analysis tools.

The goal is simple: help users understand leveraged trading risks before considering real trades.

**Live demo:** https://perpl-risklab.vercel.app  
**GitHub:** https://github.com/VicMapesa/perpl-risklab

## Features

### 1. Live Perpl Market Data

Explore 11 perpetual futures markets:

BTC, MON, ETH, SOL, HYPE, ZEC, LIT, VVV, PUMP, NEAR, and UNI.

The app displays Perpl market reference data, including mark price, last price, mid price, best bid, and best ask. The selected market's reference data refreshes approximately every five seconds.

### 2. Virtual Paper Trading

Practice opening LONG and SHORT positions without connecting a wallet or using real money.

- Choose virtual collateral and leverage from 1× to 10×.
- Calculate simulated position exposure and quantity.
- Track unrealized profit and loss (P&L).
- View return on collateral and hypothetical equity.
- Store separate virtual positions for different markets in browser localStorage.
- Close virtual positions whenever you choose.

No real trades or blockchain transactions are executed.

### 3. Risk Lab

Five educational tools help users explore different trading risks.

**Price Stress**

Simulate hypothetical price changes and see how they affect a virtual position's P&L, collateral return, and equity.

**Liquidation Risk**

Explore how adverse price movements and illustrative maintenance-margin assumptions can affect a position's margin buffer.

The liquidation model is simplified. Its risk threshold is not an official Perpl liquidation price.

**Funding Analysis**

Inspect funding information from Perpl's public market data and estimate the magnitude of a funding payment for a virtual position.

Actual funding direction, timing, and payments depend on exchange mechanics and changing market conditions.

**Volatility Analysis**

Analyze historical five-minute market candles to explore price changes, trading ranges, and estimated volatility.

The displayed 24-hour-scaled volatility is a statistical estimate, not a forecast.

**FOMO Check**

Review recent market movements and explore a hypothetical pullback after a price rally. See how that scenario could affect leveraged virtual exposure.

### 4. Learn

Beginner-friendly lessons explain:

- LONG and SHORT positions
- Leverage
- Collateral
- Liquidation
- Funding
- Volatility
- Fear of missing out (FOMO)
- Mark price
- Unrealized P&L

## How It Works

Perpl RiskLab uses public Perpl market-data endpoints through server-side Next.js API routes.

The application uses market reference data for virtual position calculations and historical candles for volatility and FOMO analysis.

Virtual positions are stored locally in the user's browser. There is no wallet connection, real order execution, deposit handling, or custody of funds.

### Main Application Routes

| Route | Purpose |
|---|---|
| `/api/market` | Market discovery and reference prices |
| `/api/funding` | Public funding data |
| `/api/volatility` | Historical-candle volatility analysis |
| `/api/fomo` | Recent price movement analysis |

## Technology Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Perpl public market-data APIs
- Browser localStorage for virtual positions
- Vercel for deployment

## Run Locally

### Requirements

- Node.js
- npm

### Installation

Clone the repository:

```bash
git clone https://github.com/VicMapesa/perpl-risklab.git
cd perpl-risklab
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

To verify the production build:

```bash
npm run build
```

An internet connection is required to retrieve public Perpl market data.

## Suggested Demo Flow

1. Open the Overview page and show the live Perpl market snapshot.
2. Switch between MON-PERP and BTC-PERP.
3. Open a virtual LONG or SHORT position in Paper Trade.
4. Demonstrate how mark-price changes affect unrealized P&L.
5. Open Risk Lab and demonstrate Price Stress and Liquidation Risk.
6. Explore Funding, Volatility, and FOMO Check.
7. Visit Learn to explain the underlying trading concepts.
8. Emphasize that the application is educational and executes no real orders.

## Limitations

Perpl RiskLab is an educational simulation, not a trading terminal.

- Virtual P&L calculations exclude trading fees, funding payments, slippage, and liquidation mechanics.
- Liquidation scenarios use simplified, adjustable assumptions rather than Perpl's official liquidation engine.
- Historical statistics depend on the availability and quality of public market candles.
- Funding estimates are illustrative and are not actual account charges or credits.
- Virtual positions are stored in browser localStorage and are not synchronized to an account or wallet.
- Market data can be delayed or temporarily unavailable.
- No real-money trading functionality is provided.

## Hackathon

Built for the **Monad Metropolis hackathon**, exploring how Perpl market data can power accessible, interactive trading-risk education.

## Disclaimer

This project is for educational and demonstration purposes only. It is not a trading platform, investment recommendation, or financial advisory service.

This is general information only and not financial advice. For personal guidance, please talk to a licensed professional.