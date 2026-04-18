# IMC Prosperity 4 Backtester Visualizer

An enhanced React/TypeScript visualizer for `prosperity4bt` backtest logs, inspired by the
[imc-prosperity-4-visualizer](../imc-prosperity-4-visualizer).

## Features

- **Backtest log loading** — supports the text `.log` format from `prosperity4bt` and the JSON format from the Prosperity API
- **Candlestick chart** (simple market data) — price movement, price levels, and volume from activity logs
- **Order Book chart** (algo trade data) — filled/unfilled buy/sell orders overlaid on mid/bid-ask prices; requires the Logger boilerplate
- **Indicators chart** (SMA / EMA / Z-score) — computed from the simple mid-price series (activity logs); configurable period
- **Performance Metrics card** — Sharpe ratio, Sortino ratio, max drawdown, win rate, profit factor, avg return, etc.
- **Monte Carlo results** — load a `session_summary.csv` (from the Rust Monte Carlo engine) or a `dashboard.json` (from `prosperity4mcbt`) to view P&L distribution histogram, CDF, session scatter, and summary statistics

## Quick start

```bash
cd visualizer
npm install
npm run dev        # starts Vite at http://localhost:5173
```

Then run your backtest normally:

```bash
prosperity4bt your_algo.py 1          # saves to backtests/<timestamp>.log
prosperity4bt your_algo.py 1 --vis    # saves log and tries to open this visualizer
```

Drag-and-drop the generated `.log` file onto the **Load backtest log** card.

## Monte Carlo

```bash
# From imc-prosperity-4/ root:
prosperity4mcbt your_algo.py --sessions 500

# Then in the visualizer, load the generated session_summary.csv or dashboard.json
```

## Build (static)

```bash
npm run build     # output in dist/
```

The `--vis` flag in `prosperity4bt` will automatically open the local dev server (port 5173) or the built `dist/index.html` if available, falling back to the upstream jmerle visualizer.
