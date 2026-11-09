import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { bleUiColors, bleUiRadii } from '../theme/bleUiColors';

/**
 * Solid-color action button (app blue / red) — no washed-out gradient.
 * Why: LinearGradient was rendering pale grey on device; solid matches driver theme.
 */
export default function BlePrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}) {
  const isGhost = variant === 'ghost';
  const fillStyle =
    variant === 'danger'
      ? styles.danger
      : variant === 'success'
        ? styles.success
        : isGhost
          ? styles.ghost
          : styles.primary;

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        fillStyle,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isGhost ? bleUiColors.primary : bleUiColors.onPrimary}
        />
      ) : (
        <Text style={isGhost ? styles.labelGhost : styles.labelFilled}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: bleUiRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: bleUiColors.primary,
  },
  success: {
    backgroundColor: bleUiColors.primary,
  },
  danger: {
    backgroundColor: bleUiColors.danger,
  },
  ghost: {
    backgroundColor: bleUiColors.bgElevated,
    borderWidth: 1.5,
    borderColor: bleUiColors.primary,
  },
  labelFilled: {
    color: bleUiColors.onPrimary,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  labelGhost: {
    color: bleUiColors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88 },
});
