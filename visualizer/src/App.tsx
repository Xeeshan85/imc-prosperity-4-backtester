import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/code-highlight/styles.css';

import { createTheme, MantineProvider } from '@mantine/core';
import { ReactNode } from 'react';
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom';
import { BasePage } from './pages/base/BasePage.tsx';
import { HomePage } from './pages/home/HomePage.tsx';
import { MonteCarloPage } from './pages/montecarlo/MonteCarloPage.tsx';
import { VisualizerPage } from './pages/visualizer/VisualizerPage.tsx';
import { useStore } from './store.ts';

const theme = createTheme({
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
});

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<BasePage />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/visualizer" element={<VisualizerPage />} />
      <Route path="/montecarlo" element={<MonteCarloPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Route>,
  ),
  { basename: import.meta.env.BASE_URL },
);

export function App(): ReactNode {
  const colorScheme = useStore(state => state.colorScheme);

  return (
    <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
      <RouterProvider router={router} />
    </MantineProvider>
  );
}
