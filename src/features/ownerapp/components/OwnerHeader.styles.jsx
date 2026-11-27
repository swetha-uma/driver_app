import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

export default StyleSheet.create({
  header: {
    minHeight: 180,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.hero,
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { flex: 1 },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
