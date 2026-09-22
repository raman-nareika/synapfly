import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

// Reuse one MMKV instance for the whole app, as recommended by react-native-mmkv.
export const mmkv = createMMKV({ id: 'synapfly-storage' });

// Official react-native-mmkv wrapper shape for Zustand persist middleware.
export const zustandMMKVStorage: StateStorage = {
  setItem: (name, value) => {
    mmkv.set(name, value);
  },
  getItem: name => mmkv.getString(name) ?? null,
  removeItem: name => {
    mmkv.remove(name);
  }
};
