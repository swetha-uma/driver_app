import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radii, shadows } from '../../theme/theme';

export default StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  allDoneCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.success,
    gap: spacing.sm,
    alignItems: 'flex-start',
    ...shadows.card,
  },
  allDoneTitle: {
    color: colors.successText,
    fontWeight: '700',
  },
  // Why: loading and error need a centered full-screen layout
  centered: {
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

