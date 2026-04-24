import { Grid, Text, Title } from '@mantine/core';
import { ReactNode } from 'react';
import { ScrollableCodeHighlight } from '../../components/ScrollableCodeHighlight.tsx';
import { AlgorithmDataRow } from '../../models.ts';
import { useStore } from '../../store.ts';
import { formatNumber } from '../../utils/format.ts';
import { ConversionObservationsTable } from './ConversionObservationsTable.tsx';
import { ListingsTable } from './ListingsTable.tsx';
import { OrderDepthTable } from './OrderDepthTable.tsx';
import { OrdersTable } from './OrdersTable.tsx';
import { PlainValueObservationsTable } from './PlainValueObservationsTable.tsx';
import { PositionTable } from './PositionTable.tsx';
import { ProfitLossTable } from './ProfitLossTable.tsx';
import { TradesTable } from './TradesTable.tsx';

function formatTraderData(value: any): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

export interface TimestampDetailProps {
  row: AlgorithmDataRow;
  selectedProduct?: string;
}

export function TimestampDetail({
  row: { state, orders, conversions, traderData, algorithmLogs, sandboxLogs },
  selectedProduct = 'all',
}: TimestampDetailProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;

  function filterByKey<T>(record: Record<string, T>): Record<string, T> {
    if (selectedProduct === 'all') return record;
    return Object.fromEntries(Object.entries(record).filter(([key]) => key === selectedProduct));
  }

  const filteredListings = filterByKey(state.listings);
  const filteredPosition = filterByKey(state.position);
  const filteredOrderDepths = filterByKey(state.orderDepths);
  const filteredOwnTrades = filterByKey(state.ownTrades);
  const filteredMarketTrades = filterByKey(state.marketTrades);
  const filteredOrders = filterByKey(orders);
  const filteredPlainValueObservations = filterByKey(state.observations.plainValueObservations);
  const filteredConversionObservations = filterByKey(state.observations.conversionObservations);

  const profitLoss = algorithm.activityLogs
    .filter(
      row =>
        row.timestamp === state.timestamp && (selectedProduct === 'all' || row.product === selectedProduct),
    )
    .reduce((acc, val) => acc + val.profitLoss, 0);

  return (
    <Grid columns={12}>
      <Grid.Col span={12}>
        {/* prettier-ignore */}
        <Title order={5}>
          Timestamp {formatNumber(state.timestamp)} • Profit / Loss: {formatNumber(profitLoss)} •
          Conversions: {formatNumber(conversions)}
        </Title>
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 4 }}>
        <Title order={5}>Listings</Title>
        <ListingsTable listings={filteredListings} />
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 4 }}>
        <Title order={5}>Positions</Title>
        <PositionTable position={filteredPosition} />
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 4 }}>
        <Title order={5}>Profit / Loss</Title>
        <ProfitLossTable timestamp={state.timestamp} product={selectedProduct === 'all' ? undefined : selectedProduct} />
      </Grid.Col>
      {Object.entries(filteredOrderDepths).map(([symbol, orderDepth], i) => (
        <Grid.Col key={i} span={{ xs: 12, sm: 4 }}>
          <Title order={5}>{symbol} order depth</Title>
          <OrderDepthTable orderDepth={orderDepth} />
        </Grid.Col>
      ))}
      {Object.keys(filteredOrderDepths).length % 3 <= 2 && <Grid.Col span={{ xs: 12, sm: 4 }} />}
      {Object.keys(filteredOrderDepths).length % 3 <= 1 && <Grid.Col span={{ xs: 12, sm: 4 }} />}
      <Grid.Col span={{ xs: 12, sm: 4 }}>
        <Title order={5}>Most Recent Own trades</Title>
        {<TradesTable trades={filteredOwnTrades} />}
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 4 }}>
        <Title order={5}>Most Recent Market trades</Title>
        {<TradesTable trades={filteredMarketTrades} />}
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 4 }}>
        <Title order={5}>Orders</Title>
        {<OrdersTable orders={filteredOrders} />}
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 4 }}>
        <Title order={5}>Plain value observations</Title>
        <PlainValueObservationsTable plainValueObservations={filteredPlainValueObservations} />
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 8 }}>
        <Title order={5}>Conversion observations</Title>
        <ConversionObservationsTable conversionObservations={filteredConversionObservations} />
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 6 }}>
        <Title order={5}>Sandbox logs</Title>
        {sandboxLogs ? (
          <ScrollableCodeHighlight code={sandboxLogs} language="markdown" />
        ) : (
          <Text>Timestamp has no sandbox logs</Text>
        )}
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 6 }}>
        <Title order={5}>Algorithm logs</Title>
        {algorithmLogs ? (
          <ScrollableCodeHighlight code={algorithmLogs} language="markdown" />
        ) : (
          <Text>Timestamp has no algorithm logs</Text>
        )}
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 6 }}>
        <Title order={5}>Previous trader data</Title>
        {state.traderData ? (
          <ScrollableCodeHighlight code={formatTraderData(state.traderData)} language="json" />
        ) : (
          <Text>Timestamp has no previous trader data</Text>
        )}
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 6 }}>
        <Title order={5}>Next trader data</Title>
        {traderData ? (
          <ScrollableCodeHighlight code={formatTraderData(traderData)} language="json" />
        ) : (
          <Text>Timestamp has no next trader data</Text>
        )}
      </Grid.Col>
    </Grid>
  );
}
