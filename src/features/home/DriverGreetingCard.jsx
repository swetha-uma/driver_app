import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../components/common/AppText';
import { colors } from '../../theme/colors';
import styles from './DriverGreetingCard.styles';

/** Home greeting with driver name. Profile opens whenever onOpenProfile is provided. */
export default function DriverGreetingCard({ greeting, name, onOpenProfile }) {
  const initial = (name || 'D').trim().charAt(0).toUpperCase();
  // Why: Profile stays open even out of gateway range when the parent passes onOpenProfile
  const canOpenProfile = typeof onOpenProfile === 'function';

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
        <Pressable
          onPress={canOpenProfile ? onOpenProfile : undefined}
          disabled={!canOpenProfile}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canOpenProfile }}
          accessibilityLabel={canOpenProfile ? `Open profile for ${name}` : name}
          style={({ pressed }) => [
            styles.nameRow,
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
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {canOpenProfile ? 'Driver · Open profile' : 'Driver'}
            </AppText>
          </View>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
