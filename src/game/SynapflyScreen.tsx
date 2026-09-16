import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Canvas, Picture, createPicture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import { createGame } from './engine';
import { createPaintCache, createSkiaPainter } from './render/painters';
import { drawFrame } from './render/drawFrame';
import { THEMES } from '../theme/themes';
import type { PanicMode } from '../store/appStore';
import type { ThemeName } from '../theme/themes';
import type { GameOverPayload } from './engine';

const LOGICAL = { W: 844, H: 390 };

type Props = {
  themeName: ThemeName;
  panicMode: PanicMode;
  forgiveness: number;
  neuralView: boolean;
  onGameOver: (payload: GameOverPayload) => void;
};

export default function SynapflyScreen({
  themeName,
  panicMode,
  forgiveness,
  neuralView,
  onGameOver
}: Props) {
  const { width, height } = useWindowDimensions();
  // Must start as a real (empty) Picture, not null: react-native-skia's native
  // prop converter for <Picture> has no null-handling and throws on first mount,
  // before the render-loop effect below has produced a real frame.
  const picture = useSharedValue<any>(createPicture(() => {}, { x: 0, y: 0, width: 1, height: 1 }));
  const T = useMemo(() => THEMES[themeName], [themeName]);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => { onGameOverRef.current = onGameOver; }, [onGameOver]);

  const gameRef = useRef<ReturnType<typeof createGame> | null>(null);
  if (!gameRef.current) {
    gameRef.current = createGame({
      width: LOGICAL.W,
      height: LOGICAL.H,
      panicMode,
      landingForgiveness: forgiveness
    });
  }
  const game = gameRef.current;

  const paintCacheRef = useRef<Map<string, any> | null>(null);
  if (!paintCacheRef.current) paintCacheRef.current = createPaintCache();

  useEffect(() => {
    game.setOptions({ panicMode, landingForgiveness: forgiveness });
  }, [game, panicMode, forgiveness]);

  const stage = useMemo(() => {
    const scale = Math.min(width / LOGICAL.W, height / LOGICAL.H);
    return {
      scale,
      offsetX: (width - LOGICAL.W * scale) / 2,
      offsetY: (height - LOGICAL.H * scale) / 2
    };
  }, [width, height]);

  // Read by the render loop below, which must not restart on every resize/rotation
  // (that would reset its "already handled" edge-detection state - see loop comment).
  const latestRef = useRef({ neuralView, stage, T, width, height });
  latestRef.current = { neuralView, stage, T, width, height };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let time = 0;
    let previousPose = game.pose();
    let previousOver = false;
    let previousEventId = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
      last = now;
      time += dt;
      game.step(dt);
      const state = game.state;
      const pose = game.pose();

      if (pose === 'attach' && previousPose !== 'attach' && previousPose !== 'danger') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (state.event && state.event.id !== previousEventId) {
        previousEventId = state.event.id;
        if (state.event.type === 'panic') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else if (state.event.type === 'hit') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
      if (state.over && !previousOver) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onGameOverRef.current(state.over);
      }
      previousPose = pose;
      previousOver = Boolean(state.over);

      const { neuralView, stage, T, width, height } = latestRef.current;
      picture.value = createPicture(canvas => {
        canvas.save();
        canvas.translate(stage.offsetX, stage.offsetY);
        canvas.scale(stage.scale, stage.scale);
        drawFrame(createSkiaPainter(canvas, paintCacheRef.current!), game, T, time, {
          hideGameOver: true,
          neuralView
        });
        canvas.restore();
      }, { x: 0, y: 0, width, height });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game, picture]);

  const onPressIn = useCallback(() => {
    game.pressStart();
  }, [game]);

  const onPressOut = useCallback(() => {
    game.pressEnd();
  }, [game]);

  return (
    <Pressable
      style={[styles.fill, { backgroundColor: T.bg }]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Canvas style={styles.fill}>
        <Picture picture={picture} />
      </Canvas>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 }
});
