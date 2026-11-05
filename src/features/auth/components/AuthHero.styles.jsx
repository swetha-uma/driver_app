import { Dimensions, Platform, StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { radii } from '../../../theme/theme';

const { height: windowHeight } = Dimensions.get('window');

export default StyleSheet.create({
  hero: {
    overflow: 'hidden',
    minHeight: windowHeight * 0.36,
    paddingHorizontal: spacing.lg,
    paddingTop:
      Platform.OS === 'ios'
        ? spacing.xl + spacing.xl + spacing.lg
        : spacing.xl + spacing.xl + spacing.md,
    paddingBottom: spacing.xl + spacing.md,
  },
  circleLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.heroCircle,
    top: -88,
    right: -72,
  },
  circleDeep: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.heroCircleDeep,
    right: -28,
    bottom: -16,
  },
  badgeAlign: {
    alignSelf: 'center',
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.heroBadge,
    borderWidth: 1,
    borderColor: colors.heroBadgeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    width: 22,
    height: 26,
    borderWidth: 2,
    borderColor: colors.white,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 8,
    height: 5,
    marginTop: -1,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: '-45deg' }],
  },
  copy: {
    alignSelf: 'stretch',
  },
  title: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  highlight: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
