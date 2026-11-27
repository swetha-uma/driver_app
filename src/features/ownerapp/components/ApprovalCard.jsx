import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
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

/** One row in a request list — tap it to open the full detail + Approve/Reject screen. */
export default function ApprovalCard({ icon = 'document-text', title, subtitle, status = 'PENDING', onPress }) {
  const statusKey = String(status || 'PENDING').toUpperCase();
  // Why: a real but unrecognized status (e.g. an advance already "ACTIVE" in recovery)
  // must never be mislabeled "Pending" — show its own name in a neutral tone instead.
  const tone = STATUS_TONE[statusKey] || { bg: colors.neutralBg, text: colors.neutralText, label: titleCase(statusKey) };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" style={{ fontWeight: '700' }}>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textSecondary}>{subtitle}</AppText>
        ) : null}
      </View>
      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
        <AppText variant="caption" style={{ color: tone.text, fontWeight: '700' }}>
          {tone.label}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    ...shadows.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
});
