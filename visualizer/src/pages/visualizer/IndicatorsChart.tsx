import { Group, NumberInput, SegmentedControl } from '@mantine/core';
import Highcharts from 'highcharts/highstock';
import HighchartsHighContrastDarkTheme from 'highcharts/themes/high-contrast-dark';
import HighchartsReact from 'highcharts-react-official';
import merge from 'lodash/merge';
import { ReactNode, useMemo, useState } from 'react';
import { useActualColorScheme } from '../../hooks/use-actual-color-scheme.ts';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { getAskColor, getBidColor } from '../../utils/colors.ts';
import { computeEMA, computeSMA, computeZScore } from '../../utils/metrics.ts';
import { formatNumber } from '../../utils/format.ts';
import { VisualizerCard } from './VisualizerCard.tsx';

export interface IndicatorsChartProps {
  symbol: ProsperitySymbol;
}

type IndicatorMode = 'sma' | 'ema' | 'zscore' | 'all';

function getThemeOptions(theme: (highcharts: typeof Highcharts) => void): Highcharts.Options {
  const mock = {
    _modules: {
      'Core/Globals.js': { theme: null },
      'Core/Defaults.js': { setOptions: () => {} },
    },
    win: { dispatchEvent: () => {} },
  };
  theme(mock as any);
  return mock._modules['Core/Globals.js'].theme! as Highcharts.Options;
}

/**
 * Indicators chart using ONLY the simple market data (activity logs mid prices + bid/ask).
 *
 * Layout (when Z-score is enabled):
 *   ┌─ Price panel (75%): mid price, bid1/2/3, ask1/2/3, SMA, EMA ──┐
 *   └─ Z-Score panel (22%): rolling Z-score of mid price ────────────┘
 *
 * Z-score is computed exclusively on mid price — it measures how many standard
 * deviations the current mid price is away from its rolling mean.
 */
