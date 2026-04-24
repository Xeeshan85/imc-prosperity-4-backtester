import { Group, NumberInput, Select, Slider, SliderProps, Text, Title } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { KeyboardEvent, ReactNode, useEffect, useState } from 'react';
import { AlgorithmDataRow } from '../../models.ts';
import { useStore } from '../../store.ts';
import { formatNumber } from '../../utils/format.ts';
import { TimestampDetail } from './TimestampDetail.tsx';
import { VisualizerCard } from './VisualizerCard.tsx';

export function TimestampsCard(): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;

  const rowsByTimestamp: Record<number, AlgorithmDataRow> = {};
  for (const row of algorithm.data) {
    rowsByTimestamp[row.state.timestamp] = row;
  }

  const timestampMin = algorithm.data[0].state.timestamp;
  const timestampMax = algorithm.data[algorithm.data.length - 1].state.timestamp;
  const timestampStep = algorithm.data[1].state.timestamp - algorithm.data[0].state.timestamp;

  // const timestampMin = 0;
  // const timestampMax = 1999900;
  // const timestampStep = 100;

  const products = Array.from(
    new Set(algorithm.data.flatMap(row => Object.keys(row.state.orderDepths))),
  ).sort();
  const productSelectData = [{ value: 'all', label: 'All Products' }, ...products.map(p => ({ value: p, label: p }))];

  const [timestamp, setTimestamp] = useState(timestampMin);
  const [inputValue, setInputValue] = useState<number | string>(timestampMin);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  useEffect(() => {
    setInputValue(timestamp);
  }, [timestamp]);

  const marks: SliderProps['marks'] = [];
  for (let i = timestampMin; i < timestampMax; i += (timestampMax + 100) / 4) {
    marks.push({
      value: i,
      label: formatNumber(i),
    });
  }

  function snapToNearest(value: number): number {
    const clamped = Math.max(timestampMin, Math.min(timestampMax, value));
    return Math.round((clamped - timestampMin) / timestampStep) * timestampStep + timestampMin;
  }

  function commit(): void {
    const parsed = typeof inputValue === 'number' ? inputValue : Number(inputValue);
    if (!isNaN(parsed)) {
      setTimestamp(snapToNearest(parsed));
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') commit();
  }

  useHotkeys([
    ['ArrowLeft', () => setTimestamp(timestamp === timestampMin ? timestamp : timestamp - timestampStep)],
    ['ArrowRight', () => setTimestamp(timestamp === timestampMax ? timestamp : timestamp + timestampStep)],
  ]);

  return (
    <VisualizerCard>
      <Group align="center" gap="xs" mb="xs">
        <Title order={4}>Timestamps</Title>
        <NumberInput
          value={inputValue}
          onChange={value => {
            setInputValue(value);
            // Stepper buttons produce a valid snapped timestamp — commit immediately.
            // Partial typed values (e.g. 273 when heading to 27300) won't match and are left pending.
            if (typeof value === 'number' && snapToNearest(value) === value) {
              setTimestamp(value);
            }
          }}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          min={timestampMin}
          max={timestampMax}
          step={timestampStep}
          style={{ width: 150 }}
          styles={{ input: { fontWeight: 700, fontSize: 'var(--mantine-font-size-sm)' } }}
        />
        <Select
          value={selectedProduct}
          onChange={value => setSelectedProduct(value ?? 'all')}
          data={productSelectData}
          style={{ width: 180 }}
          styles={{ input: { fontWeight: 600, fontSize: 'var(--mantine-font-size-sm)' } }}
        />
      </Group>

      <Slider
        min={timestampMin}
        max={timestampMax}
        step={timestampStep}
        marks={marks}
        label={value => `Timestamp ${formatNumber(value)}`}
        value={timestamp}
        onChange={setTimestamp}
        mb="lg"
      />

      {rowsByTimestamp[timestamp] ? (
        <TimestampDetail row={rowsByTimestamp[timestamp]} selectedProduct={selectedProduct} />
      ) : (
        <Text>No logs found for timestamp {formatNumber(timestamp)}</Text>
      )}
    </VisualizerCard>
  );
}
