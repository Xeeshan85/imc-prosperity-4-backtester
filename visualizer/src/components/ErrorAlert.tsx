import { Alert, AlertProps, Code, List, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { ReactNode } from 'react';
import { AlgorithmParseError } from '../utils/algorithm.tsx';

export interface ErrorAlertProps extends Partial<AlertProps> {
  error: Error;
}

export function ErrorAlert({ error, ...alertProps }: ErrorAlertProps): ReactNode {
  return (
    <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" {...alertProps}>
      {error instanceof AlgorithmParseError && (
        <>
          <Text fw="bold">If using the Logger boilerplate, double-check:</Text>
          <List>
            <List.Item>
              Your code contains the <Code>Logger</Code> class and calls <Code>logger.flush()</Code> at the end of{' '}
              <Code>Trader.run()</Code>.
            </List.Item>
            <List.Item>
              Your code uses <Code>logger.print()</Code> instead of Python&apos;s builtin <Code>print()</Code>.
            </List.Item>
          </List>
        </>
      )}
      {error instanceof AlgorithmParseError ? error.node : error.message}
    </Alert>
  );
}
