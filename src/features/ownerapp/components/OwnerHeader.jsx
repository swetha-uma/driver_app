import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
import { colors } from '../../../theme/colors';
import styles from './OwnerHeader.styles';

/** Shared hero header for every Owner approval screen — same look as the Teacher shell. */
export default function OwnerHeader({ icon, title, ownerName, subtitle }) {
  return (
    <LinearGradient
      colors={[colors.heroTop, colors.primary, colors.buttonEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View pointerEvents="none" style={styles.circleLarge} />
      <View pointerEvents="none" style={styles.circleDeep} />
      <View style={styles.headerTop}>
        <Ionicons name={icon} size={26} color={colors.white} />
        <AppText variant="heading" color={colors.white} style={styles.title}>
          {title}
        </AppText>
      </View>
      <View style={styles.ownerCard}>
        <View style={styles.avatar}>
          <AppText variant="title" color={colors.primary}>
            {(ownerName || 'O').trim().charAt(0).toUpperCase()}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" color={colors.white} numberOfLines={1} style={{ fontWeight: '700' }}>
            {ownerName || 'Owner'}
          </AppText>
          <AppText variant="caption" color={colors.onPrimaryMuted}>
            {subtitle || 'Owner'}
          </AppText>
        </View>
      </View>
    </LinearGradient>
  );
}
