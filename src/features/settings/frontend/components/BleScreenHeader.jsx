import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { bleUiColors, bleUiRadii, bleUiShadows } from '../theme/bleUiColors';

/** Title row with optional close/action — matches Server settings header pattern. */
export default function BleScreenHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            hitSlop={10}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Ionicons name="arrow-back" size={22} color={bleUiColors.text} />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.titleColumn}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: bleUiRadii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bleUiColors.bgElevated,
    borderWidth: 1,
    borderColor: bleUiColors.border,
    ...bleUiShadows.card,
  },
  backSpacer: { width: 40 },
  titleColumn: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: bleUiColors.text,
    letterSpacing: -0.3,
  },
  subtitle: { marginTop: 2, fontSize: 13, lineHeight: 18, color: bleUiColors.textMuted },
});
