import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radii } from '../../theme/theme';

export default StyleSheet.create({
  pressable: {
    minHeight: 54,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  primary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  disabled: {
    backgroundColor: colors.primaryLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    paddingHorizontal: spacing.xl,
  },
  outlinePressed: {
    backgroundColor: colors.primarySoft,
  },
  soft: {
    backgroundColor: colors.primarySoft,
  },
  softPressed: {
    backgroundColor: colors.border,
  },
});
