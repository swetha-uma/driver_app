import { StyleSheet, View } from 'react-native';

import { bleUiColors, bleUiRadii, bleUiShadows } from '../theme/bleUiColors';

/** Elevated status card for Gateway summary — matches driver surface cards. */
export default function BleInfoCard({ children, accent = false, style }) { // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.
  return (
    <View style={[styles.card, accent && styles.cardAccent, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: bleUiColors.bgElevated,
    borderRadius: bleUiRadii.lg,
    borderWidth: 1,
    borderColor: bleUiColors.border,
    padding: 16,
    gap: 8,
    ...bleUiShadows.card,
  },
  cardAccent: {
    borderColor: bleUiColors.primarySoft,
    backgroundColor: bleUiColors.bgElevated,
  },
});
