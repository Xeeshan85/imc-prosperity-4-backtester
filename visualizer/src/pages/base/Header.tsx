import { Box, Container, Group, Text, Tooltip } from '@mantine/core';
import { IconChartBar, IconHome, IconEye } from '@tabler/icons-react';
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store.ts';
import classes from './Header.module.css';

export function Header(): ReactNode {
  const location = useLocation();
  const algorithm = useStore(state => state.algorithm);
  const monteCarlo = useStore(state => state.monteCarlo);

  const links = [
    <Link
      key="home"
      to="/"
      className={classes.link}
      data-active={location.pathname === '/' || undefined}
    >
      <Box hiddenFrom="xs">
        <IconHome size={18} />
      </Box>
      <Box visibleFrom="xs">Home</Box>
    </Link>,
  ];

  if (algorithm !== null) {
    links.push(
      <Link
        key="visualizer"
        to="/visualizer"
        className={classes.link}
        data-active={location.pathname === '/visualizer' || undefined}
      >
        <Box hiddenFrom="xs">
          <IconEye size={18} />
        </Box>
        <Box visibleFrom="xs">Visualizer</Box>
      </Link>,
    );
  } else {
    links.push(
      <Tooltip key="visualizer" label="Load a backtest log first">
        <a className={`${classes.link} ${classes.linkDisabled}`}>
          <Box hiddenFrom="xs"><IconEye size={18} /></Box>
          <Box visibleFrom="xs">Visualizer</Box>
        </a>
      </Tooltip>,
    );
  }

  if (monteCarlo !== null) {
    links.push(
      <Link
        key="montecarlo"
        to="/montecarlo"
        className={classes.link}
        data-active={location.pathname === '/montecarlo' || undefined}
      >
        <Box hiddenFrom="xs"><IconChartBar size={18} /></Box>
        <Box visibleFrom="xs">Monte Carlo</Box>
      </Link>,
    );
  } else {
    links.push(
      <Tooltip key="montecarlo" label="Load a session_summary.csv first">
        <a className={`${classes.link} ${classes.linkDisabled}`}>
          <Box hiddenFrom="xs"><IconChartBar size={18} /></Box>
          <Box visibleFrom="xs">Monte Carlo</Box>
        </a>
      </Tooltip>,
    );
  }

  return (
    <header className={classes.header}>
      <Container size="md" className={classes.inner}>
        <Text size="xl" fw={700}>
          <IconEye size={30} className={classes.icon} />
          Prosperity 4 Backtester
        </Text>
        <Group gap={5}>{links}</Group>
      </Container>
    </header>
  );
}
