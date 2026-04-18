import { SegmentedControl } from '@mantine/core';
import Highcharts from 'highcharts';
import { ReactNode, useState } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { getAskColor, getBidColor } from '../../utils/colors.ts';
import { Chart } from './Chart.tsx';

export interface OrdersChartProps {
  symbol: ProsperitySymbol;
}

export function OrdersChart({ symbol }: OrdersChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const [priceMode, setPriceMode] = useState<'mid' | 'bidask'>('mid');

  const isValidPrice = (p: number): boolean => p !== 0 && !isNaN(p);

  const midPriceData: [number, number][] = [];
  const bid1Data: [number, number][] = [];
  const bid2Data: [number, number][] = [];
  const bid3Data: [number, number][] = [];
  const ask1Data: [number, number][] = [];
  const ask2Data: [number, number][] = [];
  const ask3Data: [number, number][] = [];

  for (const row of algorithm.activityLogs) {
    if (row.product !== symbol) continue;
    if (isValidPrice(row.midPrice)) midPriceData.push([row.timestamp, row.midPrice]);
    if (row.bidPrices.length >= 1 && isValidPrice(row.bidPrices[0])) bid1Data.push([row.timestamp, row.bidPrices[0]]);
    if (row.bidPrices.length >= 2 && isValidPrice(row.bidPrices[1])) bid2Data.push([row.timestamp, row.bidPrices[1]]);
    if (row.bidPrices.length >= 3 && isValidPrice(row.bidPrices[2])) bid3Data.push([row.timestamp, row.bidPrices[2]]);
    if (row.askPrices.length >= 1 && isValidPrice(row.askPrices[0])) ask1Data.push([row.timestamp, row.askPrices[0]]);
    if (row.askPrices.length >= 2 && isValidPrice(row.askPrices[1])) ask2Data.push([row.timestamp, row.askPrices[1]]);
    if (row.askPrices.length >= 3 && isValidPrice(row.askPrices[2])) ask3Data.push([row.timestamp, row.askPrices[2]]);
  }

  const filledBuyData: Highcharts.PointOptionsObject[] = [];
  const filledSellData: Highcharts.PointOptionsObject[] = [];
  const otherTradeData: Highcharts.PointOptionsObject[] = [];

  for (const trade of algorithm.tradeHistory) {
    if (trade.symbol !== symbol || !isValidPrice(trade.price)) continue;
    const point: Highcharts.PointOptionsObject = {
      x: trade.timestamp,
      y: trade.price,
      custom: { quantity: trade.quantity, buyer: trade.buyer, seller: trade.seller },
    };
    if (trade.buyer.includes('SUBMISSION')) filledBuyData.push(point);
    else if (trade.seller.includes('SUBMISSION')) filledSellData.push(point);
    else otherTradeData.push(point);
  }

  const unfilledBuyData: Highcharts.PointOptionsObject[] = [];
  const unfilledSellData: Highcharts.PointOptionsObject[] = [];

  for (const row of algorithm.data) {
    const orders = row.orders[symbol];
    if (!orders) continue;
    for (const order of orders) {
      if (!isValidPrice(order.price)) continue;
      const point: Highcharts.PointOptionsObject = {
        x: row.state.timestamp,
        y: order.price,
        custom: { quantity: Math.abs(order.quantity) },
      };
      if (order.quantity > 0) unfilledBuyData.push(point);
      else if (order.quantity < 0) unfilledSellData.push(point);
    }
  }

  const priceSeries: Highcharts.SeriesOptionsType[] =
    priceMode === 'mid'
      ? [{ type: 'line', name: 'Mid price', color: 'gray', dashStyle: 'Dash', data: midPriceData, marker: { enabled: false }, enableMouseTracking: false }]
      : [
          { type: 'line', name: 'Bid 3', color: getBidColor(0.5), data: bid3Data, marker: { enabled: false }, enableMouseTracking: false },
          { type: 'line', name: 'Bid 2', color: getBidColor(0.75), data: bid2Data, marker: { enabled: false }, enableMouseTracking: false },
          { type: 'line', name: 'Bid 1', color: getBidColor(1.0), data: bid1Data, marker: { enabled: false }, enableMouseTracking: false },
          { type: 'line', name: 'Ask 1', color: getAskColor(1.0), data: ask1Data, marker: { enabled: false }, enableMouseTracking: false },
          { type: 'line', name: 'Ask 2', color: getAskColor(0.75), data: ask2Data, marker: { enabled: false }, enableMouseTracking: false },
          { type: 'line', name: 'Ask 3', color: getAskColor(0.5), data: ask3Data, marker: { enabled: false }, enableMouseTracking: false },
        ];

  const series: Highcharts.SeriesOptionsType[] = [
    ...priceSeries,
    {
      type: 'scatter', name: 'Buy (filled)', color: getBidColor(1.0), data: filledBuyData,
      marker: { symbol: 'triangle', radius: 6 },
      tooltip: { pointFormatter(this: Highcharts.Point) { const { quantity, buyer, seller } = (this as any).custom ?? {}; return `<span style="color:${this.color}">▲</span> Buy (filled): <b>${this.y}</b> (qty: ${quantity}, buyer: ${buyer}, seller: ${seller})<br/>`; } },
      dataGrouping: { enabled: false },
    },
    {
      type: 'scatter', name: 'Buy (order)', color: getBidColor(0.3), data: unfilledBuyData,
      marker: { symbol: 'triangle', radius: 4 },
      tooltip: { pointFormatter(this: Highcharts.Point) { const qty = (this as any).custom?.quantity; return `<span style="color:${this.color}">▲</span> Buy (order): <b>${this.y}</b> (qty: ${qty})<br/>`; } },
      dataGrouping: { enabled: false }, visible: false,
    },
    {
      type: 'scatter', name: 'Sell (filled)', color: getAskColor(1.0), data: filledSellData,
      marker: { symbol: 'triangle-down', radius: 6 },
      tooltip: { pointFormatter(this: Highcharts.Point) { const { quantity, buyer, seller } = (this as any).custom ?? {}; return `<span style="color:${this.color}">▼</span> Sell (filled): <b>${this.y}</b> (qty: ${quantity}, buyer: ${buyer}, seller: ${seller})<br/>`; } },
      dataGrouping: { enabled: false },
    },
    {
      type: 'scatter', name: 'Sell (order)', color: getAskColor(0.3), data: unfilledSellData,
      marker: { symbol: 'triangle-down', radius: 4 },
      tooltip: { pointFormatter(this: Highcharts.Point) { const qty = (this as any).custom?.quantity; return `<span style="color:${this.color}">▼</span> Sell (order): <b>${this.y}</b> (qty: ${qty})<br/>`; } },
      dataGrouping: { enabled: false }, visible: false,
    },
    {
      type: 'scatter', name: 'Other trades', color: '#a855f7', data: otherTradeData,
      marker: { symbol: 'diamond', radius: 6 },
      tooltip: { pointFormatter(this: Highcharts.Point) { const { quantity, buyer, seller } = (this as any).custom ?? {}; return `<span style="color:${this.color}">◆</span> Trade: <b>${this.y}</b> (qty: ${quantity}, buyer: ${buyer}, seller: ${seller})<br/>`; } },
      dataGrouping: { enabled: false },
    },
  ];

  const controls = (
    <SegmentedControl
      size="xs"
      value={priceMode}
      onChange={value => setPriceMode(value as 'mid' | 'bidask')}
      data={[
        { label: 'Mid Price', value: 'mid' },
        { label: 'Bid/Ask', value: 'bidask' },
      ]}
    />
  );

  return <Chart title={`${symbol} — Order Book (algo trade data)`} series={series} controls={controls} />;
}
