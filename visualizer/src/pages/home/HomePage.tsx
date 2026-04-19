import { Anchor, Container, Stack, Text } from '@mantine/core';
import { ReactNode } from 'react';
import { HomeCard } from './HomeCard.tsx';
import { LoadBacktestFromFile } from './LoadFromFile.tsx';

export function HomePage(): ReactNode {
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

        <LoadBacktestFromFile />
      </Stack>
    </Container>
  );
}
