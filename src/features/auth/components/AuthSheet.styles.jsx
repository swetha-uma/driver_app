import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { radii } from '../../../theme/theme';

export default StyleSheet.create({
  screen: {
    backgroundColor: colors.heroTop,
  },
  scroll: {
    flexGrow: 1,
  },
  sheet: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    marginTop: -spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
});
