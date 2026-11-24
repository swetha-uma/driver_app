import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../components/common/AppText';
import ModeSwitcher from '../teacherapp/components/ModeSwitcher';
import { colors } from '../../theme/colors';
import styles from './DriverGreetingCard.styles';

/** Home greeting with staff name, real designation, and Trip/Leave switch when leave is available. */
export default function DriverGreetingCard({ // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.
  greeting,
  name,
  designation,
  onOpenProfile,
  canLeave,
  onSwitchMode,
}) {
  const initial = (name || 'D').trim().charAt(0).toUpperCase();
  // Why: Profile stays open even out of gateway range when the parent passes onOpenProfile
  const canOpenProfile = typeof onOpenProfile === 'function';
  // Why: show HR designation (Admin / Driver - Operation / etc.), never hardcode Driver
  const roleLabel = String(designation || '').trim() || 'Staff';
  const roleLine = canOpenProfile ? `${roleLabel} · Open profile` : roleLabel;

  return (
    <View style={styles.shadow}>
      <LinearGradient
        colors={[colors.heroTop, colors.primary, colors.buttonEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View pointerEvents="none" style={styles.circleLarge} />
        <View pointerEvents="none" style={styles.circleDeep} />
        <AppText variant="display" style={styles.greeting}>
          {greeting}
        </AppText>
        <View style={styles.staffCard}>
          <Pressable
            onPress={canOpenProfile ? onOpenProfile : undefined}
            disabled={!canOpenProfile}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canOpenProfile }}
            accessibilityLabel={canOpenProfile ? `Open profile for ${name}` : name}
            style={({ pressed }) => [
              styles.namePress,
              canOpenProfile && pressed && styles.nameRowPressed,
            ]}
          >
            <View style={styles.avatar}>
              <AppText variant="label" color={colors.primary}>
                {initial}
              </AppText>
            </View>
            <View style={styles.nameCopy}>
              <AppText variant="subtitle" color={colors.white} style={styles.name} numberOfLines={1}>
                {name}
              </AppText>
              <AppText variant="caption" color={colors.onPrimaryMuted} numberOfLines={1}>
                {roleLine}
              </AppText>
            </View>
          </Pressable>
          {canLeave ? (
            <ModeSwitcher currentMode="TRIP" canTrip onSelect={onSwitchMode} />
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}
