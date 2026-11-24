import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../../components/common/AppText';
import { fetchTeacherLeaveRequest } from '../api/teacherApi';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const STATUS_TONE = {
  APPROVED: { bg: colors.successBg, text: colors.successText, label: 'Approved' },
  PENDING: { bg: colors.warningBg, text: colors.warningText, label: 'Pending' },
  REJECTED: { bg: colors.errorBg, text: colors.errorText, label: 'Rejected' },
  CANCELLED: { bg: colors.neutralBg, text: colors.neutralText, label: 'Cancelled' },
};

function formatDay(iso) { // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Leave detail — theme header + card (not plain text). Back on top. */
export default function LeaveDetailScreen({
  teacherToken,
  route,
  staffName,
  designation,
  onBack,
}) {
  const id = route?.params?.id;
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Leave not found');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchTeacherLeaveRequest(teacherToken, id);
        if (!cancelled) setItem(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load leave');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teacherToken, id]);

  const statusKey = String(item?.status || 'PENDING').toUpperCase();
  const tone = STATUS_TONE[statusKey] || STATUS_TONE.PENDING;
  const from = formatDay(item?.fromDate);
  const to = formatDay(item?.toDate || item?.fromDate);
  const range = from === to ? from : `${from} → ${to}`;
  const halfLabel = item?.halfDay
    ? `Half day ${String(item.halfDaySession || 'MORNING').toLowerCase()}`
    : item?.totalDays != null
      ? `${item.totalDays} day${Number(item.totalDays) === 1 ? '' : 's'}`
      : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.heroTop, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Ionicons name="document-text-outline" size={26} color={colors.white} />
          <AppText variant="heading" color={colors.white} style={{ flex: 1 }}>
            Leave
          </AppText>
        </View>
        <View style={styles.staffCard}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.primary}>
              {(staffName || 'S').charAt(0)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" color={colors.white} style={{ fontWeight: '700' }}>
              {staffName || 'Staff'}
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {designation || 'Staff'}
            </AppText>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.card}>
          <AppText variant="body" color={colors.errorText}>
            {error}
          </AppText>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
            <AppText variant="caption" style={{ color: tone.text, fontWeight: '700' }}>
              {tone.label}
            </AppText>
          </View>
          <AppText variant="heading" style={styles.title}>
            {item?.leaveTypeName || 'Leave'}
          </AppText>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <AppText variant="body" color={colors.textSecondary}>
              {range}
            </AppText>
          </View>
          {halfLabel ? (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <AppText variant="body" color={colors.textSecondary}>
                {halfLabel}
              </AppText>
            </View>
          ) : null}

          <AppText variant="caption" color={colors.textSecondary} style={styles.sectionLabel}>
            Description
          </AppText>
          <View style={styles.messageBox}>
            <AppText variant="subtitle" style={styles.messageText}>
              {item?.reason || 'No description added.'}
            </AppText>
          </View>

          {item?.approverRemarks ? (
            <>
              <AppText variant="caption" color={colors.textSecondary} style={styles.sectionLabel}>
                {statusKey === 'CANCELLED' ? 'Cancellation reason' : 'Management remark'}
              </AppText>
              <View style={styles.messageBox}>
                <AppText variant="subtitle" style={styles.messageText}>
                  {item.approverRemarks}
                </AppText>
              </View>
            </>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  header: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.hero,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.heroBadge,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  card: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    ...shadows.card,
    gap: spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  title: { color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionLabel: {
    marginTop: spacing.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: 11,
  },
  messageBox: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.canvas,
  },
  messageText: { color: colors.textPrimary, lineHeight: 22 },
});
