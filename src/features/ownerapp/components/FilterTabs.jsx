import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AppText from '../../../components/common/AppText';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

/** Horizontal pill filter strip, reused across every Owner approval screen. */
export default function FilterTabs({ options, value, onChange }) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(opt.id)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <AppText variant="body" color={active ? colors.white : colors.textPrimary} style={{ fontWeight: '600' }}>
                {opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md, marginBottom: spacing.xs },
  row: { paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: 'center' },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
