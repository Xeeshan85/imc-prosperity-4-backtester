import { MantineColorScheme } from '@mantine/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Algorithm } from './models.ts';

export interface State {
  colorScheme: MantineColorScheme;
  algorithm: Algorithm | null;

  setColorScheme: (colorScheme: MantineColorScheme) => void;
  setAlgorithm: (algorithm: Algorithm | null) => void;
}

export const useStore = create<State>()(
  persist(
    set => ({
      colorScheme: 'auto',
      algorithm: null,

      setColorScheme: colorScheme => set({ colorScheme }),
      setAlgorithm: algorithm => set({ algorithm }),
    }),
    {
      name: 'imc-prosperity-4-backtester-visualizer',
      partialize: state => ({
        colorScheme: state.colorScheme,
      }),
    },
  ),
);
