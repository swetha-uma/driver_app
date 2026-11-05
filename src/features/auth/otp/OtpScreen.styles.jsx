import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme/spacing';

export default StyleSheet.create({
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
