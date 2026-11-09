import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../components/common/AppText';
import { colors } from '../../theme/colors';
import styles from './VanProximityGate.styles';

/**
 * Blocks trip cards until the van gateway reports this driver's BLE card
 * via POST /api/ble_capture (RSSI within vehicle threshold).
 */
export default function VanProximityGate({ allocatedVan, nearVan }) {
  // Why: a trip exists but its vehicle has no gateway MAC. No-trip days never reach this card.
  if (!allocatedVan) {
    return (
      <View style={styles.card}>
        <Ionicons name="bus-outline" size={28} color={colors.textSecondary} />
        <AppText variant="subtitle" style={styles.title}>
          No van gateway assigned
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.body}>
          Today&apos;s trip has no vehicle gateway MAC. Ask the office to set GMAC on the van.
        </AppText>
      </View>
    );
  }

  // Why: already unlocked after a fresh capture of the driver's card on this GMAC
  if (nearVan) {
    return (
      <View style={styles.unlockedBanner}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <AppText variant="caption" color={colors.successText}>
          Near {allocatedVan.vehicleName || 'your van'}
          {typeof allocatedVan.lastHeardRssi === 'number'
            ? ` · RSSI ${allocatedVan.lastHeardRssi}`
            : ''}
          {' — trips unlocked'}
        </AppText>
      </View>
    );
  }

  const rangeHint = allocatedVan.gatewayRangeMeters
    ? `Stand within about ${allocatedVan.gatewayRangeMeters} m of the van.`
    : 'Stand next to your assigned van so the gateway can hear your ID card.';

  // Why: map backend proximityStatus to a short driver-facing line
  let statusLine = 'Waiting for van gateway to detect your ID card…';
  if (allocatedVan.proximityStatus === 'BLE_CARD_NOT_ASSIGNED') {
    statusLine = 'Your BLE ID card is not assigned yet. Ask the office (BLE User Assign).';
  } else if (typeof allocatedVan.gatewayRssi === 'number') {
    statusLine = `Waiting for gateway capture (need RSSI ≥ ${allocatedVan.gatewayRssi})…`;
  }

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        {/* Why: polling Home until /ble_capture marks nearVan */}
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      <AppText variant="subtitle" style={styles.title}>
        Go near your assigned van
      </AppText>
      <AppText variant="body" color={colors.textSecondary} style={styles.body}>
        {allocatedVan.vehicleName || 'School van'}
        {allocatedVan.vehiclePlate ? ` · ${allocatedVan.vehiclePlate}` : ''}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary} style={styles.meta}>
        Gateway {allocatedVan.gatewayMacAddress}
        {typeof allocatedVan.gatewayRssi === 'number'
          ? ` · need RSSI ≥ ${allocatedVan.gatewayRssi}`
          : ''}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} style={styles.body}>
        {rangeHint}
      </AppText>
      <AppText variant="caption" color={colors.primary} style={styles.status}>
        {statusLine}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary} style={styles.meta}>
        Carry your assigned BLE ID card. The van gateway must POST /api/ble_capture with your
        UUID or DMAC.
      </AppText>
    </View>
  );
}
