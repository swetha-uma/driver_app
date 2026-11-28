import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
import OwnerHeader from '../components/OwnerHeader';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

function formatEntryTime(value) {
  if (!value) return 'Entry time unavailable';
  const [rawHour, rawMinute] = String(value).split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return String(value);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export default function TodayLateScreen({ ownerName, rows = [], onBack }) {
  return (
    <View style={styles.screen}>
      <OwnerHeader icon="time-outline" title="Today’s late" ownerName={ownerName} subtitle="Owner" />
      <Pressable onPress={onBack} style={styles.back} accessibilityRole="button">
        <Ionicons name="arrow-back" size={20} color={colors.primary} />
        <AppText variant="body" style={{ color: colors.primary, fontWeight: '700' }}>Back to Home</AppText>
      </Pressable>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <AppText variant="label">Late today ({rows.length})</AppText>
        {rows.length ? rows.map((row) => (
          <View key={row.id} style={styles.personCard}>
            <View style={styles.avatar}>
              <AppText variant="subtitle" style={{ color: colors.primary, fontWeight: '700' }}>
                {(row.staffName || '?').trim().charAt(0).toUpperCase()}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={{ fontWeight: '700' }}>{row.staffName || 'Staff'}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {row.designation || 'Designation not set'}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Entry time: {formatEntryTime(row.entryTime)}
              </AppText>
            </View>
          </View>
        )) : (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={28} color={colors.successText} />
            <AppText variant="body" color={colors.textSecondary}>No staff or teachers marked late today.</AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  personCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radii.xl, padding: spacing.md, ...shadows.card },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.white, borderRadius: radii.xl, ...shadows.card },
});
