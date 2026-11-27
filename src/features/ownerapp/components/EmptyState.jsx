import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

/** Centered "nothing here" state, shown in place of the list when it's empty. */
export default function EmptyState({ icon = 'checkmark-done-circle-outline', message = 'Nothing to show here.' }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={56} color={colors.border} />
      <AppText variant="body" color={colors.textSecondary} style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  message: { textAlign: 'center' },
});
