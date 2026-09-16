import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandMMKVStorage } from './mmkv';
import type { ThemeName } from '../theme/themes';
import type { GameOverPayload } from '../game/engine';

export type AppScreen = 'menu' | 'game' | 'over' | 'settings' | 'scores';
export type PanicMode = 'penalty' | 'fatal';

export type ScoreEntry = {
  score: number;
  landings: number;
  perfect: number;
  bestMult: number;
  panics: number;
  panicHpLost: number;
  panicNetPenalty: number;
  topSpeed: number;
  longestSit: number;
  reason: string;
  at: number;
};

type PersistedSlice = {
  theme: ThemeName;
  panicMode: PanicMode;
  forgiveness: number;
  neuralView: boolean;
  scores: ScoreEntry[];
  last: ScoreEntry | null;
};

type AppState = PersistedSlice & {
  screen: AppScreen;
  runKey: number;
  setScreen: (screen: AppScreen) => void;
  play: () => void;
  setTheme: (theme: ThemeName) => void;
  setPanicMode: (panicMode: PanicMode) => void;
  setForgiveness: (forgiveness: number) => void;
  toggleNeuralView: () => void;
  finishRun: (over: GameOverPayload) => void;
  clearScores: () => void;
};

const defaults: PersistedSlice = {
  theme: 'light',
  panicMode: 'penalty',
  forgiveness: 1,
  neuralView: true,
  scores: [],
  last: null
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...defaults,
      screen: 'menu',
      runKey: 0,
      setScreen: screen => set({ screen }),
      play: () => set(state => ({ screen: 'game', runKey: state.runKey + 1 })),
      setTheme: theme => set({ theme }),
      setPanicMode: panicMode => set({ panicMode }),
      setForgiveness: forgiveness => set({ forgiveness }),
      toggleNeuralView: () => set({ neuralView: !get().neuralView }),
      clearScores: () => set({ scores: [], last: null }),
      finishRun: over => {
        const stats = over.stats;
        const entry: ScoreEntry = {
          score: over.score,
          landings: stats.landings,
          perfect: stats.perfect,
          bestMult: stats.bestMult,
          panics: stats.panics,
          panicHpLost: Math.round(stats.panicHpLost),
          panicNetPenalty: Math.round(stats.panicNetPenalty),
          topSpeed: Math.round(stats.topSpeed),
          longestSit: Number(stats.longestSit.toFixed(1)),
          reason: over.reason,
          at: Date.now()
        };
        const scores = [...get().scores, entry]
          .sort((a, b) => b.score - a.score)
          .slice(0, 20);
        set({ scores, last: entry, screen: 'over' });
      }
    }),
    {
      name: 'synapfly:v2',
      version: 2,
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: state => ({
        theme: state.theme,
        panicMode: state.panicMode,
        forgiveness: state.forgiveness,
        neuralView: state.neuralView,
        scores: state.scores,
        last: state.last
      }),
      migrate: persisted => ({ ...defaults, ...(persisted as Partial<PersistedSlice>) })
    }
  )
);

export const selectBestScore = (state: Pick<AppState, 'scores'>) => state.scores[0]?.score ?? 0;
export const selectLongestSit = (state: Pick<AppState, 'scores'>) =>
  state.scores.reduce((max, score) => Math.max(max, score.longestSit), 0);
