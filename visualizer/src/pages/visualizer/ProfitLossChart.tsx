import { Button, Group, Text } from '@mantine/core';
import Highcharts from 'highcharts';
import { ReactNode, useState } from 'react';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

export interface ProfitLossChartProps {
  symbols: string[];
}

const PAGE_SIZE = 8;

export function ProfitLossChart({ symbols }: ProfitLossChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(symbols.length / PAGE_SIZE));
  const pageSymbols = symbols.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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

  pageSymbols.forEach(symbol => {
    const data: [number, number][] = [];
    for (const row of algorithm.activityLogs) {
      if (row.product === symbol) data.push([row.timestamp, row.profitLoss]);
    }
    series.push({ type: 'line', name: symbol, data, dashStyle: 'Dash' });
  });

  const controls = totalPages > 1 ? (
    <Group gap="xs" align="center">
      <Button size="xs" variant="light" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
        ◀ Prev
      </Button>
      <Text size="xs" c="dimmed">
        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, symbols.length)} of {symbols.length}
      </Text>
      <Button size="xs" variant="light" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
        Next ▶
      </Button>
    </Group>
  ) : undefined;

  return <Chart title="Profit / Loss" series={series} controls={controls} />;
}
