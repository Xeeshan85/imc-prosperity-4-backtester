import { Badge, Container, Grid, Group, Stack, Text, Title } from '@mantine/core';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import merge from 'lodash/merge';
import { ReactNode, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useActualColorScheme } from '../../hooks/use-actual-color-scheme.ts';
import { useStore } from '../../store.ts';
import { formatDecimal, formatNumber } from '../../utils/format.ts';
import { MonteCarloComputedStats } from '../../utils/metrics.ts';
import { VisualizerCard } from '../visualizer/VisualizerCard.tsx';
import HighchartsHighContrastDarkTheme from 'highcharts/themes/high-contrast-dark';

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

// ── Histogram chart ───────────────────────────────────────────────────────────

interface HistogramChartProps {
  pnlValues: number[];
  title: string;
}

function HistogramChart({ pnlValues, title }: HistogramChartProps): ReactNode {
  const colorScheme = useActualColorScheme();

  const options = useMemo((): Highcharts.Options => {
    const sorted = [...pnlValues].sort((a, b) => a - b);
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    const bins = Math.max(20, Math.min(60, Math.ceil(Math.sqrt(pnlValues.length))));
    const width = (hi - lo) / bins || 1;

    const counts = new Array(bins).fill(0);
    for (const v of pnlValues) {
      const idx = Math.min(Math.floor((v - lo) / width), bins - 1);
      counts[idx]++;
    }

    const data: [number, number][] = counts.map((c, i) => [lo + i * width + width / 2, c]);

    const mean = pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length;
    const p05 = sorted[Math.floor(sorted.length * 0.05)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    const themeOptions = colorScheme === 'light' ? {} : getThemeOptions(HighchartsHighContrastDarkTheme);
    const chartOptions: Highcharts.Options = {
      chart: { type: 'column', height: 350, animation: false },
      title: { text: title },
      xAxis: { title: { text: 'P&L' }, plotLines: [
        { value: mean, color: '#3b82f6', width: 2, dashStyle: 'Dash', label: { text: `Mean: ${formatNumber(mean)}` } },
        { value: p05, color: '#c0392b', width: 1.5, dashStyle: 'ShortDash', label: { text: 'P5' } },
        { value: p95, color: '#27ae60', width: 1.5, dashStyle: 'ShortDash', label: { text: 'P95' } },
      ]},
      yAxis: { title: { text: 'Sessions' } },
      legend: { enabled: false },
      tooltip: { formatter(this: Highcharts.TooltipFormatterContextObject) {
        return `P&L: ~${formatNumber(this.x as number)}<br/>Sessions: <b>${this.y}</b>`;
      }},
      series: [{ type: 'column', name: 'Sessions', data, color: '#3b82f6', borderWidth: 0 }],
      credits: { enabled: false },
    };

    return merge(themeOptions, chartOptions);
  }, [pnlValues, title, colorScheme]);

  return (
    <VisualizerCard p={0}>
      <HighchartsReact highcharts={Highcharts} options={options} immutable />
    </VisualizerCard>
  );
}

// ── Cumulative distribution chart ─────────────────────────────────────────────

function CumulativeChart({ pnlValues }: { pnlValues: number[] }): ReactNode {
  const colorScheme = useActualColorScheme();

  const options = useMemo((): Highcharts.Options => {
    const sorted = [...pnlValues].sort((a, b) => a - b);
    const n = sorted.length;
    const data: [number, number][] = sorted.map((v, i) => [v, ((i + 1) / n) * 100]);

    const themeOptions = colorScheme === 'light' ? {} : getThemeOptions(HighchartsHighContrastDarkTheme);
    const chartOptions: Highcharts.Options = {
      chart: { type: 'line', height: 350, animation: false },
      title: { text: 'Cumulative Distribution (CDF)' },
      xAxis: { title: { text: 'P&L' }, plotLines: [{ value: 0, color: 'gray', dashStyle: 'Dash', width: 1 }] },
      yAxis: { title: { text: 'Percentile (%)' }, min: 0, max: 100 },
      legend: { enabled: false },
      tooltip: { formatter(this: Highcharts.TooltipFormatterContextObject) {
        return `P&L: ${formatNumber(this.x as number)}<br/>Percentile: <b>${formatDecimal(this.y as number, 1)}%</b>`;
      }},
      series: [{ type: 'line', name: 'CDF', data, marker: { enabled: false }, color: '#8b5cf6' }],
      credits: { enabled: false },
    };
    return merge(themeOptions, chartOptions);
  }, [pnlValues, colorScheme]);

  return (
    <VisualizerCard p={0}>
      <HighchartsReact highcharts={Highcharts} options={options} immutable />
    </VisualizerCard>
  );
}

// ── Stats grid ────────────────────────────────────────────────────────────────

function StatRow({ label, value, color }: { label: string; value: string; color?: string }): ReactNode {
  return (
    <Grid.Col span={{ xs: 6, sm: 4, md: 3 }}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={500}>{label}</Text>
      <Text size="lg" fw={700} c={color}>{value}</Text>
    </Grid.Col>
  );
}

function StatsGrid({ stats }: { stats: MonteCarloComputedStats }): ReactNode {
  return (
    <VisualizerCard>
      <Group mb="xs" align="center">
        <Title order={4}>Monte Carlo Statistics</Title>
        <Badge color="violet" variant="light" size="sm">
          {formatNumber(stats.count)} sessions
        </Badge>
      </Group>
      <Grid gutter="md">
        <StatRow label="Mean P&L" value={formatNumber(stats.mean)} color={stats.mean >= 0 ? 'green' : 'red'} />
        <StatRow label="Std Dev" value={formatNumber(stats.std)} />
        <StatRow label="Min" value={formatNumber(stats.min)} color="red" />
        <StatRow label="Max" value={formatNumber(stats.max)} color="green" />
        <StatRow label="P5" value={formatNumber(stats.p05)} />
        <StatRow label="P25" value={formatNumber(stats.p25)} />
        <StatRow label="Median" value={formatNumber(stats.p50)} />
        <StatRow label="P75" value={formatNumber(stats.p75)} />
        <StatRow label="P95" value={formatNumber(stats.p95)} />
        <StatRow label="Positive Rate" value={`${formatDecimal(stats.positiveRate * 100, 1)}%`} color={stats.positiveRate >= 0.5 ? 'green' : 'red'} />
        <StatRow label="Sharpe-like" value={formatDecimal(stats.sharpeLike, 3)} color={stats.sharpeLike >= 0.5 ? 'green' : stats.sharpeLike < 0 ? 'red' : 'yellow'} />
      </Grid>
    </VisualizerCard>
  );
}

// ── Session scatter plot ──────────────────────────────────────────────────────

function SessionScatter({ sessions }: { sessions: Array<Record<string, number>> }): ReactNode {
  const colorScheme = useActualColorScheme();

  const options = useMemo((): Highcharts.Options => {
    const data: [number, number][] = sessions.map((s, i) => [i, s['total_pnl'] ?? 0]);
    const themeOptions = colorScheme === 'light' ? {} : getThemeOptions(HighchartsHighContrastDarkTheme);
    const chartOptions: Highcharts.Options = {
      chart: { type: 'scatter', height: 300, animation: false },
      title: { text: 'P&L per Session' },
      xAxis: { title: { text: 'Session ID' } },
      yAxis: { title: { text: 'Total P&L' }, plotLines: [{ value: 0, color: 'gray', dashStyle: 'Dash', width: 1 }] },
      legend: { enabled: false },
      tooltip: { formatter(this: Highcharts.TooltipFormatterContextObject) {
        return `Session ${this.x}: <b>${formatNumber(this.y as number)}</b>`;
      }},
      series: [{
        type: 'scatter', name: 'Session', data,
        marker: { radius: 3 },
        color: '#3b82f6',
      }],
      credits: { enabled: false },
    };
    return merge(themeOptions, chartOptions);
  }, [sessions, colorScheme]);

  return (
    <VisualizerCard p={0}>
      <HighchartsReact highcharts={Highcharts} options={options} immutable />
    </VisualizerCard>
  );
}

// ── Main Monte Carlo page ─────────────────────────────────────────────────────

export function MonteCarloPage(): ReactNode {
  const monteCarlo = useStore(state => state.monteCarlo);

  if (monteCarlo === null) {
    return <Navigate to="/" />;
  }

  const pnlValues = monteCarlo.sessions.map((s: any) => s['total_pnl'] ?? 0);

  return (
    <Container fluid>
      <Stack>
        <Grid>
          <Grid.Col span={12}>
            <StatsGrid stats={monteCarlo.stats} />
          </Grid.Col>
          <Grid.Col span={{ xs: 12, sm: 6 }}>
            <HistogramChart pnlValues={pnlValues} title="P&L Distribution" />
          </Grid.Col>
          <Grid.Col span={{ xs: 12, sm: 6 }}>
            <CumulativeChart pnlValues={pnlValues} />
          </Grid.Col>
          {monteCarlo.sessions.length > 0 && (
            <Grid.Col span={12}>
              <SessionScatter sessions={monteCarlo.sessions as any} />
            </Grid.Col>
          )}
        </Grid>
      </Stack>
    </Container>
  );
}
