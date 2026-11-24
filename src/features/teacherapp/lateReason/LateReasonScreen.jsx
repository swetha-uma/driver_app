import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../../components/common/AppText';
import { fetchTeacherLatePending, submitTeacherLateReason } from '../api/teacherApi';
import { formatLateDuration } from '../utils/formatLateDuration';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

/** Late reason — theme header + card; Back on top. */
export default function LateReasonScreen({ // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  teacherToken,
  staffName,
  designation,
  onBack,
  onSubmitted,
  navigation,
}) {
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  function goBack() {
    if (onBack) onBack();
    else navigation?.goBack?.();
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchTeacherLatePending(teacherToken);
        if (cancelled) return;
        setPending(data);
        if (data?.existingReason) setReason(data.existingReason);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load late status');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teacherToken]);

  async function submit() {
    if (!pending?.attendanceDate) return;
    setSaving(true);
    setError('');
    try {
      await submitTeacherLateReason(teacherToken, {
        attendanceDate: pending.attendanceDate,
        reason,
      });
      // Why: inbox STOPPED — clear Mark as read dialog if it was open
      onSubmitted?.();
      goBack();
    } catch (e) {
      setError(e.message || 'Could not submit');
    } finally {
      setSaving(false);
    }
  }

  const locked = Boolean(pending?.existingReason) && !pending?.pending;
  const empty = pending && !pending.pending && !pending.existingReason;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.heroTop, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={goBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Ionicons name="time-outline" size={26} color={colors.white} />
          <AppText variant="heading" color={colors.white} style={{ flex: 1 }}>
            Late reason
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
      ) : empty ? (
        <View style={styles.card}>
          <AppText variant="title">No pending late reason</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            You are not marked late today, or the reason is already submitted.
          </AppText>
        </View>
      ) : (
        <View style={styles.card}>
          <AppText variant="heading" style={styles.title}>
            Why were you late?
          </AppText>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <AppText variant="body" color={colors.textSecondary}>
              Date: {pending?.attendanceDate || '—'}
            </AppText>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="enter-outline" size={16} color={colors.textSecondary} />
            <AppText variant="body" color={colors.textSecondary}>
              Entry: {pending?.entryTime || '—'}
            </AppText>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="hourglass-outline" size={16} color={colors.textSecondary} />
            <AppText variant="body" color={colors.textSecondary}>
              Late by: {formatLateDuration(pending?.lateMinutes) || '—'}
            </AppText>
          </View>

          <AppText variant="caption" color={colors.textSecondary} style={styles.sectionLabel}>
            Description
          </AppText>
          <TextInput
            style={[styles.input, locked && styles.locked]}
            editable={!locked}
            multiline
            value={reason}
            onChangeText={setReason}
            placeholder="Describe why you were late"
            placeholderTextColor={colors.textMuted}
          />

          {error ? (
            <AppText variant="body" color={colors.errorText}>
              {error}
            </AppText>
          ) : null}

          {!locked ? (
            <Pressable
              style={[styles.submitBtn, saving && styles.submitDisabled]}
              disabled={saving}
              onPress={submit}
            >
              <AppText variant="button" color={colors.white} style={{ fontWeight: '700' }}>
                {saving ? 'Submitting…' : 'Submit'}
              </AppText>
            </Pressable>
          ) : (
            <View style={styles.lockedBanner}>
              <Ionicons name="lock-closed" size={16} color={colors.infoText} />
              <AppText variant="caption" style={{ color: colors.infoText, fontWeight: '600' }}>
                Submitted — locked
              </AppText>
            </View>
          )}
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
  title: { color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionLabel: {
    marginTop: spacing.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: 11,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.canvas,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  locked: { opacity: 0.85 },
  submitBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  lockedBanner: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.infoBg,
  },
});
