import { Platform } from 'react-native';

export type ThemeName = 'light' | 'dark';

export type GameTheme = {
  bg: string;
  band: string;
  obs: string;
  edge: string;
  ink: string;
  inkRGB: string;
  accent: string;
  warn: string;
  bad: string;
};

export const THEMES: Record<ThemeName, GameTheme> = {
  light: {
    bg: '#EEF7F3',
    band: '#D8EAE3',
    obs: '#BFD8CF',
    edge: 'rgba(24,52,47,0.18)',
    ink: '#18342F',
    inkRGB: '24,52,47',
    accent: '#17A58F',
    warn: '#D88B20',
    bad: '#D64D45'
  },
  dark: {
    bg: '#10262A',
    band: '#09191C',
    obs: '#17363A',
    edge: 'rgba(236,251,247,0.16)',
    ink: '#ECFBF7',
    inkRGB: '236,251,247',
    accent: '#41D1B8',
    warn: '#F1A13A',
    bad: '#FF655A'
  }
};

export const FONT = {
  sans: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: undefined }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined })
};

export const ink = (theme: GameTheme, alpha: number) =>
  `rgba(${theme.inkRGB},${alpha})`;

export const ui = {
  primaryButton: (theme: GameTheme) => ({
    height: 56,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.accent
  }),
  ghostButton: (theme: GameTheme) => ({
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: ink(theme, 0.2)
  })
};
