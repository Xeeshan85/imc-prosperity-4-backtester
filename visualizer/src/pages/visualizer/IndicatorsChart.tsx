import { Group, NumberInput, SegmentedControl } from '@mantine/core';
import Highcharts from 'highcharts';
import { ReactNode, useState } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { computeEMA, computeSMA, computeZScore } from '../../utils/metrics.ts';
import { Chart } from './Chart.tsx';

export interface IndicatorsChartProps {
  symbol: ProsperitySymbol;
}

type IndicatorMode = 'sma' | 'ema' | 'zscore' | 'all';

/**
 * Indicators chart using the simple market data (activity logs mid prices).
 * Displays SMA, EMA, and Z-score overlaid on the mid-price series.
 */
export function IndicatorsChart({ symbol }: IndicatorsChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const [mode, setMode] = useState<IndicatorMode>('all');
  const [period, setPeriod] = useState<number>(20);

  const rows = algorithm.activityLogs.filter(row => row.product === symbol);
  const midData: [number, number][] = rows
    .filter(row => row.midPrice !== 0 && !isNaN(row.midPrice))
    .map(row => [row.timestamp, row.midPrice]);

  const sma = computeSMA(midData, period);
  const ema = computeEMA(midData, period);
  const zscore = computeZScore(midData, period);

  const showSMA = mode === 'sma' || mode === 'all';
  const showEMA = mode === 'ema' || mode === 'all';
  const showZScore = mode === 'zscore' || mode === 'all';

  if (showZScore && !showSMA && !showEMA) {
    // Z-score only — use its own y-axis without the price series
    const series: Highcharts.SeriesOptionsType[] = [
      {
        type: 'line',
        name: `Z-Score (${period})`,
        color: '#f59e0b',
        data: zscore,
        marker: { enabled: false },
      },
    ];

    const zeroLine: Highcharts.YAxisPlotLinesOptions = { value: 0, color: 'gray', dashStyle: 'Dash', width: 1 };
    const twoLine: Highcharts.YAxisPlotLinesOptions = { value: 2, color: '#c0392b', dashStyle: 'ShortDash', width: 1, label: { text: '+2σ' } };
    const negTwoLine: Highcharts.YAxisPlotLinesOptions = { value: -2, color: '#27ae60', dashStyle: 'ShortDash', width: 1, label: { text: '−2σ' } };

    return (
      <Chart
        title={`${symbol} — Z-Score (${period}) (simple data)`}
        series={series}
        yAxisTitle="Z-Score (σ)"
        options={{ yAxis: { plotLines: [zeroLine, twoLine, negTwoLine], allowDecimals: true } }}
        controls={<Controls mode={mode} setMode={setMode} period={period} setPeriod={setPeriod} />}
      />
    );
  }

  // Mixed / price + overlays mode
  const series: Highcharts.SeriesOptionsType[] = [
    {
      type: 'line',
      name: 'Mid Price',
      color: 'rgba(100,100,100,0.5)',
      dashStyle: 'Dot',
      data: midData,
      marker: { enabled: false },
      enableMouseTracking: false,
    },
  ];

  if (showSMA) {
    series.push({
      type: 'line',
      name: `SMA(${period})`,
      color: '#3b82f6',
      data: sma,
      marker: { enabled: false },
    });
  }

  if (showEMA) {
    series.push({
      type: 'line',
      name: `EMA(${period})`,
      color: '#8b5cf6',
      data: ema,
      marker: { enabled: false },
    });
  }

  if (showZScore) {
    series.push({
      type: 'line',
      name: `Z-Score(${period})`,
      color: '#f59e0b',
      data: zscore,
      marker: { enabled: false },
      yAxis: 1,
    } as any);
  }

  const yAxes: Highcharts.YAxisOptions[] = [
    { opposite: false, title: { text: 'Price' } },
  ];

  if (showZScore) {
    yAxes.push({
      opposite: true,
      title: { text: 'Z-Score (σ)' },
      plotLines: [
        { value: 0, color: 'gray', dashStyle: 'Dash', width: 1 },
        { value: 2, color: '#c0392b', dashStyle: 'ShortDash', width: 1 },
        { value: -2, color: '#27ae60', dashStyle: 'ShortDash', width: 1 },
      ],
    });
  }

  const indicatorLabel =
    mode === 'all'
      ? `SMA/EMA/Z-Score (${period})`
      : mode === 'sma'
        ? `SMA(${period})`
        : mode === 'ema'
          ? `EMA(${period})`
          : `Z-Score(${period})`;

  return (
    <Chart
      title={`${symbol} — ${indicatorLabel} (simple data)`}
      series={series}
      options={{ yAxis: yAxes }}
      controls={<Controls mode={mode} setMode={setMode} period={period} setPeriod={setPeriod} />}
    />
  );
}

function Controls({
  mode,
  setMode,
  period,
  setPeriod,
}: {
  mode: IndicatorMode;
  setMode: (m: IndicatorMode) => void;
  period: number;
  setPeriod: (p: number) => void;
}): ReactNode {
  return (
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
}
