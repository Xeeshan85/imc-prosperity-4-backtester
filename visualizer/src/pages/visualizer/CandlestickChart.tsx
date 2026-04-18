import { Group, SegmentedControl, Select } from '@mantine/core';
import Highcharts from 'highcharts';
import { ReactNode, useState } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { getAskColor, getBidColor } from '../../utils/colors.ts';
import { Chart } from './Chart.tsx';

export interface CandlestickChartProps {
  symbol: ProsperitySymbol;
}

const GROUP_SIZE_OPTIONS = [
  { value: '1', label: '1 tick' },
  { value: '5', label: '5 ticks' },
  { value: '10', label: '10 ticks' },
  { value: '25', label: '25 ticks' },
  { value: '50', label: '50 ticks' },
  { value: '100', label: '100 ticks' },
];

function defaultGroupSize(timestampCount: number): string {
  if (timestampCount >= 10000) return '100';
  return '10';
}

type ViewMode = 'movement' | 'price' | 'volume';

export function CandlestickChart({ symbol }: CandlestickChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const [viewMode, setViewMode] = useState<ViewMode>('movement');

  const rows = algorithm.activityLogs.filter(row => row.product === symbol);
  const [groupSize, setGroupSize] = useState(() => defaultGroupSize(rows.length));
  const size = parseInt(groupSize);

  const isValidPrice = (p: number): boolean => p !== 0 && !isNaN(p);

  let series: Highcharts.SeriesOptionsType[] = [];
  let title = '';

  if (viewMode === 'movement') {
    title = `${symbol} — Price Movement (simple data)`;
    const candleData: [number, number, number, number, number][] = [];

    for (let i = 0; i < rows.length; i += size) {
      const group = rows.slice(i, i + size);
      if (group.length === 0) continue;

      const timestamp = group[0].timestamp;
      const open = group[0].midPrice;
      const close = group[group.length - 1].midPrice;
      if (!isValidPrice(open) || !isValidPrice(close)) continue;

      let high = -Infinity;
      let low = Infinity;

      for (const row of group) {
        if (row.askPrices.length > 0 && isValidPrice(row.askPrices[0])) high = Math.max(high, row.askPrices[0]);
        if (isValidPrice(row.midPrice)) high = Math.max(high, row.midPrice);
        if (row.bidPrices.length > 0 && isValidPrice(row.bidPrices[0])) low = Math.min(low, row.bidPrices[0]);
        if (isValidPrice(row.midPrice)) low = Math.min(low, row.midPrice);
      }

      if (high === -Infinity || low === Infinity) continue;
      candleData.push([timestamp, open, high, low, close]);
    }

    series = [
      {
        type: 'candlestick',
        name: symbol,
        data: candleData,
        color: getAskColor(1.0),
        upColor: getBidColor(1.0),
        lineColor: getAskColor(1.0),
        upLineColor: getBidColor(1.0),
        dataGrouping: { enabled: false },
      } as Highcharts.SeriesCandlestickOptions,
    ];
  } else if (viewMode === 'price') {
    title = `${symbol} — Price (simple data)`;
    const priceSeries: Highcharts.SeriesOptionsType[] = [
      { type: 'line', name: 'Bid 3', color: getBidColor(0.5), marker: { symbol: 'square' }, data: [] },
      { type: 'line', name: 'Bid 2', color: getBidColor(0.75), marker: { symbol: 'circle' }, data: [] },
      { type: 'line', name: 'Bid 1', color: getBidColor(1.0), marker: { symbol: 'triangle' }, data: [] },
      { type: 'line', name: 'Mid price', color: 'gray', dashStyle: 'Dash', marker: { symbol: 'diamond' }, data: [] },
      { type: 'line', name: 'Ask 1', color: getAskColor(1.0), marker: { symbol: 'triangle-down' }, data: [] },
      { type: 'line', name: 'Ask 2', color: getAskColor(0.75), marker: { symbol: 'circle' }, data: [] },
      { type: 'line', name: 'Ask 3', color: getAskColor(0.5), marker: { symbol: 'square' }, data: [] },
    ];

    for (const row of rows) {
      for (let i = 0; i < row.bidPrices.length; i++) {
        if (isValidPrice(row.bidPrices[i])) (priceSeries[2 - i] as any).data.push([row.timestamp, row.bidPrices[i]]);
      }
      if (isValidPrice(row.midPrice)) (priceSeries[3] as any).data.push([row.timestamp, row.midPrice]);
      for (let i = 0; i < row.askPrices.length; i++) {
        if (isValidPrice(row.askPrices[i])) (priceSeries[i + 4] as any).data.push([row.timestamp, row.askPrices[i]]);
      }
    }
    series = priceSeries;
  } else {
    title = `${symbol} — Volume (simple data)`;
    const volumeSeries: Highcharts.SeriesOptionsType[] = [
      { type: 'column', name: 'Bid 3', color: getBidColor(0.5), data: [] },
      { type: 'column', name: 'Bid 2', color: getBidColor(0.75), data: [] },
      { type: 'column', name: 'Bid 1', color: getBidColor(1.0), data: [] },
      { type: 'column', name: 'Ask 1', color: getAskColor(1.0), data: [] },
      { type: 'column', name: 'Ask 2', color: getAskColor(0.75), data: [] },
      { type: 'column', name: 'Ask 3', color: getAskColor(0.5), data: [] },
    ];

    for (const row of rows) {
      for (let i = 0; i < row.bidVolumes.length; i++) (volumeSeries[2 - i] as any).data.push([row.timestamp, row.bidVolumes[i]]);
      for (let i = 0; i < row.askVolumes.length; i++) (volumeSeries[i + 3] as any).data.push([row.timestamp, row.askVolumes[i]]);
    }
    series = volumeSeries;
  }

  const controls = (
    <Group justify="space-between">
      <SegmentedControl
        size="xs"
        value={viewMode}
        onChange={value => setViewMode(value as ViewMode)}
        data={[
          { label: 'Movement', value: 'movement' },
          { label: 'Price', value: 'price' },
          { label: 'Volume', value: 'volume' },
        ]}
      />
      {viewMode === 'movement' && (
        <Select
          label="Candle size"
          data={GROUP_SIZE_OPTIONS}
          value={groupSize}
          onChange={val => val && setGroupSize(val)}
          size="xs"
          w={120}
        />
      )}
    </Group>
  );

  return <Chart title={title} series={series} controls={controls} />;
}
