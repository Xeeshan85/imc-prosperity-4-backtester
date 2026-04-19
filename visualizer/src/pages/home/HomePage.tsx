import { Anchor, Code, Container, Loader, Stack, Text } from '@mantine/core';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ScrollableCodeHighlight } from '../../components/ScrollableCodeHighlight.tsx';
import { ResultLog } from '../../models.ts';
import { useStore } from '../../store.ts';
import { parseAlgorithmLogs } from '../../utils/algorithm.tsx';
import { parseBacktestLog } from '../../utils/parseLog.ts';
import { HomeCard } from './HomeCard.tsx';
import { LoadBacktestFromFile } from './LoadFromFile.tsx';

const exampleCode = `import json
from typing import Any

from datamodel import Listing, Observation, Order, OrderDepth, ProsperityEncoder, Symbol, Trade, TradingState


class Logger:
    def __init__(self) -> None:
        self.logs = ""
        self.max_log_length = 3750

    def print(self, *objects: Any, sep: str = " ", end: str = "\\n") -> None:
        self.logs += sep.join(map(str, objects)) + end

    def flush(self, state: TradingState, orders: dict[Symbol, list[Order]], conversions: int, trader_data: str) -> None:
        base_length = len(
            self.to_json(
                [
                    self.compress_state(state, ""),
                    self.compress_orders(orders),
                    conversions,
                    "",
                    "",
                ]
            )
        )

        # We truncate state.traderData, trader_data, and self.logs to the same max. length to fit the log limit
        max_item_length = (self.max_log_length - base_length) // 3

        print(
            self.to_json(
                [
                    self.compress_state(state, self.truncate(state.traderData, max_item_length)),
                    self.compress_orders(orders),
                    conversions,
                    self.truncate(trader_data, max_item_length),
                    self.truncate(self.logs, max_item_length),
                ]
            )
        )

        self.logs = ""

    def compress_state(self, state: TradingState, trader_data: str) -> list[Any]:
        return [
            state.timestamp,
            trader_data,
            self.compress_listings(state.listings),
            self.compress_order_depths(state.order_depths),
            self.compress_trades(state.own_trades),
            self.compress_trades(state.market_trades),
            state.position,
            self.compress_observations(state.observations),
        ]

    def compress_listings(self, listings: dict[Symbol, Listing]) -> list[list[Any]]:
        compressed = []
        for listing in listings.values():
            compressed.append([listing.symbol, listing.product, listing.denomination])

        return compressed

    def compress_order_depths(self, order_depths: dict[Symbol, OrderDepth]) -> dict[Symbol, list[Any]]:
        compressed = {}
        for symbol, order_depth in order_depths.items():
            compressed[symbol] = [order_depth.buy_orders, order_depth.sell_orders]

        return compressed

    def compress_trades(self, trades: dict[Symbol, list[Trade]]) -> list[list[Any]]:
        compressed = []
        for arr in trades.values():
            for trade in arr:
                compressed.append(
                    [
                        trade.symbol,
                        trade.price,
                        trade.quantity,
                        trade.buyer,
                        trade.seller,
                        trade.timestamp,
                    ]
                )

        return compressed

    def compress_observations(self, observations: Observation) -> list[Any]:
        conversion_observations = {}
        for product, observation in observations.conversionObservations.items():
            conversion_observations[product] = [
                observation.bidPrice,
                observation.askPrice,
                observation.transportFees,
                observation.exportTariff,
                observation.importTariff,
                observation.sugarPrice,
                observation.sunlightIndex,
            ]

        return [observations.plainValueObservations, conversion_observations]

    def compress_orders(self, orders: dict[Symbol, list[Order]]) -> list[list[Any]]:
        compressed = []
        for arr in orders.values():
            for order in arr:
                compressed.append([order.symbol, order.price, order.quantity])

        return compressed

    def to_json(self, value: Any) -> str:
        return json.dumps(value, cls=ProsperityEncoder, separators=(",", ":"))

    def truncate(self, value: str, max_length: int) -> str:
        lo, hi = 0, min(len(value), max_length)
        out = ""

        while lo <= hi:
            mid = (lo + hi) // 2

            candidate = value[:mid]
            if len(candidate) < len(value):
                candidate += "..."

            encoded_candidate = json.dumps(candidate)

            if len(encoded_candidate) <= max_length:
                out = candidate
                lo = mid + 1
            else:
                hi = mid - 1

        return out


logger = Logger()


class Trader:
    def run(self, state: TradingState) -> tuple[dict[Symbol, list[Order]], int, str]:
        result = {}
        conversions = 0
        trader_data = ""

        # TODO: Add logic

        logger.flush(state, result, conversions, trader_data)
        return result, conversions, trader_data`;

export function HomePage(): ReactNode {
  const navigate = useNavigate();
  const setAlgorithm = useStore(state => state.setAlgorithm);
  const [searchParams] = useSearchParams();
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoLoadError, setAutoLoadError] = useState<string>();

  useEffect(() => {
    const openUrl = searchParams.get('open');
    if (!openUrl) return;

    setAutoLoading(true);
    setAutoLoadError(undefined);

    fetch(openUrl)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch log: ${res.status}`);
        return res.text();
      })
      .then(content => {
        let resultLog: ResultLog;
        const trimmed = content.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          resultLog = JSON.parse(trimmed) as ResultLog;
        } else {
          resultLog = parseBacktestLog(content);
        }

        const algorithm = parseAlgorithmLogs(resultLog);
        setAlgorithm(algorithm);
        navigate('/visualizer');
      })
      .catch(err => {
        setAutoLoadError(err.message ?? 'Unknown error loading log');
        setAutoLoading(false);
      });
  }, [searchParams, navigate, setAlgorithm]);

  if (autoLoading) {
    return (
      <Container>
        <Stack align="center" mt="xl">
          <Loader size="lg" />
          <Text>Loading backtest log…</Text>
          {autoLoadError && <Text c="red">{autoLoadError}</Text>}
        </Stack>
      </Container>
    );
  }

  return (
    <Container>
      <Stack>
        <HomeCard title="Welcome">
          <Text>
            Enhanced visualizer for{' '}
            <Anchor href="https://prosperity.imc.com/" target="_blank" rel="noreferrer">
              IMC Prosperity 4
            </Anchor>{' '}
            backtests. Load a backtest log to visualize P&amp;L, positions, candlestick charts, algo trade overlays, and
            technical indicators (SMA, EMA, Z-score).
          </Text>
        </HomeCard>

        <HomeCard title="Logger boilerplate (required for order/position charts)">
          <Text>
            For the order book overlay and position charts, your algorithm must use the <code>Logger</code> class and
            call <code>logger.flush()</code> at the end of <code>Trader.run()</code>. The backtester from{' '}
            <Anchor href="https://github.com/Xeeshan85/imc-prosperity-4-backtester" target="_blank" rel="noreferrer">
              imc-prosperity-4-backtester
            </Anchor>{' '}
            is required to generate the .log files. Price/indicator charts work without the Logger.
          </Text>
        </HomeCard>

        <HomeCard title="Prerequisites">
          <Text>
            IMC Prosperity 4 Visualizer assumes your algorithm logs in a certain format. Algorithms that use a different
            logging format may cause unexpected errors when opening them in the visualizer. Please use the following
            boilerplate for your algorithm (or adapt your algorithm to use the logger from this code) and use{' '}
            <Code>logger.print()</Code> where you would normally use <Code>print()</Code>:
          </Text>
          <ScrollableCodeHighlight code={exampleCode} language="python" />
        </HomeCard>

        <LoadBacktestFromFile />
      </Stack>
    </Container>
  );
}
