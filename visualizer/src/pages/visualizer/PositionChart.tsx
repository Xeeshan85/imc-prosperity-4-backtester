import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { Algorithm, ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

const KNOWN_LIMITS: Record<string, number> = {
  TOMATOES: 80,
  EMERALDS: 80,
  ASH_COATED_OSMIUM: 80,
  INTARIAN_PEPPER_ROOT: 80,
};

function getLimit(algorithm: Algorithm, symbol: ProsperitySymbol): number {
  if (KNOWN_LIMITS[symbol] !== undefined) return KNOWN_LIMITS[symbol];

  const positions = algorithm.data.map(row => row.state.position[symbol] || 0);
  const minPosition = Math.min(...positions);
  const maxPosition = Math.max(...positions);
  return Math.max(Math.abs(minPosition), maxPosition) || 1;
}

export interface PositionChartProps {
  symbols: string[];
}

export function PositionChart({ symbols }: PositionChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;

  if (algorithm.data.length === 0) {
    return null;
  }

  const limits: Record<string, number> = {};
  for (const symbol of symbols) limits[symbol] = getLimit(algorithm, symbol);

  const data: Record<string, [number, number][]> = {};
  for (const symbol of symbols) data[symbol] = [];

  for (const row of algorithm.data) {
    for (const symbol of symbols) {
      const position = row.state.position[symbol] || 0;
      data[symbol].push([row.state.timestamp, (position / limits[symbol]) * 100]);
    }
  }

  const series: Highcharts.SeriesOptionsType[] = symbols.map((symbol, i) => ({
    type: 'line',
    name: symbol,
    data: data[symbol],
    colorIndex: (i + 1) % 10,
  }));

  return <Chart title="Positions (% of limit)" series={series} min={-100} max={100} />;
}
