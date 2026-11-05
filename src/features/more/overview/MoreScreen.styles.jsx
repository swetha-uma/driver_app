import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { radii, shadows } from '../../../theme/theme';

export default StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  homeBack: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  header: {
    minHeight: 200,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.hero,
  },
  headerGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: radii.pill,
    right: -44,
    top: -100,
    backgroundColor: colors.heroCircle,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 30,
    lineHeight: 36,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.heroBadge,
    borderWidth: 1,
    borderColor: colors.heroBadgeBorder,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 90,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  avatar: {
    width: spacing.xl + spacing.sm,
    height: spacing.xl + spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  studentCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  studentName: {
    fontWeight: '700',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  switchLabel: {
    fontWeight: '700',
  },
  menuList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  menuRow: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  menuRowPressed: {
    opacity: 0.82,
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  menuIconpurple: {
    backgroundColor: colors.neutralBg,
  },
  menuIconblue: {
    backgroundColor: '#E3F0FF',
  },
  menuIconviolet: {
    backgroundColor: colors.primarySoft,
  },
  menuIconslate: {
    backgroundColor: '#E9EDF5',
  },
  menuIconlavender: {
    backgroundColor: colors.neutralBg,
  },
  menuIconerror: {
    backgroundColor: colors.errorBg,
  },
  menuLabel: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: 18,
    fontWeight: '500',
  },
  valueBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  valueText: {
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(15, 27, 61, 0.58)',
  },
  logoutCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  logoutIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.errorBg,
  },
  logoutTitle: {
    color: colors.textPrimary,
  },
  logoutMessage: {
    marginTop: spacing.xs,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  logoutActions: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: radii.lg,
    backgroundColor: colors.neutralBg,
  },
  confirmLogoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 50,
    borderRadius: radii.lg,
    backgroundColor: colors.error,
  },
  // Why: loading and error need a centered full-screen layout
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statusTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  statusText: {
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
