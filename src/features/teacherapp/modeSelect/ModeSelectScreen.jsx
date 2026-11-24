import { Pressable, StyleSheet, Text, View } from 'react-native';

import { saveTeacherMode } from '../api/teacherApi';
import { colors } from '../../../theme/colors';

/**
 * Shown once when phone is both driver and staff.
 * Saves preferred mode so next login skips this screen.
 */
export default function ModeSelectScreen({ teacherToken, onSelect }) { // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  async function choose(mode) {
    try {
      if (teacherToken) {
        await saveTeacherMode(teacherToken, mode);
      }
    } catch {
      // Why: still open the chosen shell if save fails
    }
    onSelect?.(mode);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>How do you want to continue?</Text>
      <Text style={styles.sub}>You can switch later from More.</Text>
      <Pressable style={styles.btn} onPress={() => choose('TRIP')}>
        <Text style={styles.btnText}>Trip</Text>
      </Pressable>
      <Pressable style={[styles.btn, styles.leave]} onPress={() => choose('LEAVE')}>
        <Text style={styles.btnText}>Leave request</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.canvas, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  sub: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  btn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12 },
  leave: { backgroundColor: '#0F766E' },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
