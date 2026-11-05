import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radii, shadows } from '../../theme/theme';

export default StyleSheet.create({
  wrap: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    ...shadows.card,
  },
  headline: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  chipText: {
    fontWeight: '700',
  },
});
