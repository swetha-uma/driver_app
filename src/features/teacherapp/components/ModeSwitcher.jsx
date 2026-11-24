import { Animated, Modal, Pressable, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const styles = { // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
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
 * Switch Trip ↔ Leave on Home (same UX as parent StudentSwitcher).
 * Shown only when canTrip is true.
 */
export default function ModeSwitcher({ currentMode = 'LEAVE', canTrip, onSelect }) {
  const [visible, setVisible] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const modes = canTrip
    ? [
        { id: 'LEAVE', name: 'Leave', caption: 'Attendance & leave requests' },
        { id: 'TRIP', name: 'Trip', caption: 'Van trips & schedule' },
      ]
    : [{ id: 'LEAVE', name: 'Leave', caption: 'Attendance & leave requests' }];

  useEffect(() => {
    if (visible) {
      Animated.spring(animation, { toValue: 1, useNativeDriver: true, friction: 8, tension: 65 }).start();
    } else {
      animation.setValue(0);
    }
  }, [animation, visible]);

  // Why: always show Switch when Trip is available so Leave mode is never stuck
  if (!canTrip) return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Switch Trip or Leave"
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
              Switch account
            </AppText>
            <AppText variant="body" style={styles.subtitle}>
              Choose Trip or Leave mode.
            </AppText>
            {modes.map((item) => {
              const selected = item.id === currentMode;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    onSelect?.(item.id);
                    setVisible(false);
                  }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <View style={styles.avatar}>
                    <Ionicons
                      name={item.id === 'TRIP' ? 'bus' : 'calendar'}
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.optionCopy}>
                    <AppText variant="body">{item.name}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {item.caption}
                    </AppText>
                  </View>
                  {selected ? (
                    <View style={styles.selectedBadge}>
                      <AppText variant="caption" style={styles.selectedText}>
                        Selected
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
