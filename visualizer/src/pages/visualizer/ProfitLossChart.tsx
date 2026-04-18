import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

export interface ProfitLossChartProps {
  symbols: string[];
}

export function ProfitLossChart({ symbols }: ProfitLossChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;

  const dataByTimestamp = new Map<number, number>();
  for (const row of algorithm.activityLogs) {
    const cur = dataByTimestamp.get(row.timestamp) ?? 0;
    dataByTimestamp.set(row.timestamp, cur + row.profitLoss);
  }

  const series: Highcharts.SeriesOptionsType[] = [
    {
      type: 'line',
      name: 'Total',
      data: [...dataByTimestamp.keys()].map(timestamp => [timestamp, dataByTimestamp.get(timestamp)]),
    },
  ];

  symbols.forEach(symbol => {
    const data: [number, number][] = [];
    for (const row of algorithm.activityLogs) {
      if (row.product === symbol) data.push([row.timestamp, row.profitLoss]);
    }
    series.push({ type: 'line', name: symbol, data, dashStyle: 'Dash' });
  });

  return <Chart title="Profit / Loss" series={series} />;
}
