import { ActivityLogRow } from '../models.ts';

export interface BacktestMetrics {
  totalPnL: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  winRate: number;
  avgReturn: number;
  stdReturn: number;
  numTimesteps: number;
  positiveTimesteps: number;
  negativeTimesteps: number;
  peakPnL: number;
  minPnL: number;
  profitFactor: number;
}

/**
 * Compute per-timestamp total P&L (sum across all products).
 */
function buildPnLSeries(activityLogs: ActivityLogRow[]): [number, number][] {
  const byTimestamp = new Map<number, number>();
  for (const row of activityLogs) {
    const cur = byTimestamp.get(row.timestamp) ?? 0;
    byTimestamp.set(row.timestamp, cur + row.profitLoss);
  }

  const sorted = [...byTimestamp.entries()].sort((a, b) => a[0] - b[0]);
  return sorted;
}

/**
 * Compute financial metrics from activity logs using the backtester's P&L data.
 */
export function computeMetrics(activityLogs: ActivityLogRow[]): BacktestMetrics {
  const pnlSeries = buildPnLSeries(activityLogs);

  if (pnlSeries.length < 2) {
    return {
      totalPnL: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPct: 0,
      winRate: 0,
      avgReturn: 0,
      stdReturn: 0,
      numTimesteps: pnlSeries.length,
      positiveTimesteps: 0,
      negativeTimesteps: 0,
      peakPnL: 0,
      minPnL: 0,
      profitFactor: 0,
    };
  }

  const pnlValues = pnlSeries.map(([, v]) => v);

  // Compute step returns (changes in P&L)
  const returns: number[] = [];
  for (let i = 1; i < pnlValues.length; i++) {
    returns.push(pnlValues[i] - pnlValues[i - 1]);
  }

  const n = returns.length;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  // Downside deviation (Sortino — only negative returns contribute)
  const downsideVariance = returns.reduce((a, b) => a + (b < 0 ? b * b : 0), 0) / n;
  const downsideStd = Math.sqrt(downsideVariance);

  // Normalise to a "per-day" basis: the backtester runs at 100-unit intervals
  // for 10 000 steps per day, so sqrt(10000) = 100 gives a consistent daily rate
  // regardless of how many days are in the backtest.
  const STEPS_PER_DAY = 10_000;
  const annFactor = Math.sqrt(STEPS_PER_DAY);

  // Raw (un-scaled) ratio for reference
  const rawSharpe = std > 0 ? mean / std : 0;

  // Daily-equivalent Sharpe / Sortino
  const sharpeRatio = std > 0 ? rawSharpe * annFactor : 0;
  const sortinoRatio = downsideStd > 0 ? (mean / downsideStd) * annFactor : 0;

  // Max drawdown
  let peak = pnlValues[0];
  let maxDrawdown = 0;
  let peakPnL = pnlValues[0];
  for (const v of pnlValues) {
    if (v > peak) peak = v;
    if (v > peakPnL) peakPnL = v;
    const dd = peak - v;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Express drawdown relative to the absolute peak so it works even when peak ≤ 0
  const maxDrawdownPct = Math.abs(peak) > 1e-9 ? (maxDrawdown / Math.abs(peak)) * 100 : 0;
  const minPnL = Math.min(...pnlValues);

  // Win/loss stats
  const positiveTimesteps = returns.filter(r => r > 0).length;
  const negativeTimesteps = returns.filter(r => r < 0).length;
  const winRate = positiveTimesteps / n;

  // Profit factor
  const grossProfit = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  return {
    totalPnL: pnlValues[pnlValues.length - 1],
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    maxDrawdownPct,
    winRate,
    avgReturn: mean,
    stdReturn: std,
    numTimesteps: pnlValues.length,
    positiveTimesteps,
    negativeTimesteps,
    peakPnL,
    minPnL,
    profitFactor,
  };
}

// ── Indicator computations for IndicatorsChart ────────────────────────────────

export function computeSMA(data: [number, number][], period: number): [number, number][] {
  if (period <= 0 || data.length < period) return [];
  const result: [number, number][] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i][1];
    if (i >= period) sum -= data[i - period][1];
    if (i >= period - 1) result.push([data[i][0], sum / period]);
  }
  return result;
}

export function computeEMA(data: [number, number][], period: number): [number, number][] {
  if (period <= 0 || data.length === 0) return [];
  const k = 2 / (period + 1);
  const result: [number, number][] = [];
  let ema = data[0][1];
  for (const [x, y] of data) {
    ema = y * k + ema * (1 - k);
    result.push([x, ema]);
  }
  return result;
}

export function computeZScore(data: [number, number][], period: number): [number, number][] {
  if (period <= 1 || data.length < period) return [];
  const result: [number, number][] = [];
  for (let i = period - 1; i < data.length; i++) {
    const window = data.slice(i - period + 1, i + 1).map(([, y]) => y);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length;
    const std = Math.sqrt(variance);
    result.push([data[i][0], std > 0 ? (data[i][1] - mean) / std : 0]);
  }
  return result;
}

