import { Group, Text } from '@mantine/core';
import { Dropzone, FileRejection } from '@mantine/dropzone';
import { IconUpload } from '@tabler/icons-react';
import { ReactNode, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert.tsx';
import { useAsync } from '../../hooks/use-async.ts';
import { ResultLog } from '../../models.ts';
import { useStore } from '../../store.ts';
import { parseAlgorithmLogs } from '../../utils/algorithm.tsx';
import { parseBacktestLog } from '../../utils/parseLog.ts';
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
              resultLog = JSON.parse(trimmed) as ResultLog;
            } else {
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
