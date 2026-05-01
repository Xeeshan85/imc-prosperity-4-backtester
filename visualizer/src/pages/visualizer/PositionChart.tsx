import { Button, Group, Text } from '@mantine/core';
import Highcharts from 'highcharts';
import { ReactNode, useState } from 'react';
import { Algorithm, ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { Chart } from './Chart.tsx';

const KNOWN_LIMITS: Record<string, number> = {
  // Round 0–4
  TOMATOES: 80,
  EMERALDS: 80,
  ASH_COATED_OSMIUM: 80,
  INTARIAN_PEPPER_ROOT: 80,
  HYDROGEL_PACK: 200,
  VELVETFRUIT_EXTRACT: 200,
  VELVETFRUIT_EXTRACT_VOUCHER: 300,
  VEV_4000: 300,
  VEV_4500: 300,
  VEV_5000: 300,
  VEV_5100: 300,
  VEV_5200: 300,
  VEV_5300: 300,
  VEV_5400: 300,
  VEV_5500: 300,
  VEV_6000: 300,
  VEV_6500: 300,
  // Round 5
  GALAXY_SOUNDS_DARK_MATTER: 10,
  GALAXY_SOUNDS_BLACK_HOLES: 10,
  GALAXY_SOUNDS_PLANETARY_RINGS: 10,
  GALAXY_SOUNDS_SOLAR_WINDS: 10,
  GALAXY_SOUNDS_SOLAR_FLAMES: 10,
  SLEEP_POD_SUEDE: 10,
  SLEEP_POD_LAMB_WOOL: 10,
  SLEEP_POD_POLYESTER: 10,
  SLEEP_POD_NYLON: 10,
  SLEEP_POD_COTTON: 10,
  MICROCHIP_CIRCLE: 10,
  MICROCHIP_OVAL: 10,
  MICROCHIP_SQUARE: 10,
  MICROCHIP_RECTANGLE: 10,
  MICROCHIP_TRIANGLE: 10,
  PEBBLES_XS: 10,
  PEBBLES_S: 10,
  PEBBLES_M: 10,
  PEBBLES_L: 10,
  PEBBLES_XL: 10,
  ROBOT_VACUUMING: 10,
  ROBOT_MOPPING: 10,
  ROBOT_DISHES: 10,
  ROBOT_LAUNDRY: 10,
  ROBOT_IRONING: 10,
  UV_VISOR_YELLOW: 10,
  UV_VISOR_AMBER: 10,
  UV_VISOR_ORANGE: 10,
  UV_VISOR_RED: 10,
  UV_VISOR_MAGENTA: 10,
  TRANSLATOR_SPACE_GRAY: 10,
  TRANSLATOR_ASTRO_BLACK: 10,
  TRANSLATOR_ECLIPSE_CHARCOAL: 10,
  TRANSLATOR_GRAPHITE_MIST: 10,
  TRANSLATOR_VOID_BLUE: 10,
  PANEL_1X2: 10,
  PANEL_2X2: 10,
  PANEL_1X4: 10,
  PANEL_2X4: 10,
  PANEL_4X4: 10,
  OXYGEN_SHAKE_MORNING_BREATH: 10,
  OXYGEN_SHAKE_EVENING_BREATH: 10,
  OXYGEN_SHAKE_MINT: 10,
  OXYGEN_SHAKE_CHOCOLATE: 10,
  OXYGEN_SHAKE_GARLIC: 10,
  SNACKPACK_CHOCOLATE: 10,
  SNACKPACK_VANILLA: 10,
  SNACKPACK_PISTACHIO: 10,
  SNACKPACK_STRAWBERRY: 10,
  SNACKPACK_RASPBERRY: 10,
};

function getLimitFromAlgoData(algorithm: Algorithm, symbol: ProsperitySymbol): number {
  const positions = algorithm.data.map(row => row.state.position[symbol] || 0);
  const minPosition = Math.min(...positions);
  const maxPosition = Math.max(...positions);
  return Math.max(Math.abs(minPosition), maxPosition) || 1;
}

function getLimit(algorithm: Algorithm, symbol: ProsperitySymbol): number {
  if (KNOWN_LIMITS[symbol] !== undefined) return KNOWN_LIMITS[symbol];
  if (algorithm.data.length > 0) return getLimitFromAlgoData(algorithm, symbol);
  return 1; // fallback — positions will show as raw values
}

export interface PositionChartProps {
  symbols: string[];
}

const PAGE_SIZE = 8;

/**
 * Build position data from algorithm.data (Logger required) or
 * reconstruct from tradeHistory (always available).
 */
function buildPositionData(
  algorithm: Algorithm,
  pageSymbols: string[],
  limits: Record<string, number>,
): Record<string, [number, number][]> {
  const data: Record<string, [number, number][]> = {};
  for (const symbol of pageSymbols) data[symbol] = [];

  if (algorithm.data.length > 0) {
    // Use algo data directly (has exact positions)
    for (const row of algorithm.data) {
      for (const symbol of pageSymbols) {
        const position = row.state.position[symbol] || 0;
        data[symbol].push([row.state.timestamp, (position / limits[symbol]) * 100]);
      }
    }
  } else {
    // Reconstruct positions from tradeHistory
    // Accumulate: buyer=SUBMISSION → +qty, seller=SUBMISSION → -qty
    const positionAcc: Record<string, number> = {};
    for (const symbol of pageSymbols) positionAcc[symbol] = 0;

    // Group trades by timestamp, sorted
    const tradesByTs = new Map<number, typeof algorithm.tradeHistory>();
    for (const trade of algorithm.tradeHistory) {
      if (!tradesByTs.has(trade.timestamp)) tradesByTs.set(trade.timestamp, []);
      tradesByTs.get(trade.timestamp)!.push(trade);
    }
    const sortedTimestamps = [...tradesByTs.keys()].sort((a, b) => a - b);

    for (const ts of sortedTimestamps) {
      for (const trade of tradesByTs.get(ts)!) {
        if (!pageSymbols.includes(trade.symbol)) continue;
        if (trade.buyer.includes('SUBMISSION')) {
          positionAcc[trade.symbol] += trade.quantity;
        } else if (trade.seller.includes('SUBMISSION')) {
          positionAcc[trade.symbol] -= trade.quantity;
        }
      }
      for (const symbol of pageSymbols) {
        data[symbol].push([ts, (positionAcc[symbol] / limits[symbol]) * 100]);
      }
    }
  }

  return data;
}

export function PositionChart({ symbols }: PositionChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(symbols.length / PAGE_SIZE));
  const pageSymbols = symbols.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const limits: Record<string, number> = {};
  for (const symbol of pageSymbols) limits[symbol] = getLimit(algorithm, symbol);

  const data = buildPositionData(algorithm, pageSymbols, limits);

  const series: Highcharts.SeriesOptionsType[] = pageSymbols.map((symbol, i) => ({
    type: 'line',
    name: symbol,
    data: data[symbol],
    colorIndex: (i + 1) % 10,
  }));

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

  return <Chart title="Positions (% of limit)" series={series} min={-100} max={100} controls={controls} />;
}

