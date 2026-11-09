import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import {
  isBlePhoneBatteryExemptionGranted,
  requestBlePhoneBatteryExemption,
} from '../services/blePhoneScannerService';
import { bleUiColors } from '../theme/bleUiColors';
import BlePrimaryButton from './BlePrimaryButton';

/** Battery exemption status for background Gateway scan. */
export default function BleBackgroundScanSection() {
  const [isBatteryExemptionGranted, setIsBatteryExemptionGranted] = useState(null);

  const refreshBatteryExemptionStatus = useCallback(async () => {
    setIsBatteryExemptionGranted(await isBlePhoneBatteryExemptionGranted());
  }, []);

  useEffect(() => {
    refreshBatteryExemptionStatus();
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') refreshBatteryExemptionStatus();
    });
    return () => appStateSubscription.remove();
  }, [refreshBatteryExemptionStatus]);

  const batteryExemptionStatusText =
    isBatteryExemptionGranted === null
      ? 'Checking…'
      : isBatteryExemptionGranted
        ? 'Allowed: Android will not stop the scan to save battery.'
        : 'Restricted: Android may stop the scan when the screen is off.';

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Background scanning</Text>
      <Text
        style={[
          styles.hint,
          isBatteryExemptionGranted ? styles.allowed : styles.restricted,
        ]}
      >
        {batteryExemptionStatusText}
      </Text>
      {!isBatteryExemptionGranted ? (
        <BlePrimaryButton
          label="Allow background scanning"
          variant="ghost"
          onPress={requestBlePhoneBatteryExemption}
        />
      ) : null}
      <Text style={styles.hint}>
        On Xiaomi, Oppo, Vivo, Realme and Samsung phones also set this app to No restrictions /
        Autostart in the phone&apos;s battery settings.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8, gap: 6 },
  label: { fontWeight: '600', color: bleUiColors.textSecondary, fontSize: 13 },
  hint: { color: bleUiColors.textMuted, fontSize: 12, lineHeight: 18 },
  allowed: { color: bleUiColors.success },
  restricted: { color: bleUiColors.danger },
});
