import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radii, shadows } from '../../theme/theme';

export default StyleSheet.create({
  shadow: {
    borderRadius: radii.lg,
    ...shadows.hero,
  },
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    padding: spacing.md,
  },
  circleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.heroCircle,
    top: -70,
    right: -40,
  },
  circleDeep: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.heroCircleDeep,
    bottom: -36,
    left: -28,
  },
  greeting: {
    color: colors.white,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.heroBadge,
    borderWidth: 1,
    borderColor: colors.heroBadgeBorder,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  nameRowPressed: {
    opacity: 0.92,
  },
  avatar: {
    width: spacing.xl + spacing.sm,
    height: spacing.xl + spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontWeight: '700',
  },
});
