import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bleUiColors, bleUiRadii, bleUiShadows } from '../theme/bleUiColors';
import BleGatewayCaptureScreen from './BleGatewayCaptureScreen';
import BleGatewayConfigScreen from './BleGatewayConfigScreen';
import BleReaderScanScreen from './BleReaderScanScreen';

/**
 * BLE Devices hub — driver app canvas theme with professional header + segmented tabs.
 */
export default function BlePhoneGatewayHubScreen({ onBack }) {
  const [activeBleHubTab, setActiveBleHubTab] = useState('scanner');
  const [isBleConfigOverlayVisible, setIsBleConfigOverlayVisible] = useState(false);
  const [bleSettingsVersion, setBleSettingsVersion] = useState(0);
  const safeAreaInsets = useSafeAreaInsets();

  const openBleGatewaySettings = () => {
    setIsBleConfigOverlayVisible(true);
  };

  if (isBleConfigOverlayVisible) {
    return (
      <View
        style={[
          styles.root,
          {
            paddingTop: safeAreaInsets.top,
            paddingBottom: safeAreaInsets.bottom,
          },
        ]}
      >
        <BleGatewayConfigScreen
          onClose={() => setIsBleConfigOverlayVisible(false)}
          onSaved={() => setBleSettingsVersion((version) => version + 1)}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom,
        },
      ]}
    >
      <View style={styles.headerBar}>
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={bleUiColors.text} />
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Devices</Text>
            <Text style={styles.headerSubtitle}>Van gateway · BLE scanner</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.segmentTrack}>
          <Pressable
            style={[styles.segmentItem, activeBleHubTab === 'scanner' && styles.segmentItemActive]}
            onPress={() => setActiveBleHubTab('scanner')}
          >
            <Text
              style={[
                styles.segmentText,
                activeBleHubTab === 'scanner' && styles.segmentTextActive,
              ]}
            >
              Scanner
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentItem, activeBleHubTab === 'gateway' && styles.segmentItemActive]}
            onPress={() => setActiveBleHubTab('gateway')}
          >
            <Text
              style={[
                styles.segmentText,
                activeBleHubTab === 'gateway' && styles.segmentTextActive,
              ]}
            >
              Gateway
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.screenSlot}>
        {activeBleHubTab === 'scanner' ? (
          <BleReaderScanScreen settingsVersion={bleSettingsVersion} />
        ) : (
          <BleGatewayCaptureScreen
            settingsVersion={bleSettingsVersion}
            onOpenBleGatewayConfig={openBleGatewaySettings}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bleUiColors.bg },
  headerBar: {
    backgroundColor: bleUiColors.bgHeader,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: bleUiColors.border,
    ...bleUiShadows.card,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: bleUiRadii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bleUiColors.bg,
    borderWidth: 1,
    borderColor: bleUiColors.border,
  },
  headerTitles: { flex: 1, minWidth: 0 },
  headerSpacer: { width: 40 },
  headerTitle: {
    color: bleUiColors.text,
    fontWeight: '700',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 2,
    color: bleUiColors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: bleUiColors.bg,
    borderRadius: bleUiRadii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: bleUiColors.border,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: bleUiRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: bleUiColors.bgElevated,
    ...bleUiShadows.card,
  },
  segmentText: {
    fontWeight: '600',
    color: bleUiColors.textMuted,
    fontSize: 14,
  },
  segmentTextActive: {
    color: bleUiColors.primary,
    fontWeight: '700',
  },
  screenSlot: { flex: 1, minHeight: 0, backgroundColor: bleUiColors.bg },
});
