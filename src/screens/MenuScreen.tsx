import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppStore, selectBestScore, selectLongestSit } from '../store/appStore';
import { FONT, THEMES, ink, ui } from '../theme/themes';

export default function MenuScreen() {
  const themeName = useAppStore(state => state.theme);
  const scores = useAppStore(state => state.scores);
  const play = useAppStore(state => state.play);
  const setScreen = useAppStore(state => state.setScreen);
  const T = THEMES[themeName];
  const best = selectBestScore({ scores });
  const longest = selectLongestSit({ scores });

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <View style={styles.left}>
        <View style={{ gap: 14 }}>
          <View style={[styles.badge, { backgroundColor: T.accent }]}>
            <Text style={[styles.badgeText, { color: T.band }]}>MALECNS v1.0</Text>
          </View>
          <Text style={[styles.title, { color: T.ink }]}>SYNAP{`\n`}FLY</Text>
        </View>
        <Text style={[styles.copy, { color: ink(T, 0.62) }]}>
          Fly. Land on any face. Heal while perched. Detach before the world leaves you behind.
        </Text>
      </View>

      <View style={[styles.right, { backgroundColor: ink(T, 0.05) }]}>
        <View style={styles.stats}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: ink(T, 0.45) }]}>BEST</Text>
            <Text style={[styles.stat, { color: T.accent }]}>{best}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: ink(T, 0.45) }]}>LONGEST SIT</Text>
            <Text style={[styles.stat, { color: T.ink }]}>{longest.toFixed(1)}</Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Pressable style={ui.primaryButton(T)} onPress={play}>
            <Text style={[styles.primaryText, { color: T.band }]}>TAP TO FLY</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Pressable style={[ui.ghostButton(T), { flex: 1 }]} onPress={() => setScreen('settings')}>
              <Text style={[styles.ghostText, { color: ink(T, 0.82) }]}>SETTINGS</Text>
            </Pressable>
            <Pressable style={[ui.ghostButton(T), { flex: 1 }]} onPress={() => setScreen('scores')}>
              <Text style={[styles.ghostText, { color: ink(T, 0.82) }]}>SCORES</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  left: { flex: 1, justifyContent: 'space-between', padding: 34 },
  right: { width: 350, justifyContent: 'space-between', padding: 34 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontFamily: FONT.sans, fontWeight: '700', fontSize: 10, letterSpacing: 1.7 },
  title: { fontFamily: FONT.sans, fontWeight: '800', fontSize: 62, lineHeight: 54, letterSpacing: -2 },
  copy: { fontFamily: FONT.mono, fontSize: 11.5, lineHeight: 18, maxWidth: 330 },
  stats: { flexDirection: 'row', gap: 20 },
  label: { fontFamily: FONT.sans, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  stat: { fontFamily: FONT.sans, fontWeight: '800', fontSize: 40, letterSpacing: -1.2 },
  primaryText: { fontFamily: FONT.sans, fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  ghostText: { fontFamily: FONT.sans, fontWeight: '700', fontSize: 11, letterSpacing: 1.4 }
});
