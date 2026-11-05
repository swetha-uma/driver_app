import { StyleSheet } from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  body: {
    flex: 1,
  },
  /** Tracking stays mounted on other tabs so the van keeps its place. */
  screenHidden: {
    display: 'none',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
