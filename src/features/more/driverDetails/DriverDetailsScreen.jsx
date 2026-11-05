import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../../components/common/AppText';
import { colors } from '../../../theme/colors';
import styles from './DriverDetailsScreen.styles';

/** Labels that need stacked layout so long text (address) does not crush the row. */
const STACKED_DETAIL_LABELS = new Set(['Address', 'Vehicle assigned']);

function getInitial(name) {
  // Why: avatar letter falls back to D when the name is missing
  return (name || 'D').trim().charAt(0).toUpperCase();
}

function DetailsHeader({ driver, onBack }) {
  return (
    <LinearGradient
      colors={[colors.heroTop, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View pointerEvents="none" style={styles.headerGlow} />
      <View style={styles.headerTopRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </Pressable>
        <Ionicons name="person-outline" size={28} color={colors.white} />
        <AppText variant="heading" color={colors.white} style={styles.headerTitle}>
          Driver details
        </AppText>
      </View>
      <View style={styles.studentCard}>
        <View style={styles.avatar}>
          <AppText variant="title" color={colors.primary}>
            {getInitial(driver.name)}
          </AppText>
        </View>
        <View style={styles.studentCopy}>
          <AppText variant="subtitle" color={colors.white} style={styles.studentName}>
            {driver.name}
          </AppText>
          <AppText variant="caption" color={colors.onPrimaryMuted}>
            {driver.role}
          </AppText>
          <AppText variant="caption" color={colors.onPrimaryMuted}>
            {driver.employeeId}
          </AppText>
        </View>
      </View>
    </LinearGradient>
  );
}

/** One details row — stacked for long values, side-by-side for short ones. */
function DetailRow({ item }) {
  const value = item.value || '—';
  // Why: long address/vehicle text wraps poorly in a right-aligned flex row
  const useStacked = STACKED_DETAIL_LABELS.has(item.label) || String(value).length > 36;

  if (useStacked) {
    return (
      <View style={[styles.detailRow, styles.detailRowStacked]}>
        <AppText variant="body" style={styles.detailLabelStacked}>
          {item.label}
        </AppText>
        <AppText variant="body" style={styles.detailValueStacked}>
          {value}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.detailRow}>
      <AppText variant="body" style={styles.detailLabel}>
        {item.label}
      </AppText>
      <AppText variant="body" style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

/** Shows staff-backed driver fields from GET /api/v1/driver-app/profile (read-only). */
export default function DriverDetailsScreen({ driver, details = [], onBack }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <DetailsHeader driver={driver} onBack={onBack} />
      <View style={styles.detailsCard}>
        {details.map((item) => (
          <DetailRow key={item.label} item={item} />
        ))}
        <AppText variant="body" style={styles.lockedNote}>
          Official records are managed by the school and cannot be edited here.
        </AppText>
      </View>
    </ScrollView>
  );
}
