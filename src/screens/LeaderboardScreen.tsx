import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/appStore';
import { FONT, THEMES, ink, ui } from '../theme/themes';

export default function LeaderboardScreen() {
  const themeName = useAppStore(state => state.theme);
  const scores = useAppStore(state => state.scores);
  const clearScores = useAppStore(state => state.clearScores);
  const setScreen = useAppStore(state => state.setScreen);
  const T = THEMES[themeName];
  const rows = scores.slice(0, 10);
  const columns = [rows.slice(0, 5), rows.slice(5, 10)];

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <View style={styles.head}>
        <Text style={[styles.heading, { color: T.ink }]}>Scores</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {rows.length > 0 && (
            <Pressable style={[ui.ghostButton(T), { paddingHorizontal: 18 }]} onPress={clearScores}>
              <Text style={[styles.ghostText, { color: T.bad }]}>CLEAR</Text>
            </Pressable>
          )}
          <Pressable style={[ui.ghostButton(T), { paddingHorizontal: 20 }]} onPress={() => setScreen('menu')}>
            <Text style={[styles.ghostText, { color: ink(T, 0.82) }]}>BACK</Text>
          </Pressable>
        </View>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: ink(T, 0.5) }]}>No runs yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            {columns.map((column, columnIndex) => (
              <View key={columnIndex} style={{ flex: 1, gap: 2 }}>
                {column.map((entry, index) => {
                  const rank = columnIndex * 5 + index + 1;
                  return (
                    <View
                      key={entry.at}
                      style={[
                        styles.row,
                        {
                          backgroundColor: rank === 1 ? ink(T, 0.08) : 'transparent',
                          borderBottomColor: ink(T, 0.08)
                        }
                      ]}
                    >
                      <Text style={[styles.rank, { color: ink(T, 0.4) }]}>{String(rank).padStart(2, '0')}</Text>
                      <Text style={[styles.rowScore, { color: rank === 1 ? T.accent : T.ink }]}>{entry.score}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.meta, { color: ink(T, 0.5) }]}>{entry.landings} landings · ×{entry.bestMult}</Text>
                        <Text style={[styles.meta, { color: ink(T, 0.35), marginTop: 2 }]}>{entry.longestSit}s sit · {entry.panics} panic</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 34 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  heading: { fontFamily: FONT.sans, fontWeight: '800', fontSize: 28 },
  ghostText: { fontFamily: FONT.sans, fontWeight: '700', fontSize: 11, letterSpacing: 1.4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: FONT.mono, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1 },
  rank: { fontFamily: FONT.mono, fontSize: 11, width: 26 },
  rowScore: { fontFamily: FONT.sans, fontWeight: '800', fontSize: 22, letterSpacing: -0.8, width: 92 },
  meta: { fontFamily: FONT.mono, fontSize: 10 }
});
