import { Center, Container, Grid, Group, Select, Title } from '@mantine/core';
import { ReactNode, useState } from 'react';
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

  // Collect product symbols from activity logs (only products present in the loaded data)
  const symbolsSet = new Set<string>();
  for (const row of algorithm.activityLogs) symbolsSet.add(row.product);
  const sortedSymbols = [...symbolsSet].sort((a, b) => a.localeCompare(b));

  // Has algo data (requires Logger boilerplate)
  const hasAlgoData = algorithm.data.length > 0;

  // Product selector state — defaults to first product alphabetically
  const [selectedProduct, setSelectedProduct] = useState<string>(sortedSymbols[0] ?? '');

  const productSelectData = sortedSymbols.map(s => ({ value: s, label: s }));

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

        {/* Overall P&L and Position charts — always visible */}
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <ProfitLossChart symbols={sortedSymbols} />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <PositionChart symbols={sortedSymbols} />
        </Grid.Col>

        {/* Product selector dropdown */}
        <Grid.Col span={12}>
          <VisualizerCard>
            <Group align="center" gap="md">
              <Title order={4}>Product Charts</Title>
              <Select
                searchable
                placeholder="Select a product…"
                data={productSelectData}
                value={selectedProduct}
                onChange={value => value && setSelectedProduct(value)}
                style={{ width: 280 }}
                styles={{ input: { fontWeight: 600, fontSize: 'var(--mantine-font-size-sm)' } }}
              />
            </Group>
          </VisualizerCard>
        </Grid.Col>

        {/* Per-product charts — only for the selected product */}
        {selectedProduct && (
          <>
            <Grid.Col key={`${selectedProduct}-candlestick`} span={{ xs: 12, sm: 6 }}>
              <CandlestickChart symbol={selectedProduct} />
            </Grid.Col>
            <Grid.Col key={`${selectedProduct}-orders`} span={{ xs: 12, sm: 6 }}>
              <OrdersChart symbol={selectedProduct} />
            </Grid.Col>
            <Grid.Col key={`${selectedProduct}-indicators`} span={{ xs: 12, sm: 12 }}>
              <IndicatorsChart symbol={selectedProduct} />
            </Grid.Col>
          </>
        )}

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
