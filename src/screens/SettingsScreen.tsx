import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/appStore';
import { FONT, THEMES, ink, ui, type ThemeName } from '../theme/themes';

function ThemeCard({ name, themeKey }: { name: string; themeKey: ThemeName }) {
  const selectedTheme = useAppStore(state => state.theme);
  const setTheme = useAppStore(state => state.setTheme);
  const T = THEMES[selectedTheme];
  const palette = THEMES[themeKey];
  const selected = selectedTheme === themeKey;
  return (
    <Pressable
      onPress={() => setTheme(themeKey)}
      style={[
        styles.card,
        { borderColor: selected ? T.accent : ink(T, 0.14), backgroundColor: selected ? ink(T, 0.06) : 'transparent' }
      ]}
    >
      <View style={styles.preview}>
        <View style={{ width: 14, backgroundColor: palette.band }} />
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          <View style={[styles.previewFloor, { backgroundColor: palette.obs, borderTopColor: palette.accent }]} />
          <View style={[styles.previewCeil, { backgroundColor: palette.obs, borderBottomColor: palette.accent }]} />
        </View>
        <View style={{ width: 14, backgroundColor: palette.band }} />
      </View>
      <View style={styles.cardRow}>
        <Text style={{ fontFamily: FONT.sans, fontWeight: '700', fontSize: 12, color: T.ink }}>{name}</Text>
        <View style={[styles.radio, selected ? { backgroundColor: T.accent, borderColor: T.accent } : { borderColor: ink(T, 0.3) }]} />
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const themeName = useAppStore(state => state.theme);
  const panicMode = useAppStore(state => state.panicMode);
  const forgiveness = useAppStore(state => state.forgiveness);
  const neuralView = useAppStore(state => state.neuralView);
  const setPanicMode = useAppStore(state => state.setPanicMode);
  const setForgiveness = useAppStore(state => state.setForgiveness);
  const toggleNeuralView = useAppStore(state => state.toggleNeuralView);
  const setScreen = useAppStore(state => state.setScreen);
  const T = THEMES[themeName];

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <View style={[styles.nav, { backgroundColor: ink(T, 0.06) }]}>
        <View style={{ gap: 12 }}>
          <Text style={[styles.heading, { color: T.ink }]}>Settings</Text>
          <Text style={[styles.note, { color: ink(T, 0.5) }]}>MVP · rectangular obstacles</Text>
        </View>
        <Pressable style={ui.ghostButton(T)} onPress={() => setScreen('menu')}>
          <Text style={[styles.ghostText, { color: ink(T, 0.82) }]}>BACK</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        <SectionLabel color={ink(T, 0.45)}>THEME</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><ThemeCard name="LIGHT" themeKey="light" /></View>
          <View style={{ flex: 1 }}><ThemeCard name="DARK" themeKey="dark" /></View>
        </View>

        <SectionLabel color={ink(T, 0.45)}>EMERGENCY ESCAPE</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {([
            ['penalty', 'HP PENALTY', 'Auto escape cancels healing and applies a random proportional penalty.'],
            ['fatal', 'FATAL', 'Panic takeoff ends the run.']
          ] as const).map(([key, title, subtitle]) => {
            const selected = panicMode === key;
            return (
              <Pressable
                key={key}
                onPress={() => setPanicMode(key)}
                style={{ flex: 1, padding: 14, backgroundColor: selected ? T.accent : ink(T, 0.06) }}
              >
                <Text style={{ fontFamily: FONT.sans, fontWeight: '700', fontSize: 11, color: selected ? T.band : T.ink }}>{title}</Text>
                <Text style={{ fontFamily: FONT.mono, fontSize: 9.5, lineHeight: 14, marginTop: 5, color: selected ? T.band : ink(T, 0.48) }}>{subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={toggleNeuralView} style={[styles.row, { backgroundColor: ink(T, 0.05) }]}>
          <Text style={{ fontFamily: FONT.sans, fontWeight: '700', fontSize: 11, color: T.ink }}>NEURAL VIEW</Text>
          <View style={[styles.switch, { backgroundColor: neuralView ? T.accent : ink(T, 0.12), justifyContent: neuralView ? 'flex-end' : 'flex-start' }]}>
            <View style={{ width: 16, height: 16, backgroundColor: neuralView ? T.band : ink(T, 0.6) }} />
          </View>
        </Pressable>

        <SectionLabel color={ink(T, 0.45)}>LANDING FORGIVENESS · {forgiveness.toFixed(1)}×</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {[0.8, 1, 1.2, 1.4].map(value => {
            const selected = Math.abs(forgiveness - value) < 0.01;
            return (
              <Pressable
                key={value}
                onPress={() => setForgiveness(value)}
                style={{ flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? T.accent : ink(T, 0.06) }}
              >
                <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: selected ? T.band : T.ink }}>{value.toFixed(1)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return <Text style={{ fontFamily: FONT.sans, fontWeight: '700', fontSize: 10, letterSpacing: 2, color }}>{children}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  nav: { width: 246, justifyContent: 'space-between', padding: 30 },
  body: { padding: 34, gap: 14 },
  heading: { fontFamily: FONT.sans, fontWeight: '800', fontSize: 28 },
  note: { fontFamily: FONT.mono, fontSize: 10 },
  card: { padding: 13, borderWidth: 2 },
  preview: { flexDirection: 'row', height: 52, overflow: 'hidden' },
  previewFloor: { position: 'absolute', left: 18, bottom: 0, width: 38, height: 26, borderTopWidth: 3 },
  previewCeil: { position: 'absolute', right: 16, top: 0, width: 30, height: 20, borderBottomWidth: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
  radio: { width: 15, height: 15, borderRadius: 15, borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  switch: { width: 38, height: 20, flexDirection: 'row', alignItems: 'center', padding: 2 },
  ghostText: { fontFamily: FONT.sans, fontWeight: '700', fontSize: 11, letterSpacing: 1.4 }
});
