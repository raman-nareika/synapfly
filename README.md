# Synapfly MVP — Expo React Native

Android-first Expo React Native MVP for the Synapfly game concept.

This repository is a cleaned-up conversion of the supplied prototype archive. The MVP intentionally keeps **rectangular obstacles**. Organic/polygonal obstacles are deferred until the core flight/landing loop is fun.

## Stack

- Expo SDK 57 / React Native 0.86
- TypeScript
- React Native Skia for the game scene
- Reanimated/Worklets (available for later UI-thread animation work)
- Zustand for application/UI state
- `react-native-mmkv` v4 for persistence
- `react-native-nitro-modules` required by MMKV v4
- Expo Haptics
- Expo Screen Orientation

The high-frequency game simulation is **not** stored in Zustand. The game engine owns a mutable state object and is stepped by `requestAnimationFrame`; Zustand is used for screens, settings, local scores, and persisted app state.

## Why Zustand + MMKV

`src/store/mmkv.ts` follows the `StateStorage` adapter documented by `react-native-mmkv` for Zustand persist middleware. `src/store/appStore.ts` then uses Zustand `persist` + `createJSONStorage` with that adapter.

Persisted data:

- light/dark theme
- emergency escape mode
- landing forgiveness
- Neural View setting
- local top-20 scores
- last result

Not persisted:

- current screen
- active run
- fly position/velocity
- obstacles/camera/neural activity for the current frame

## Setup

Prerequisite: Node 22.13+ (Expo SDK 57 baseline).

```bash
npm install
npx expo prebuild
npm run android
```

MMKV v4 is a native Nitro Module, so use a native/dev build. After changing native dependencies, re-run prebuild/rebuild.

For Android + Skia, make sure the Android SDK/NDK required by React Native Skia is installed.

No custom font files are required. The MVP uses system fonts in both RN screens and Skia.

## Checks

```bash
npm run typecheck
npm test
```

## Controls

- short tap in flight: flap, gain altitude and a small amount of horizontal speed
- repeated quick taps: accelerate and climb
- hold after the initial flap: braking + sustained lift
- tap while attached: detach only; that same press is consumed, so it does not also flap

## MVP gameplay included

- horizontal and vertical fly velocity
- camera speed follows fly speed; the fly is softly kept away from the right edge
- ceiling/floor bands plus generated rectangular obstacles
- attachment to top/bottom/left/right faces
- fly rotation on attachment
- HP and speed-dependent impact damage
- healing + score multiplier while attached
- automatic crawling near the left side of the screen
- panic/emergency escape
- random proportional panic HP penalty or fatal mode
- detach offset + time/distance reattach lock
- local leaderboard
- light/dark themes
- heuristic MaleCNS-inspired Neural View signals

## Important MVP limitation

The displayed LC4/LPLC2/DNp01/DNp07/DNp10 values are currently **gameplay-derived heuristic signals**, not a simulation of the MaleCNS v1.0 connectome. The architecture keeps this layer separate so a real extracted subgraph can replace/augment it later.

## Out of scope for v0.1

- polygon/organic colliders
- crawl paths over irregular art
- neural-background art assets
- actual MaleCNS graph simulation
- sound/music
- online leaderboard/backend
- onboarding
- monetization

See `docs/MVP_SPEC.md` and `docs/AGENT_PROMPT.md`.