export function IndicatorsChart({ symbol }: IndicatorsChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const colorScheme = useActualColorScheme();
  const [mode, setMode] = useState<IndicatorMode>('all');
  const [period, setPeriod] = useState<number>(20);

  const rows = algorithm.activityLogs.filter(row => row.product === symbol);

  // ── Simple data: mid price only (source for ALL indicators) ──────────────────
  const midData: [number, number][] = rows
    .filter(row => row.midPrice !== 0 && !isNaN(row.midPrice))
    .map(row => [row.timestamp, row.midPrice]);

  // ── Simple data: bid/ask lines ────────────────────────────────────────────────
  const bid1: [number, number][] = [];
  const bid2: [number, number][] = [];
  const bid3: [number, number][] = [];
  const ask1: [number, number][] = [];
  const ask2: [number, number][] = [];
  const ask3: [number, number][] = [];

  for (const row of rows) {
    if (row.bidPrices[0] && row.bidPrices[0] !== 0) bid1.push([row.timestamp, row.bidPrices[0]]);
    if (row.bidPrices[1] && row.bidPrices[1] !== 0) bid2.push([row.timestamp, row.bidPrices[1]]);
    if (row.bidPrices[2] && row.bidPrices[2] !== 0) bid3.push([row.timestamp, row.bidPrices[2]]);
    if (row.askPrices[0] && row.askPrices[0] !== 0) ask1.push([row.timestamp, row.askPrices[0]]);
    if (row.askPrices[1] && row.askPrices[1] !== 0) ask2.push([row.timestamp, row.askPrices[1]]);
    if (row.askPrices[2] && row.askPrices[2] !== 0) ask3.push([row.timestamp, row.askPrices[2]]);
  }

  // ── Indicators (all computed on mid price only) ───────────────────────────────
  const sma = computeSMA(midData, period);
  const ema = computeEMA(midData, period);
  const zscore = computeZScore(midData, period); // rolling (mid - mean) / std

  const showSMA = mode === 'sma' || mode === 'all';
  const showEMA = mode === 'ema' || mode === 'all';
  const showZScore = mode === 'zscore' || mode === 'all';

  const options = useMemo((): Highcharts.Options => {
    const themeOptions = colorScheme === 'light' ? {} : getThemeOptions(HighchartsHighContrastDarkTheme);

    // ── Series for the price panel (yAxis 0) ─────────────────────────────────
    const priceSeries: Highcharts.SeriesOptionsType[] = [
      // Bid/ask lines (simple market data) — always shown in price panel
      { type: 'line', name: 'Bid 1', color: getBidColor(1.0), data: bid1, marker: { enabled: false }, yAxis: 0, enableMouseTracking: true, lineWidth: 1 },
      { type: 'line', name: 'Bid 2', color: getBidColor(0.65), data: bid2, marker: { enabled: false }, yAxis: 0, enableMouseTracking: true, lineWidth: 1, dashStyle: 'ShortDash' },
      { type: 'line', name: 'Bid 3', color: getBidColor(0.4), data: bid3, marker: { enabled: false }, yAxis: 0, enableMouseTracking: true, lineWidth: 1, dashStyle: 'Dot' },
      { type: 'line', name: 'Ask 1', color: getAskColor(1.0), data: ask1, marker: { enabled: false }, yAxis: 0, enableMouseTracking: true, lineWidth: 1 },
      { type: 'line', name: 'Ask 2', color: getAskColor(0.65), data: ask2, marker: { enabled: false }, yAxis: 0, enableMouseTracking: true, lineWidth: 1, dashStyle: 'ShortDash' },
      { type: 'line', name: 'Ask 3', color: getAskColor(0.4), data: ask3, marker: { enabled: false }, yAxis: 0, enableMouseTracking: true, lineWidth: 1, dashStyle: 'Dot' },
      // Mid price
      { type: 'line', name: 'Mid Price', color: 'rgba(120,120,120,0.6)', dashStyle: 'Dash', data: midData, marker: { enabled: false }, yAxis: 0, lineWidth: 1.5 },
    ];

    if (showSMA) {
      priceSeries.push({
        type: 'line', name: `SMA(${period})`, color: '#3b82f6',
        data: sma, marker: { enabled: false }, yAxis: 0, lineWidth: 2,
      });
    }
    if (showEMA) {
      priceSeries.push({
        type: 'line', name: `EMA(${period})`, color: '#8b5cf6',
        data: ema, marker: { enabled: false }, yAxis: 0, lineWidth: 2,
      });
    }

    // ── Z-score series goes in its own sub-pane (yAxis 1) ────────────────────
    if (showZScore) {
      priceSeries.push({
        type: 'line', name: `Z-Score(${period}) — mid price only`, color: '#f59e0b',
        data: zscore, marker: { enabled: false }, yAxis: 1, lineWidth: 2,
      } as any);
    }

    // ── Axis layout ───────────────────────────────────────────────────────────
    const yAxisConfig: Highcharts.YAxisOptions[] = [
      {
        // Price panel
        opposite: false,
        labels: { align: 'right', x: -3 },
        title: { text: 'Price' },
        height: showZScore ? '72%' : '100%',
        lineWidth: 2,
        resize: { enabled: true },
      },
    ];

    if (showZScore) {
      yAxisConfig.push({
        // Z-score sub-pane
        opposite: false,
        labels: { align: 'right', x: -3 },
        title: { text: 'Z-Score (σ)' },
        top: '75%',
        height: '25%',
        offset: 0,
        lineWidth: 2,
        plotLines: [
          { value: 0, color: 'gray', dashStyle: 'Dash', width: 1, zIndex: 5 },
          { value: 2, color: getAskColor(0.7), dashStyle: 'ShortDash', width: 1, zIndex: 5, label: { text: '+2σ', style: { color: getAskColor(0.9) } } },
          { value: -2, color: getBidColor(0.7), dashStyle: 'ShortDash', width: 1, zIndex: 5, label: { text: '−2σ', style: { color: getBidColor(0.9) } } },
        ],
      });
    }

    const indicatorLabel =
      mode === 'all' ? `SMA/EMA/Z-Score (period=${period})`
      : mode === 'sma' ? `SMA(${period})`
      : mode === 'ema' ? `EMA(${period})`
      : `Z-Score(${period})`;

    const chartOptions: Highcharts.Options = {
      chart: {
        animation: false,
        height: showZScore ? 480 : 400,
        zooming: { type: 'x' },
        panning: { enabled: true, type: 'x' },
        panKey: 'shift',
        numberFormatter: formatNumber,
      },
      title: { text: `${symbol} — ${indicatorLabel} (simple data · mid price)` },
      credits: { href: 'javascript:window.open("https://www.highcharts.com/?credits","_blank")' },
      plotOptions: {
        series: {
          dataGrouping: { enabled: false },
        },
      },
      xAxis: {
        type: 'datetime',
        crosshair: { width: 1 },
        labels: { formatter: params => formatNumber(params.value as number) },
        title: { text: 'Timestamp' },
      },
      yAxis: yAxisConfig,
      tooltip: { split: false, shared: true, outside: true },
      legend: { enabled: true },
      rangeSelector: { enabled: false },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
      series: priceSeries,
    };

    return merge(themeOptions, chartOptions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorScheme, mode, period, symbol, midData.length]);

  const controls = (
    <Group gap="md" align="flex-end">
      <SegmentedControl
        size="xs"
        value={mode}
        onChange={value => setMode(value as IndicatorMode)}
        data={[
          { label: 'All', value: 'all' },
          { label: 'SMA', value: 'sma' },
          { label: 'EMA', value: 'ema' },
          { label: 'Z-Score', value: 'zscore' },
        ]}
      />
      <NumberInput
        label="Period"
        value={period}
        onChange={v => setPeriod(Number(v) || 20)}
        min={2}
        max={500}
        size="xs"
        w={90}
      />
    </Group>
  );

  return (
    <VisualizerCard p={0}>
      <div style={{ padding: '16px 16px 0' }}>{controls}</div>
      <HighchartsReact highcharts={Highcharts} constructorType="stockChart" options={options} immutable />
    </VisualizerCard>
  );
}
