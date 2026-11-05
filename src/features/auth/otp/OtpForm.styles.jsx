import { Platform, StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { radii } from '../../../theme/theme';

export default StyleSheet.create({
  form: {
    width: '100%',
  },
  prompt: {
    textAlign: 'center',
    marginBottom: spacing.md,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
      default: {},
    }),
  },
  timer: {
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  codeWrap: {
    position: 'relative',
    width: '100%',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  box: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  digit: {
    textAlign: 'center',
    color: colors.textPrimary,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
      default: {},
    }),
  },
  caret: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    color: 'transparent',
    opacity: 0.02,
  },
  resend: {
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  changeNumber: {
    width: '100%',
    marginTop: spacing.md,
  },
});
