import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme/spacing';

export default StyleSheet.create({ // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.
  hero: {
    paddingBottom: spacing.xl + spacing.xl + spacing.sm,
  },
  errorText: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
