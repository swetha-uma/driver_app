import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../../theme/colors';
import AppText from './AppText';
import styles from './AppButton.styles';

/** Shared button used for send code, verify, and other primary actions. */
export default function AppButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const isPrimary = variant === 'primary';

  useEffect(() => {
    if (disabled) {
      return;
    }

    scale.setValue(0.96);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 7,
    }).start();
  }, [disabled, scale]);

  const animateTo = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const textColor = isPrimary ? colors.white : colors.primary;

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (!disabled) {
            animateTo(0.98);
          }
        }}
        onPressOut={() => animateTo(1)}
        style={({ pressed }) => [
          styles.pressable,
          isPrimary && !disabled && styles.primary,
          isPrimary && disabled && styles.disabled,
          variant === 'outline' && styles.outline,
          variant === 'outline' && pressed && styles.outlinePressed,
          variant === 'soft' && styles.soft,
          variant === 'soft' && pressed && styles.softPressed,
        ]}
      >
        {({ pressed }) => (
          <>
            {isPrimary && !disabled ? (
              <LinearGradient
                colors={
                  pressed
                    ? [colors.primaryDark, colors.primary]
                    : [colors.primary, colors.buttonEnd]
                }
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.fill}
              />
            ) : null}
            <AppText variant="button" color={textColor}>
              {title}
            </AppText>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
