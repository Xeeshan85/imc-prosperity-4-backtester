import { Badge, Grid, Group, Text, Title } from '@mantine/core';
import { ReactNode } from 'react';
import { ActivityLogRow } from '../../models.ts';
import { BacktestMetrics, computeMetrics } from '../../utils/metrics.ts';
import { formatDecimal, formatNumber } from '../../utils/format.ts';
import { VisualizerCard } from './VisualizerCard.tsx';

interface MetricRowProps {
  label: string;
  value: string;
  color?: string;
  tooltip?: string;
}

function MetricRow({ label, value, color }: MetricRowProps): ReactNode {
  return (
    <Grid.Col span={{ xs: 6, sm: 4, md: 3 }}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
        {label}
      </Text>
      <Text size="lg" fw={700} c={color}>
        {value}
      </Text>
    </Grid.Col>
  );
}

function sharpeColor(v: number): string {
  if (v >= 1.5) return 'green';
  if (v >= 0.5) return 'yellow';
  return 'red';
}

function drawdownColor(v: number): string {
  if (v <= 5) return 'green';
  if (v <= 20) return 'yellow';
  return 'red';
}

function winRateColor(v: number): string {
  if (v >= 0.55) return 'green';
  if (v >= 0.45) return 'yellow';
  return 'red';
}

export interface MetricsCardProps {
  activityLogs: ActivityLogRow[];
}

/**
 * Displays Sharpe ratio, Sortino ratio, max drawdown, win rate, and other
 * financial metrics computed from the backtester activity log P&L series.
 */
export function MetricsCard({ activityLogs }: MetricsCardProps): ReactNode {
  const m: BacktestMetrics = computeMetrics(activityLogs);

  const pnlColor = m.totalPnL >= 0 ? 'green' : 'red';
  const pfStr = isFinite(m.profitFactor) ? formatDecimal(m.profitFactor, 2) : '∞';

  return (
    <VisualizerCard>
      <Group mb="xs" align="center">
        <Title order={4}>Performance Metrics</Title>
        <Badge color="gray" variant="light" size="sm">
          from backtester P&amp;L
        </Badge>
      </Group>

      <Grid gutter="md">
        <MetricRow
          label="Total P&L"
          value={formatNumber(m.totalPnL)}
          color={pnlColor}
        />
        <MetricRow
          label="Peak P&L"
          value={formatNumber(m.peakPnL)}
          color="green"
        />
        <MetricRow
          label="Min P&L"
          value={formatNumber(m.minPnL)}
          color={m.minPnL < 0 ? 'red' : 'green'}
        />
        <MetricRow
          label="Sharpe Ratio"
          value={formatDecimal(m.sharpeRatio, 3)}
          color={sharpeColor(m.sharpeRatio)}
        />
        <MetricRow
          label="Sortino Ratio"
          value={formatDecimal(m.sortinoRatio, 3)}
          color={sharpeColor(m.sortinoRatio)}
        />
        <MetricRow
          label="Max Drawdown"
          value={formatNumber(m.maxDrawdown)}
          color={m.maxDrawdown > 0 ? 'red' : 'green'}
        />
        <MetricRow
          label="Max DD %"
          value={`${formatDecimal(m.maxDrawdownPct, 1)}%`}
          color={drawdownColor(m.maxDrawdownPct)}
        />
        <MetricRow
          label="Win Rate"
          value={`${formatDecimal(m.winRate * 100, 1)}%`}
          color={winRateColor(m.winRate)}
        />
        <MetricRow
          label="Profit Factor"
          value={pfStr}
          color={m.profitFactor >= 1 ? 'green' : 'red'}
        />
        <MetricRow
          label="Avg Return/Step"
          value={formatDecimal(m.avgReturn, 2)}
          color={m.avgReturn >= 0 ? 'green' : 'red'}
        />
        <MetricRow
          label="Std Return/Step"
          value={formatDecimal(m.stdReturn, 2)}
        />
        <MetricRow
          label="Timesteps"
          value={formatNumber(m.numTimesteps)}
        />
        <MetricRow
          label="Profitable Steps"
          value={formatNumber(m.positiveTimesteps)}
          color="green"
        />
        <MetricRow
          label="Losing Steps"
          value={formatNumber(m.negativeTimesteps)}
          color="red"
        />
      </Grid>
    </VisualizerCard>
  );
}
