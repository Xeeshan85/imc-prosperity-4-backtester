import { Group, Text } from '@mantine/core';
import { Dropzone, FileRejection } from '@mantine/dropzone';
import { IconUpload } from '@tabler/icons-react';
import { ReactNode, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert.tsx';
import { useAsync } from '../../hooks/use-async.ts';
import { MonteCarloDashboard, ResultLog } from '../../models.ts';
import { useStore } from '../../store.ts';
import { parseAlgorithmLogs } from '../../utils/algorithm.tsx';
import { computeMonteCarloStats } from '../../utils/metrics.ts';
import { parseBacktestLog, parseSessionSummaryCsv } from '../../utils/parseLog.ts';
import { HomeCard } from './HomeCard.tsx';

function DropzoneContent({ label }: { label: string }): ReactNode {
  return (
    <Group justify="center" gap="xl" style={{ minHeight: 80, pointerEvents: 'none' }}>
      <IconUpload size={40} />
      <Text size="xl" inline>
        {label}
      </Text>
    </Group>
  );
}

// ── Backtest log loader ───────────────────────────────────────────────────────

export function LoadBacktestFromFile(): ReactNode {
  const navigate = useNavigate();
  const [error, setError] = useState<Error>();
  const setAlgorithm = useStore(state => state.setAlgorithm);

  const onDrop = useAsync(
    (files: File[]) =>
      new Promise<void>((resolve, reject) => {
        setError(undefined);
        const reader = new FileReader();

        reader.addEventListener('load', () => {
          try {
            const content = reader.result as string;
            let resultLog: ResultLog;

            const trimmed = content.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              // JSON format (Prosperity API or JSON log)
              resultLog = JSON.parse(trimmed) as ResultLog;
            } else {
              // Text format (prosperity4bt backtester output)
              resultLog = parseBacktestLog(content);
            }

            const algorithm = parseAlgorithmLogs(resultLog);
            setAlgorithm(algorithm);
            navigate('/visualizer');
            resolve();
          } catch (err: any) {
            reject(err);
          }
        });

        reader.addEventListener('error', () => reject(new Error('FileReader error')));
        reader.readAsText(files[0]);
      }),
  );

  const onReject = useCallback((rejections: FileRejection[]) => {
    setError(new Error(rejections.map(r => `${r.file.name}: ${r.errors[0].message}`).join('; ')));
  }, []);

  return (
    <HomeCard title="Load backtest log">
      <Text>
        Supports <b>.log</b> files from <code>prosperity4bt</code> (text format) or JSON logs from the Prosperity API.
        The Logger boilerplate is required for order/position charts; mid-price and indicators charts work without it.
      </Text>

      {error && <ErrorAlert error={error} />}
      {onDrop.error && <ErrorAlert error={onDrop.error} />}

      <Dropzone onDrop={onDrop.call} onReject={onReject} multiple={false} loading={onDrop.loading}>
        <Dropzone.Idle>
          <DropzoneContent label="Drag .log file here or click to select" />
        </Dropzone.Idle>
        <Dropzone.Accept>
          <DropzoneContent label="Drop to load" />
        </Dropzone.Accept>
      </Dropzone>
    </HomeCard>
  );
}

// ── Monte Carlo session_summary.csv loader ───────────────────────────────────

export function LoadMonteCarloFromFile(): ReactNode {
  const navigate = useNavigate();
  const [error, setError] = useState<Error>();
  const setMonteCarlo = useStore(state => state.setMonteCarlo);

  const onDrop = useAsync(
    (files: File[]) =>
      new Promise<void>((resolve, reject) => {
        setError(undefined);
        const reader = new FileReader();

        reader.addEventListener('load', () => {
          try {
            const content = reader.result as string;
            const trimmed = content.trim();

            let dashboard: MonteCarloDashboard;

            if (trimmed.startsWith('{')) {
              // Full dashboard.json from prosperity4mcbt
              const raw = JSON.parse(trimmed);
              const pnlValues: number[] = raw.sessions?.map((s: any) => s.total_pnl ?? 0) ?? [];
              dashboard = {
                sessions: raw.sessions ?? [],
                stats: computeMonteCarloStats(pnlValues),
                productStats: raw.productStats,
              };
            } else {
              // session_summary.csv from the Rust Monte Carlo engine
              const rows = parseSessionSummaryCsv(content);
              if (rows.length === 0) throw new Error('No rows found in CSV');
              const pnlValues = rows.map(r => r['total_pnl'] ?? 0);
              dashboard = {
                sessions: rows as any,
                stats: computeMonteCarloStats(pnlValues),
              };
            }

            setMonteCarlo(dashboard);
            navigate('/montecarlo');
            resolve();
          } catch (err: any) {
            reject(err);
          }
        });

        reader.addEventListener('error', () => reject(new Error('FileReader error')));
        reader.readAsText(files[0]);
      }),
  );

  const onReject = useCallback((rejections: FileRejection[]) => {
    setError(new Error(rejections.map(r => `${r.file.name}: ${r.errors[0].message}`).join('; ')));
  }, []);

  return (
    <HomeCard title="Load Monte Carlo results">
      <Text>
        Load a <code>session_summary.csv</code> (from the Rust Monte Carlo engine) or a <code>dashboard.json</code>{' '}
        (from <code>prosperity4mcbt</code>) to view Monte Carlo P&amp;L distribution and statistics.
      </Text>

      {error && <ErrorAlert error={error} />}
      {onDrop.error && <ErrorAlert error={onDrop.error} />}

      <Dropzone onDrop={onDrop.call} onReject={onReject} multiple={false} loading={onDrop.loading}>
        <Dropzone.Idle>
          <DropzoneContent label="Drag session_summary.csv or dashboard.json here" />
        </Dropzone.Idle>
        <Dropzone.Accept>
          <DropzoneContent label="Drop to load" />
        </Dropzone.Accept>
      </Dropzone>
    </HomeCard>
  );
}
