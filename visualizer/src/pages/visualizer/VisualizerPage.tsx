import { Center, Container, Grid, Title } from '@mantine/core';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../../store.ts';
import { formatNumber } from '../../utils/format.ts';
import { CandlestickChart } from './CandlestickChart.tsx';
import { IndicatorsChart } from './IndicatorsChart.tsx';
import { MetricsCard } from './MetricsCard.tsx';
import { OrdersChart } from './OrdersChart.tsx';
import { PositionChart } from './PositionChart.tsx';
import { ProfitLossChart } from './ProfitLossChart.tsx';
import { TimestampsCard } from './TimestampsCard.tsx';
import { VisualizerCard } from './VisualizerCard.tsx';

export function VisualizerPage(): ReactNode {
  const algorithm = useStore(state => state.algorithm);

  if (algorithm === null) {
    return <Navigate to="/" />;
  }

  // Compute final P&L
  let profitLoss = 0;
  const lastTimestamp = algorithm.activityLogs[algorithm.activityLogs.length - 1].timestamp;
  for (let i = algorithm.activityLogs.length - 1; i >= 0 && algorithm.activityLogs[i].timestamp === lastTimestamp; i--) {
    profitLoss += algorithm.activityLogs[i].profitLoss;
  }

  // Collect product symbols from activity logs (always available)
  const symbolsSet = new Set<string>();
  for (const row of algorithm.activityLogs) symbolsSet.add(row.product);
  const sortedSymbols = [...symbolsSet].sort((a, b) => a.localeCompare(b));

  // Has algo data (requires Logger boilerplate)
  const hasAlgoData = algorithm.data.length > 0;

  const symbolColumns: ReactNode[] = [];
  sortedSymbols.forEach(symbol => {
    // Chart 1: CandlestickChart — simple market data (activity logs)
    symbolColumns.push(
      <Grid.Col key={`${symbol}-candlestick`} span={{ xs: 12, sm: 6 }}>
        <CandlestickChart symbol={symbol} />
      </Grid.Col>,
    );

    // Chart 2: OrdersChart — algo trade data (requires Logger; shows mid-price only if unavailable)
    symbolColumns.push(
      <Grid.Col key={`${symbol}-orders`} span={{ xs: 12, sm: 6 }}>
        <OrdersChart symbol={symbol} />
      </Grid.Col>,
    );

    // Chart 3: IndicatorsChart — SMA/EMA/Z-score on simple data (always available)
    symbolColumns.push(
      <Grid.Col key={`${symbol}-indicators`} span={{ xs: 12, sm: 12 }}>
        <IndicatorsChart symbol={symbol} />
      </Grid.Col>,
    );
  });

  return (
    <Container fluid>
      <Grid>
        {/* Header: Final P&L */}
        <Grid.Col span={12}>
          <VisualizerCard>
            <Center>
              <Title order={2}>Final Profit / Loss: {formatNumber(profitLoss)}</Title>
            </Center>
          </VisualizerCard>
        </Grid.Col>

        {/* Performance Metrics from backtester P&L (Sharpe, drawdown, etc.) */}
        <Grid.Col span={12}>
          <MetricsCard activityLogs={algorithm.activityLogs} />
        </Grid.Col>

        {/* Overall P&L and Position charts */}
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <ProfitLossChart symbols={sortedSymbols} />
        </Grid.Col>
        {hasAlgoData && (
          <Grid.Col span={{ xs: 12, sm: 6 }}>
            <PositionChart symbols={sortedSymbols} />
          </Grid.Col>
        )}

        {/* Per-product charts: Candlestick (simple), Orders (algo), Indicators (simple) */}
        {symbolColumns}

        {/* Iterative Visualizer: step through timestamps */}
        {hasAlgoData && (
          <Grid.Col span={12}>
            <TimestampsCard />
          </Grid.Col>
        )}
      </Grid>
    </Container>
  );
}
