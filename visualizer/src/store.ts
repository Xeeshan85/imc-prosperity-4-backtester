import { MantineColorScheme } from '@mantine/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Algorithm, MonteCarloDashboard } from './models.ts';

export interface State {
  colorScheme: MantineColorScheme;
  algorithm: Algorithm | null;
  monteCarlo: MonteCarloDashboard | null;

  setColorScheme: (colorScheme: MantineColorScheme) => void;
  setAlgorithm: (algorithm: Algorithm | null) => void;
  setMonteCarlo: (mc: MonteCarloDashboard | null) => void;
}

export const useStore = create<State>()(
  persist(
    set => ({
      colorScheme: 'auto',
      algorithm: null,
      monteCarlo: null,

      setColorScheme: colorScheme => set({ colorScheme }),
      setAlgorithm: algorithm => set({ algorithm }),
      setMonteCarlo: monteCarlo => set({ monteCarlo }),
    }),
    {
      name: 'imc-prosperity-4-backtester-visualizer',
      partialize: state => ({
        colorScheme: state.colorScheme,
      }),
    },
  ),
);
