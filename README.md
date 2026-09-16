# Synapfly MVP — Expo React Native

Android-first Expo React Native MVP for Synapfly: a one-touch 2D endless arcade game about fly-like flight, landing on obstacle surfaces, HP recovery while perched, and MaleCNS-inspired autonomous reactions.

## Repository status

This repository is the **starter scaffold for the first MVP**. Treat the code that is already present as a baseline/reference implementation, not as evidence that a feature has been fully implemented or accepted. The first coding pass must build and run the native app, verify every acceptance criterion, and fix/complete anything that does not match `docs/MVP_SPEC.md`.

The MVP intentionally keeps **rectangular AABB obstacles**. Organic/polygonal obstacles and final neural-brain art are deferred until the core flight/landing loop is fun and stable.

The original visual/prototype reference is kept under `reference/` only for comparison. Runtime code must live under `src/`.

## Stack

- Expo SDK 57 / React Native 0.86
- TypeScript
- React Native Skia for the game scene
- Reanimated/Worklets available for animation/UI-thread work
- Zustand for application/UI state
- `react-native-mmkv` v4 for persistence
- `react-native-nitro-modules` required by MMKV v4
- Expo Haptics
- Expo Screen Orientation

The high-frequency game simulation is **not** stored in Zustand. The game engine owns mutable run state and is stepped independently of React render state; Zustand is for screens, settings, local scores, and persisted app state.

## Zustand + MMKV

`src/store/mmkv.ts` follows the MMKV `StateStorage` adapter pattern for Zustand persist middleware documented by `react-native-mmkv`:

https://github.com/margelo/react-native-mmkv/blob/main/docs/WRAPPER_ZUSTAND_PERSIST_MIDDLEWARE.md

`src/store/appStore.ts` uses Zustand `persist` + `createJSONStorage` with that adapter.

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

Do not replace this with AsyncStorage.

## Starter scaffold decisions to preserve

These are current product/technical decisions for MVP v0.1, not migration history:

- Keep the pure game-engine approach separate from React/platform APIs.
- Use Skia for gameplay rendering.
- Keep the game landscape-first.
- Keep menu, settings, game-over, and local leaderboard flow.
- Keep HP, healing, score, emergency escape, Neural View, and the logical stage size `844×390` unless a concrete implementation issue requires a documented change.
- Use TypeScript throughout app/runtime code.
- Use Zustand for app state and MMKV v4 for persistence through the documented Zustand `StateStorage` wrapper.
- Light and Dark are the two MVP themes; Light is default.
- Theme tokens must be complete for every renderer value they expose; do not depend on missing derived color tokens.
- No external TTF files are required for MVP; use system fonts unless design work later explicitly adds bundled fonts.
- Input must distinguish press start/end so a short tap and a hold can have different behavior.
- A press while attached is consumed as **detach only**; it must not also flap.
- Detach direction depends on whether the obstacle is anchored to ceiling or floor.
- Same-face reattach protection requires both elapsed time and physical separation; collision itself stays enabled.
- Landing requires the fly to be approaching the contacted surface.
- Landing thresholds must enforce meaningful low-speed landing rather than allowing nearly any tangential speed.
- Collision stepping must scale with movement speed (or use an equivalent anti-tunneling solution), not rely on one fixed coarse step count.
- Panic rescue must impose a real HP cost even at the `H0 = MIN_HIT_DAMAGE + 1` boundary case.
- Panic feedback should report the **actual visible HP drop**; stats may separately track net panic penalty relative to HP-at-landing.
- Haptics must trigger once per event occurrence/event ID, not repeatedly while an event remains visible for multiple frames.
- The logical stage must remain centered/letterboxed on devices with different aspect ratios.

## Setup

Prerequisite: Node 22.13+ for this project baseline.

```bash
npm install
npx expo prebuild
npm run android
```

MMKV v4 is a native Nitro Module, so use a native/dev build. After changing native dependencies, re-run prebuild/rebuild.

For Android + Skia, make sure the Android SDK/NDK required by React Native Skia is installed.

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

## MVP gameplay target

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

The displayed LC4/LPLC2/DNp01/DNp07/DNp10 values are **gameplay-derived heuristic signals**, not a simulation of the MaleCNS v1.0 connectome. Keep this explicit in code comments and product copy. The architecture should keep this layer separate so a real extracted subgraph can replace/augment it later.

## Out of scope for v0.1

- polygon/organic colliders
- crawl paths over irregular art
- final neural-background/obstacle art assets
- actual MaleCNS graph simulation
- sound/music
- online leaderboard/backend
- onboarding
- monetization

See `docs/MVP_SPEC.md` for requirements and `docs/AGENT_PROMPT.md` for the implementation task.
