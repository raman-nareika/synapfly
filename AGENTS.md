# Synapfly repository instructions

## Goal
Ship a small, playable Android-first Expo React Native MVP before adding art complexity or backend features.

## Repository status
This is the starter scaffold for the first implementation pass. Existing code must be verified against `docs/MVP_SPEC.md`; do not treat presence of code as proof that a feature is complete or accepted.

## Architecture rules
1. Keep the pure game engine under `src/game/engine.ts` independent of React and platform APIs.
2. Do not move per-frame game state into Zustand/React state.
3. Zustand is for application state/settings/results only.
4. Persist Zustand through the MMKV adapter in `src/store/mmkv.ts`; do not reintroduce AsyncStorage.
5. Keep obstacles rectangular for MVP.
6. Skia renderer reads engine state and never mutates it.
7. A tap while attached performs DETACH only. It must not also flap until the finger is released and pressed again.
8. Collision is always active. Reattach protection must disable ATTACH, never the collider itself.
9. HP never changes flight physics.
10. In penalty panic mode, emergency escape cannot directly reduce HP below 1.

## Native/tooling rules
- Expo SDK 57 stable baseline.
- MMKV v4 requires `react-native-nitro-modules` and a native/dev build.
- Do not add a manual Reanimated Babel plugin for this Expo baseline unless a concrete dependency requires it; `babel-preset-expo` configures it.
- Prefer `npx expo install` for Expo-managed native libraries when changing dependencies.

## Before declaring a task complete
Run:

```bash
npm run typecheck
npm test
```

For gameplay changes, manually verify:
- attach all four faces
- detach from ceiling obstacle falls; detach from floor obstacle rises
- same surface cannot instantly reattach
- fast collision damages HP
- safe low-speed contact attaches
- healing is capped at 100
- panic penalty obeys critical-HP rule
- camera cannot allow the fly to escape off the right side
- left-behind death still works
