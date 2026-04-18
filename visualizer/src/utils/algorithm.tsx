import { Text } from '@mantine/core';
import { ReactNode } from 'react';
import {
  ActivityLogRow,
  Algorithm,
  AlgorithmDataRow,
  CompressedAlgorithmDataRow,
  CompressedListing,
  CompressedObservations,
  CompressedOrder,
  CompressedOrderDepth,
  CompressedTrade,
  CompressedTradingState,
  ConversionObservation,
  Listing,
  Observation,
  Order,
  OrderDepth,
  Product,
  ProsperitySymbol,
  ResultLog,
  Trade,
  TradingState,
} from '../models.ts';

export class AlgorithmParseError extends Error {
  public constructor(public readonly node: ReactNode) {
    super('Failed to parse algorithm logs');
  }
}

function getColumnValues(columns: string[], indices: number[]): number[] {
  const values: number[] = [];
  for (const index of indices) {
    const value = columns[index];
    if (value !== '') {
      values.push(parseFloat(value));
    }
  }
  return values;
}

function getActivityLogs(logLines: string): ActivityLogRow[] {
  const lines = logLines.split('\n');
  const rows: ActivityLogRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') break;

    const columns = line.split(';');
    rows.push({
      day: Number(columns[0]),
      timestamp: Number(columns[1]),
      product: columns[2],
      bidPrices: getColumnValues(columns, [3, 5, 7]),
      bidVolumes: getColumnValues(columns, [4, 6, 8]),
      askPrices: getColumnValues(columns, [9, 11, 13]),
      askVolumes: getColumnValues(columns, [10, 12, 14]),
      midPrice: Number(columns[15]),
      profitLoss: Number(columns[16]),
    });
  }

  return rows;
}

function decompressListings(compressed: CompressedListing[]): Record<ProsperitySymbol, Listing> {
  const listings: Record<ProsperitySymbol, Listing> = {};
  for (const [symbol, product, denomination] of compressed) {
    listings[symbol] = { symbol, product, denomination };
  }
  return listings;
}

function decompressOrderDepths(
  compressed: Record<ProsperitySymbol, CompressedOrderDepth>,
): Record<ProsperitySymbol, OrderDepth> {
  const orderDepths: Record<ProsperitySymbol, OrderDepth> = {};
  for (const [symbol, [buyOrders, sellOrders]] of Object.entries(compressed)) {
    orderDepths[symbol] = { buyOrders, sellOrders };
  }
  return orderDepths;
}

function decompressTrades(compressed: CompressedTrade[]): Record<ProsperitySymbol, Trade[]> {
  const trades: Record<ProsperitySymbol, Trade[]> = {};
  for (const [symbol, price, quantity, buyer, seller, timestamp] of compressed) {
    if (trades[symbol] === undefined) trades[symbol] = [];
    trades[symbol].push({ symbol, price, quantity, buyer, seller, timestamp });
  }
  return trades;
}

function decompressObservations(compressed: CompressedObservations): Observation {
  const conversionObservations: Record<Product, ConversionObservation> = {};
  for (const [product, [bidPrice, askPrice, transportFees, exportTariff, importTariff, sugarPrice, sunlightIndex]] of Object.entries(
    compressed[1],
  )) {
    conversionObservations[product] = { bidPrice, askPrice, transportFees, exportTariff, importTariff, sugarPrice, sunlightIndex };
  }
  return { plainValueObservations: compressed[0], conversionObservations };
}

function decompressState(compressed: CompressedTradingState): TradingState {
  return {
    timestamp: compressed[0],
    traderData: compressed[1],
    listings: decompressListings(compressed[2]),
    orderDepths: decompressOrderDepths(compressed[3]),
    ownTrades: decompressTrades(compressed[4]),
    marketTrades: decompressTrades(compressed[5]),
    position: compressed[6],
    observations: decompressObservations(compressed[7]),
  };
}

function decompressOrders(compressed: CompressedOrder[]): Record<ProsperitySymbol, Order[]> {
  const orders: Record<ProsperitySymbol, Order[]> = {};
  for (const [symbol, price, quantity] of compressed) {
    if (orders[symbol] === undefined) orders[symbol] = [];
    orders[symbol].push({ symbol, price, quantity });
  }
  return orders;
}

function decompressDataRow(compressed: CompressedAlgorithmDataRow, sandboxLogs: string): AlgorithmDataRow {
  return {
    state: decompressState(compressed[0]),
    orders: decompressOrders(compressed[1]),
    conversions: compressed[2],
    traderData: compressed[3],
    algorithmLogs: compressed[4],
    sandboxLogs,
  };
}

function getAlgorithmData(resultLog: ResultLog): AlgorithmDataRow[] {
  const rows: AlgorithmDataRow[] = [];

  for (const lg of resultLog.logs) {
    const lambdaLog = lg.lambdaLog.trim();
    if (lambdaLog === '') continue;

    try {
      const compressedDataRow = JSON.parse(lambdaLog);
      rows.push(decompressDataRow(compressedDataRow, ''));
    } catch {
      // Not a compressed state row — algorithm may not use the Logger boilerplate
      // Silently skip; we still show activity log charts
    }
  }

  // Adjust trade timestamps for multi-day backtests
  for (const row of rows) {
    const dayOffset = Math.floor(row.state.timestamp / 1000000) * 1000000;
    if (dayOffset === 0) continue;

    const adjustTimestamp = (ts: number): number => {
      const adjusted = ts + dayOffset;
      return adjusted > row.state.timestamp ? adjusted - 1000000 : adjusted;
    };

    for (const symbol of Object.keys(row.state.ownTrades)) {
      for (const trade of row.state.ownTrades[symbol]) {
        trade.timestamp = adjustTimestamp(trade.timestamp);
      }
    }
    for (const symbol of Object.keys(row.state.marketTrades)) {
      for (const trade of row.state.marketTrades[symbol]) {
        trade.timestamp = adjustTimestamp(trade.timestamp);
      }
    }
  }

  return rows;
}

export function parseAlgorithmLogs(resultLog: ResultLog): Algorithm {
  const activityLogs = getActivityLogs(resultLog.activitiesLog);

  if (activityLogs.length === 0) {
    throw new AlgorithmParseError(
      <Text>
        Could not find any activity log rows. Make sure the file is a valid backtester log (text format) or a Prosperity
        API log (JSON format).
      </Text>,
    );
  }

  // Algorithm data is optional — only available when the Logger boilerplate is used
  const data = getAlgorithmData(resultLog);

  return {
    activityLogs,
    data,
    tradeHistory: resultLog.tradeHistory ?? [],
  };
}
