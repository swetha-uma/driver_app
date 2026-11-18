import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radii, shadows } from '../../theme/theme';

export default StyleSheet.create({ // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.
  // Why: full card while waiting for van gateway capture
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  iconWrap: {
    marginBottom: spacing.xs,
  },
  title: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  body: {
    lineHeight: 20,
  },
  meta: {
    marginTop: spacing.xs,
  },
  status: {
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  // Why: thin success strip once /ble_capture unlocked this driver
  unlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.successBg,
  },
});
