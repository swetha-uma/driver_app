import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radii } from '../../theme/theme';

const THUMB_SIZE = 52;

export default StyleSheet.create({
  track: {
    height: THUMB_SIZE + 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  trackDanger: {
    backgroundColor: colors.error,
  },
  trackDisabled: {
    opacity: 0.55,
  },
  fill: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryDark,
  },
  fillDanger: {
    backgroundColor: colors.errorText,
  },
  label: {
    textAlign: 'center',
    paddingHorizontal: THUMB_SIZE,
  },
  thumb: {
    position: 'absolute',
    left: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
