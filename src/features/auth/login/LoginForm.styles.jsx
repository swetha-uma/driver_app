import { Platform, StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { radii } from '../../../theme/theme';

export default StyleSheet.create({
  form: {
    width: '100%',
  },
  heading: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.3,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
      default: {},
    }),
  },
  termsRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary,
  },
  checkMark: {
    lineHeight: 16,
  },
  termsText: {
    flex: 1,
  },
  serverLink: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  termsError: {
    marginTop: spacing.sm,
    marginLeft: spacing.xl + spacing.xs,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
  button: {
    marginTop: spacing.lg,
    width: '100%',
  },
});
