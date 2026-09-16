import React, { useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useAppStore } from './store/appStore';
import { THEMES } from './theme/themes';
import MenuScreen from './screens/MenuScreen';
import SettingsScreen from './screens/SettingsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import GameOverScreen from './screens/GameOverScreen';
import SynapflyScreen from './game/SynapflyScreen';

export default function App() {
  const screen = useAppStore(state => state.screen);
  const themeName = useAppStore(state => state.theme);
  const panicMode = useAppStore(state => state.panicMode);
  const forgiveness = useAppStore(state => state.forgiveness);
  const neuralView = useAppStore(state => state.neuralView);
  const runKey = useAppStore(state => state.runKey);
  const finishRun = useAppStore(state => state.finishRun);
  const T = THEMES[themeName];

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar hidden />
      {screen === 'menu' && <MenuScreen />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'scores' && <LeaderboardScreen />}
      {screen === 'over' && <GameOverScreen />}
      {screen === 'game' && (
        <SynapflyScreen
          key={runKey}
          themeName={themeName}
          panicMode={panicMode}
          forgiveness={forgiveness}
          neuralView={neuralView}
          onGameOver={finishRun}
        />
      )}
    </View>
  );
}
