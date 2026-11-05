import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

export default StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: spacing.xl + spacing.sm,
  },
  mark: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.success,
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.success,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 28,
    height: 14,
    marginTop: -6,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: colors.success,
  },
  title: {
    marginTop: spacing.md,
    textAlign: 'center',
    color: colors.successText,
  },
});
