import { Platform, StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radii } from '../../theme/theme';
import { typography } from '../../theme/typography';

export default StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    marginBottom: spacing.sm,
  },
  fieldShell: {
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  fieldShellFocused: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    shadowOpacity: 0.16,
  },
  fieldShellError: {
    borderColor: colors.error,
  },
  field: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  prefixWrap: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing.sm + spacing.xs,
    backgroundColor: colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    ...Platform.select({
      android: {
        textAlignVertical: 'center',
        includeFontPadding: false,
      },
      default: {},
    }),
  },
  helper: {
    marginTop: spacing.md,
  },
  errorText: {
    marginTop: spacing.sm,
  },
});
