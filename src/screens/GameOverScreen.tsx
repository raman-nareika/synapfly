import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/appStore';
import { FONT, THEMES, ink, ui } from '../theme/themes';

export default function GameOverScreen() {
  const themeName = useAppStore(state => state.theme);
  const entry = useAppStore(state => state.last);
  const play = useAppStore(state => state.play);
  const setScreen = useAppStore(state => state.setScreen);
  const T = THEMES[themeName];
  const e = entry;

  const share = () => {
    if (!e) return;
    void Share.share({
      message: `Synapfly — ${e.score} points, ${e.landings} landings, ×${e.bestMult}`
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: T.band }]}>
      <View style={styles.left}>
        <View style={{ gap: 20 }}>
          <View style={[styles.plate, { backgroundColor: T.bad }]}>
            <Text style={[styles.crashed, { color: T.band }]}>CRASHED</Text>
          </View>
          <View>
            <Text style={[styles.label, { color: ink(T, 0.45) }]}>SCORE</Text>
            <Text style={[styles.score, { color: T.accent }]}>{e?.score ?? 0}</Text>
          </View>
        </View>

        <View style={{ gap: 9 }}>
          <Pressable style={ui.primaryButton(T)} onPress={play}>
            <Text style={[styles.primaryText, { color: T.band }]}>PLAY AGAIN</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Pressable style={[ui.ghostButton(T), { flex: 1 }]} onPress={() => setScreen('menu')}>
              <Text style={[styles.ghostText, { color: ink(T, 0.82) }]}>MENU</Text>
            </Pressable>
            <Pressable style={[ui.ghostButton(T), { flex: 1 }]} onPress={share}>
              <Text style={[styles.ghostText, { color: ink(T, 0.82) }]}>SHARE</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={[styles.right, { backgroundColor: ink(T, 0.04) }]}>
        <View>
          <Metric T={T} name="LANDINGS" value={`${e?.landings ?? 0} · ${e?.perfect ?? 0} perfect`} />
          <Metric T={T} name="BEST MULTIPLIER" value={`×${e?.bestMult ?? 1}`} />
          <Metric T={T} name="PANIC ESCAPES" value={`${e?.panics ?? 0} · −${e?.panicHpLost ?? 0} HP`} accent={T.warn} />
          <Metric T={T} name="NET PANIC COST" value={`−${e?.panicNetPenalty ?? 0} HP`} />
          <Metric T={T} name="LONGEST SIT" value={`${e?.longestSit ?? 0}s`} />
          <Metric T={T} name="TOP AIR SPEED" value={`${e?.topSpeed ?? 0} px/s`} />
        </View>
        <View style={[styles.noteBox, { borderLeftColor: T.warn, backgroundColor: ink(T, 0.05) }]}>
          <Text style={[styles.note, { color: T.warn }]}>{hintFor(e?.reason)}</Text>
        </View>
      </View>
    </View>
  );
}

function Metric({ T, name, value, accent }: { T: (typeof THEMES)['light']; name: string; value: string; accent?: string }) {
  return (
    <View style={[styles.metric, { borderBottomColor: ink(T, 0.1) }]}>
      <Text style={[styles.metricText, { color: ink(T, 0.55) }]}>{name}</Text>
      <Text style={[styles.metricText, { color: accent ?? T.ink }]}>{value}</Text>
    </View>
  );
}

function hintFor(reason?: string) {
  if (reason === 'PANIC ESCAPE FAILED') return 'Hardcore mode: panic does not save the run.';
  if (reason === 'LEFT BEHIND') return 'Detach earlier. Crawling only buys time; it never replaces player input.';
  return 'HP depleted. Use safe landings to recover health before the next risky section.';
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  left: { flex: 1, justifyContent: 'space-between', padding: 34 },
  right: { width: 390, justifyContent: 'space-between', padding: 34 },
  plate: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9 },
  crashed: { fontFamily: FONT.sans, fontWeight: '800', fontSize: 19 },
  label: { fontFamily: FONT.sans, fontWeight: '700', fontSize: 10, letterSpacing: 2 },
  score: { fontFamily: FONT.sans, fontWeight: '800', fontSize: 74, lineHeight: 76, letterSpacing: -3 },
  primaryText: { fontFamily: FONT.sans, fontWeight: '800', fontSize: 14, letterSpacing: 2 },
  ghostText: { fontFamily: FONT.sans, fontWeight: '700', fontSize: 11, letterSpacing: 1.4 },
  metric: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  metricText: { fontFamily: FONT.mono, fontSize: 11.5 },
  noteBox: { padding: 14, borderLeftWidth: 3 },
  note: { fontFamily: FONT.mono, fontSize: 10.5, lineHeight: 16 }
});
