import { ResultLog, ResultLogItems, ResultLogTradeHistoryItem } from '../models.ts';

/**
 * Parse the backtester text-format log file into a ResultLog object.
 *
 * Backtester output format:
 *   Sandbox logs:
 *   {"sandboxLog":"","lambdaLog":"...","timestamp":0}
 *   ...
 *
 *
 *   Activities log:
 *   day;timestamp;product;bid_price_1;...;mid_price;profit_and_loss
 *   0;0;PRODUCT;...
 *
 *
 *
 *
 *   Trade History:
 *   [
 *     {...},
 *     ...
 *   ]
 */
export function parseBacktestLog(content: string): ResultLog {
  const sandboxHeader = 'Sandbox logs:';
  const activitiesHeader = 'Activities log:';
  const tradeHistoryHeader = 'Trade History:';

  const sandboxStart = content.indexOf(sandboxHeader);
  const activitiesStart = content.indexOf(activitiesHeader);
  const tradeHistoryStart = content.indexOf(tradeHistoryHeader);

  // Parse sandbox logs section — each non-empty line is a JSON object
  const logs: ResultLogItems[] = [];
  if (sandboxStart >= 0) {
    const sectionEnd = activitiesStart >= 0 ? activitiesStart : content.length;
    const section = content.slice(sandboxStart + sandboxHeader.length, sectionEnd);
    for (const line of section.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        logs.push({
          sandboxLog: parsed.sandboxLog ?? '',
          lambdaLog: parsed.lambdaLog ?? '',
          timestamp: parsed.timestamp ?? 0,
        });
      } catch {
        // Non-JSON lines (e.g. sandbox log messages) — skip
      }
    }
  }

  // Parse activities log section — CSV with header on first line
  let activitiesLog = '';
  if (activitiesStart >= 0) {
    const sectionEnd = tradeHistoryStart >= 0 ? tradeHistoryStart : content.length;
    activitiesLog = content.slice(activitiesStart + activitiesHeader.length, sectionEnd).trim();
  }

  // Parse trade history section — JSON array
  let tradeHistory: ResultLogTradeHistoryItem[] = [];
  if (tradeHistoryStart >= 0) {
    const rawJson = content.slice(tradeHistoryStart + tradeHistoryHeader.length).trim();
    try {
      tradeHistory = JSON.parse(rawJson);
    } catch {
      tradeHistory = [];
    }
  }

  return {
    submissionId: '',
    activitiesLog,
    logs,
    tradeHistory,
  };
}

