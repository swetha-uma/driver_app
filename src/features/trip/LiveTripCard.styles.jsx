import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radii, shadows } from '../../theme/theme';

export default StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardLocked: {
    opacity: 0.92,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  typeText: {
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  statusText: {
    fontWeight: '700',
  },
  routeName: {
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaItem: {
    flex: 1,
    gap: 2,
  },
  metaValue: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actualLine: {
    marginTop: spacing.xs,
  },
  lockedNote: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.neutralBg,
  },
  lockedText: {
    flex: 1,
  },
  nextStopCard: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    gap: spacing.xs,
  },
  nextStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nextStopLabel: {
    fontWeight: '700',
  },
  nextStopName: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  advanceButton: {
    marginTop: spacing.xs,
  },
  actionWrap: {
    marginTop: spacing.sm,
  },
  completedNote: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.successBg,
  },
});
