import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BleNearbyDeviceRow from '../components/BleNearbyDeviceRow';
import BlePrimaryButton from '../components/BlePrimaryButton';
import BleScanStatsBar from '../components/BleScanStatsBar';
import {
  getBlePhoneScanOwnerRole,
  isBlePhoneNativeScannerAvailable,
  isBlePhoneScanActive,
  startBlePhoneScan,
  stopBlePhoneScan,
} from '../services/blePhoneScannerService';
import {
  loadBleGatewaySettings,
  saveBleGatewaySettings,
} from '../storage/bleGatewaySettingsStorage';
import { bleUiColors, bleUiRadii, bleUiShadows } from '../theme/bleUiColors';
import { mapScannedBeaconToNearbyDeviceRow } from '../utils/bleNearbyDeviceDisplay';

const BLE_READER_LIST_REFRESH_INTERVAL_MS = 500;

const BLE_READER_LIST_MODE_OPTIONS = [
  { id: 'all', label: 'BLE devices' },
  { id: 'cards', label: 'ID cards' },
];

/**
 * Reader tab: nearby BLE advertisers — professional driver-theme layout.
 */
export default function BleReaderScanScreen({ settingsVersion = 0 }) {
  const [isReaderScanning, setIsReaderScanning] = useState(false);
  const [readerScanStatusMessage, setReaderScanStatusMessage] = useState('Idle');
  const [nearbyDevicesByMac, setNearbyDevicesByMac] = useState({});
  const [expandedDeviceKey, setExpandedDeviceKey] = useState(null);
  const [readerListMode, setReaderListMode] = useState('all');
  const [readerClockNowMillis, setReaderClockNowMillis] = useState(Date.now());
  const latestNearbyDevicesRef = useRef({});

  useEffect(() => {
    loadBleGatewaySettings().then((settings) => setReaderListMode(settings.scannerListMode));
  }, [settingsVersion]);

  useEffect(() => {
    return () => {
      stopBlePhoneScan('reader');
    };
  }, []);

  useEffect(() => {
    if (!isReaderScanning) return undefined;
    const refreshTimerId = setInterval(() => {
      setNearbyDevicesByMac({ ...latestNearbyDevicesRef.current });
      setReaderClockNowMillis(Date.now());
    }, BLE_READER_LIST_REFRESH_INTERVAL_MS);
    return () => clearInterval(refreshTimerId);
  }, [isReaderScanning]);

  const handleScannedBeaconForReader = useCallback((scannedBeacon) => {
    latestNearbyDevicesRef.current[scannedBeacon.dmac] = mapScannedBeaconToNearbyDeviceRow(
      scannedBeacon,
      latestNearbyDevicesRef.current[scannedBeacon.dmac],
    );
  }, []);

  const toggleBleReaderScan = useCallback(async () => {
    if (isBlePhoneScanActive() && getBlePhoneScanOwnerRole() === 'reader') {
      stopBlePhoneScan('reader');
      setIsReaderScanning(false);
      setReaderScanStatusMessage('Stopped');
      return;
    }
    latestNearbyDevicesRef.current = {};
    setNearbyDevicesByMac({});
    setExpandedDeviceKey(null);
    await startBlePhoneScan(
      {
        onBeacon: handleScannedBeaconForReader,
        onError: (errorMessage) => {
          setReaderScanStatusMessage(errorMessage);
          setIsReaderScanning(false);
        },
        onStatus: setReaderScanStatusMessage,
      },
      'reader',
    );
    setIsReaderScanning(isBlePhoneScanActive() && getBlePhoneScanOwnerRole() === 'reader');
  }, [handleScannedBeaconForReader]);

  const selectBleReaderListMode = useCallback(async (listMode) => {
    setReaderListMode(listMode);
    const gatewaySettings = await loadBleGatewaySettings();
    await saveBleGatewaySettings({ ...gatewaySettings, scannerListMode: listMode });
  }, []);

  const toggleBleReaderDeviceRow = useCallback((deviceKey) => {
    setExpandedDeviceKey((currentKey) => (currentKey === deviceKey ? null : deviceKey));
  }, []);

  const sortedNearbyDevices = useMemo(
    () =>
      Object.values(nearbyDevicesByMac).sort(
        (firstDevice, secondDevice) => secondDevice.rssi - firstDevice.rssi,
      ),
    [nearbyDevicesByMac],
  );
  const classifiedIdCardCount = useMemo(
    () => sortedNearbyDevices.filter((device) => device.cardType !== null).length,
    [sortedNearbyDevices],
  );
  const visibleNearbyDevices = useMemo(
    () =>
      readerListMode === 'cards'
        ? sortedNearbyDevices.filter((device) => device.cardType !== null)
        : sortedNearbyDevices,
    [readerListMode, sortedNearbyDevices],
  );
  const isNativeBleScannerReady = useMemo(() => isBlePhoneNativeScannerAvailable(), []);

  return (
    <View style={styles.screen}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTitles}>
            <Text style={styles.screenTitle}>Scanner</Text>
            <Text style={styles.hint} numberOfLines={2}>
              {readerScanStatusMessage}
            </Text>
          </View>
          <View
            style={[
              styles.readyBadge,
              isNativeBleScannerReady ? styles.readyBadgeOk : styles.readyBadgeWarn,
            ]}
          >
            <Text
              style={[
                styles.readyBadgeText,
                isNativeBleScannerReady ? styles.readyBadgeTextOk : styles.readyBadgeTextWarn,
              ]}
            >
              {isNativeBleScannerReady ? 'BLE ready' : 'Rebuild APK'}
            </Text>
          </View>
        </View>
        <BleScanStatsBar active={isReaderScanning} />
      </View>

      <View style={styles.modeRow}>
        {BLE_READER_LIST_MODE_OPTIONS.map((listModeOption) => {
          const isActiveMode = readerListMode === listModeOption.id;
          return (
            <Pressable
              key={listModeOption.id}
              onPress={() => void selectBleReaderListMode(listModeOption.id)}
              style={[styles.modeChip, isActiveMode && styles.modeChipActive]}
            >
              <Text style={[styles.modeChipText, isActiveMode && styles.modeChipTextActive]}>
                {listModeOption.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.startWrap}>
        <BlePrimaryButton
          label={isReaderScanning ? 'Stop scanning' : 'Start scanning'}
          variant={isReaderScanning ? 'danger' : 'primary'}
          onPress={toggleBleReaderScan}
        />
      </View>

      <View style={styles.countRow}>
        <Text style={styles.count}>
          {sortedNearbyDevices.length} device
          {sortedNearbyDevices.length === 1 ? '' : 's'}
        </Text>
        <Text style={styles.countSub}>
          {classifiedIdCardCount} ID card{classifiedIdCardCount === 1 ? '' : 's'}
        </Text>
      </View>

      <FlatList
        style={styles.listFlex}
        data={visibleNearbyDevices}
        keyExtractor={(device) => device.key}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="bluetooth-outline" size={28} color={bleUiColors.textFaint} />
            <Text style={styles.empty}>
              {isReaderScanning
                ? 'Listening for nearby advertisers…'
                : 'Start scanning to list nearby BLE devices'}
            </Text>
          </View>
        }
        renderItem={({ item: nearbyDevice }) => (
          <BleNearbyDeviceRow
            device={nearbyDevice}
            expanded={expandedDeviceKey === nearbyDevice.key}
            now={readerClockNowMillis}
            onToggle={toggleBleReaderDeviceRow}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: bleUiColors.bg, paddingHorizontal: 16, paddingTop: 14 },
  heroCard: {
    backgroundColor: bleUiColors.bgElevated,
    borderRadius: bleUiRadii.lg,
    borderWidth: 1,
    borderColor: bleUiColors.border,
    padding: 16,
    ...bleUiShadows.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTitles: { flex: 1, minWidth: 0 },
  screenTitle: {
    fontWeight: '700',
    color: bleUiColors.text,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  hint: { color: bleUiColors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  readyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: bleUiRadii.pill,
  },
  readyBadgeOk: { backgroundColor: bleUiColors.successBg },
  readyBadgeWarn: { backgroundColor: bleUiColors.warningBg },
  readyBadgeText: { fontSize: 11, fontWeight: '700' },
  readyBadgeTextOk: { color: bleUiColors.successText },
  readyBadgeTextWarn: { color: bleUiColors.warningText },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: bleUiRadii.pill,
    borderWidth: 1,
    borderColor: bleUiColors.border,
    backgroundColor: bleUiColors.bgElevated,
    minHeight: 38,
    justifyContent: 'center',
  },
  modeChipActive: {
    borderColor: bleUiColors.primary,
    backgroundColor: bleUiColors.primarySoft,
  },
  modeChipText: { color: bleUiColors.textMuted, fontWeight: '600', fontSize: 13 },
  modeChipTextActive: { color: bleUiColors.primary, fontWeight: '700' },
  startWrap: { marginTop: 14 },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  count: { fontWeight: '700', color: bleUiColors.text, fontSize: 15 },
  countSub: { color: bleUiColors.primary, fontWeight: '700', fontSize: 13 },
  listFlex: { flex: 1, minHeight: 0 },
  listContent: { paddingBottom: 28, flexGrow: 1, gap: 10 },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
    backgroundColor: bleUiColors.bgElevated,
    borderRadius: bleUiRadii.lg,
    borderWidth: 1,
    borderColor: bleUiColors.border,
  },
  empty: {
    color: bleUiColors.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
