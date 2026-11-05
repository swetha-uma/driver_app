import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { radii, shadows } from '../../../theme/theme';

export default StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingBottom: spacing.lg, gap: spacing.md },
  header: { minHeight: 232, marginHorizontal: spacing.md, marginTop: spacing.md, padding: spacing.md, paddingBottom: spacing.lg, borderRadius: radii.xl, overflow: 'hidden', ...shadows.hero },
  headerGlow: { position: 'absolute', width: 190, height: 190, borderRadius: radii.pill, right: -44, top: -100, backgroundColor: colors.heroCircle },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  backButton: { width: 56, height: 56, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.heroBadge },
  headerTitle: { flex: 1, fontSize: 30, lineHeight: 36 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.heroBadge, borderWidth: 1, borderColor: colors.heroBadgeBorder },
  studentCard: { flexDirection: 'row', alignItems: 'center', minHeight: 90, padding: spacing.sm, borderRadius: radii.lg, backgroundColor: 'rgba(255, 255, 255, 0.18)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)' },
  avatar: { width: 56, height: 56, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  avatarText: { fontSize: 28 },
  studentCopy: { flex: 1, marginLeft: spacing.sm, gap: spacing.xs },
  studentName: { fontWeight: '700' },
  switchButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.white },
  switchLabel: { fontWeight: '700' },
  profileCard: { alignItems: 'center', padding: spacing.lg, marginHorizontal: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface, ...shadows.card },
  profileAvatar: { width: 144, height: 144, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  profileAvatarText: { fontSize: 72 },
  profileName: { marginTop: spacing.md },
  detailsCard: { paddingHorizontal: spacing.md, marginHorizontal: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface, ...shadows.card },
  detailRow: {
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  // Why: address / long values need label above value so text can wrap left-aligned
  detailRowStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.xs,
    minHeight: 0,
    paddingVertical: spacing.md,
  },
  detailLabel: { flex: 1, color: colors.textSecondary },
  detailValue: { flex: 1, textAlign: 'right', color: colors.textPrimary, fontWeight: '700' },
  detailLabelStacked: {
    color: colors.textSecondary,
  },
  detailValueStacked: {
    textAlign: 'left',
    color: colors.textPrimary,
    fontWeight: '700',
    lineHeight: 22,
  },
  lockedNote: { paddingVertical: spacing.md, color: colors.textSecondary },
  actionButton: { height: 64, marginHorizontal: spacing.md, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.primary },
  secondaryAction: { height: 64, marginHorizontal: spacing.md, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.primarySoft },
});
