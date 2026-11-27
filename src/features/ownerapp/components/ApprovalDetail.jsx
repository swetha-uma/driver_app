import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../../components/common/AppText';
import AppButton from '../../../components/common/AppButton';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const STATUS_TONE = {
  PENDING: { bg: colors.warningBg, text: colors.warningText, label: 'Pending' },
  APPROVED: { bg: colors.successBg, text: colors.successText, label: 'Approved' },
  REJECTED: { bg: colors.errorBg, text: colors.errorText, label: 'Rejected' },
};

function titleCase(text) {
  return text.charAt(0) + text.slice(1).toLowerCase();
}

function RemarksModal({ visible, minLength = 1, onCancel, onConfirm }) {
  const [remarks, setRemarks] = useState('');
  const trimmedLength = remarks.trim().length;
  const tooShort = trimmedLength < minLength;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <AppText variant="title">Reject this request</AppText>
          <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
            Tell them why you&apos;re rejecting it.
          </AppText>
          <TextInput
            style={styles.modalInput}
            placeholder="Reason for rejection"
            placeholderTextColor={colors.textSecondary}
            value={remarks}
            onChangeText={setRemarks}
            multiline
          />
          {minLength > 1 ? (
            <AppText
              variant="caption"
              color={tooShort ? colors.errorText : colors.textSecondary}
            >
              {tooShort
                ? `Enter at least ${minLength} characters (${trimmedLength}/${minLength})`
                : `${trimmedLength}/${minLength} characters`}
            </AppText>
          ) : null}
          <View style={styles.modalRow}>
            <AppButton title="Cancel" variant="outline" onPress={onCancel} style={{ flex: 1 }} />
            <AppButton
              title="Confirm reject"
              variant="danger"
              disabled={tooShort}
              onPress={() => onConfirm(remarks.trim())}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Full detail view for one request — opened by tapping a row in a list.
 * Shows every field passed in `fields`, then Approve / Reject at the bottom.
 * Reject always asks for a reason first, same as the existing approval flow.
 */
export default function ApprovalDetail({
  icon = 'document-text',
  title,
  subtitle,
  status = 'PENDING',
  staffInfo,
  statCards = [],
  fields = [],
  reason,
  decisionNote,
  error,
  busy = false,
  onApprove,
  onReject,
  onBack,
  rejectMinLength = 1,
  children,
}) {
  const [rejectVisible, setRejectVisible] = useState(false);
  const statusKey = String(status || 'PENDING').toUpperCase();
  // Why: a real but unrecognized status (e.g. an advance already "ACTIVE" in recovery)
  // must never be mislabeled "Pending" — show its own name in a neutral tone instead.
  const tone = STATUS_TONE[statusKey] || { bg: colors.neutralBg, text: colors.neutralText, label: titleCase(statusKey) };
  const isPending = statusKey === 'PENDING';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[colors.heroTop, colors.primary, colors.buttonEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Ionicons name={icon} size={24} color={colors.white} />
          <AppText variant="heading" color={colors.white} style={{ flex: 1 }}>
            Request details
          </AppText>
        </View>
      </LinearGradient>

      {staffInfo ? (
        <View style={styles.staffCard}>
          <View style={styles.staffAvatar}>
            <AppText variant="title" color={colors.primary}>
              {(staffInfo.name || '?').trim().charAt(0).toUpperCase()}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" style={{ fontWeight: '700' }}>{staffInfo.name}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {[staffInfo.code, staffInfo.designation].filter(Boolean).join(' · ')}
            </AppText>
          </View>
        </View>
      ) : null}

      {statCards.length ? (
        <View style={styles.statsRow}>
          {statCards.map((s) => (
            <View key={s.label} style={styles.statChip}>
              <AppText variant="heading" style={{ fontSize: 24, lineHeight: 30, color: colors.primary }}>
                {s.value}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} style={{ textAlign: 'center' }}>
                {s.label}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
          <AppText variant="caption" style={{ color: tone.text, fontWeight: '700' }}>
            {tone.label}
          </AppText>
        </View>
        <AppText variant="title" style={{ marginTop: spacing.sm }}>{title}</AppText>
        {subtitle ? (
          <AppText variant="body" color={colors.textSecondary}>{subtitle}</AppText>
        ) : null}

        <View style={styles.fieldsCard}>
          {fields.map((f, index) => (
            <View key={f.label} style={[styles.fieldRow, index === fields.length - 1 && styles.fieldRowLast]}>
              <AppText variant="body" color={colors.textSecondary} style={{ flex: 1 }}>{f.label}</AppText>
              <AppText variant="body" style={{ flex: 1, textAlign: 'right', fontWeight: '700' }}>{f.value || '—'}</AppText>
            </View>
          ))}
        </View>

        {reason ? (
          <View style={styles.reasonBox}>
            <AppText variant="caption" color={colors.textSecondary}>Reason</AppText>
            <AppText variant="body" style={{ marginTop: 4 }}>{reason}</AppText>
          </View>
        ) : null}

      </View>

      {children}

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={colors.errorText} />
          <AppText variant="body" color={colors.errorText} style={{ flex: 1 }}>{error}</AppText>
        </View>
      ) : null}

      {isPending && (onApprove || onReject) ? (
        <View style={styles.actions}>
          {onReject ? (
            <AppButton
              title="Reject"
              variant="danger"
              disabled={busy}
              onPress={() => setRejectVisible(true)}
              style={{ flex: 1 }}
            />
          ) : null}
          {onApprove ? (
            <AppButton
              title="Accept"
              variant="primary"
              disabled={busy}
              onPress={() => onApprove()}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      ) : null}

      <RemarksModal
        visible={rejectVisible}
        minLength={rejectMinLength}
        onCancel={() => setRejectVisible(false)}
        onConfirm={(remarks) => {
          setRejectVisible(false);
          onReject?.(remarks);
        }}
      />
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
  },
  statChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  card: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  fieldsCard: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.canvas,
  },
  fieldRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldRowLast: { borderBottomWidth: 0 },
  reasonBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.canvas,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.errorBg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,27,61,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.hero,
  },
  modalInput: {
    minHeight: 90,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    padding: spacing.sm,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  modalRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
