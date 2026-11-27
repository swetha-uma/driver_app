import { Animated, Modal, Pressable, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const styles = {
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  switchLabel: { fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 27, 61, 0.52)' },
  sheet: {
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.surface || colors.white,
    ...shadows.card,
  },
  title: { color: colors.textPrimary },
  subtitle: { marginTop: spacing.xs, color: colors.textSecondary },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 72,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.background || colors.canvas,
  },
  optionSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.white },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  optionCopy: { flex: 1 },
  selectedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.successBg,
  },
  selectedText: { color: colors.successText, fontWeight: '700' },
};

/**
 * Switch between schools this Owner account manages — same UX as the Teacher app's
 * Trip/Leave ModeSwitcher, placed next to the Owner's name.
 */
export default function SchoolSwitcher({ schools, onSelect }) {
  const [visible, setVisible] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(animation, { toValue: 1, useNativeDriver: true, friction: 8, tension: 65 }).start();
    } else {
      animation.setValue(0);
    }
  }, [animation, visible]);

  // Why: nothing to switch between when this Owner only has one school
  if (!schools || schools.length < 2) return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Switch school"
        onPress={() => setVisible(true)}
        style={styles.switchButton}
      >
        <AppText variant="caption" color={colors.primary} style={styles.switchLabel}>
          Switch
        </AppText>
        <Ionicons name="swap-vertical" size={16} color={colors.primary} />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [260, 0] }) }] },
            ]}
          >
            <AppText variant="title" style={styles.title}>
              Switch school
            </AppText>
            <AppText variant="body" style={styles.subtitle}>
              Choose which school to manage.
            </AppText>
            {schools.map((item) => {
              const selected = item.current;
              return (
                <Pressable
                  key={item.schoolId}
                  onPress={() => {
                    if (!selected) onSelect?.(item.schoolId);
                    setVisible(false);
                  }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <View style={styles.avatar}>
                    <Ionicons name="school" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.optionCopy}>
                    <AppText variant="body">{item.schoolName}</AppText>
                  </View>
                  {selected ? (
                    <View style={styles.selectedBadge}>
                      <AppText variant="caption" style={styles.selectedText}>
                        Current
                      </AppText>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
