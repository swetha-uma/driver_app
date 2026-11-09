import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BLE_GATEWAY_SETTINGS_STORAGE_KEY,
  DEFAULT_BLE_CAPTURE_PATH,
  DEFAULT_BLE_EXIT_TIMEOUT_MS,
  DEFAULT_BLE_MIN_RSSI,
  DEFAULT_BLE_PHONE_ROLE,
  DEFAULT_BLE_PRESENT_INTERVAL_MS,
  DEFAULT_BLE_READER_LIST_MODE,
  DEFAULT_BLE_UNFILTERED_DEBUG_MODE,
  DEFAULT_BLE_ZONE_MODE,
  DEFAULT_BLE_ZONE_SOURCE,
} from '../constants/bleGatewayDefaults';
import { getApiBase } from '../../backendUrl';

/** Build factory defaults for first launch of BLE Gateway settings. */
export function buildDefaultBleGatewaySettings() {
  // Why: reuse the driver app Server URL so drivers do not type the host twice.
  let apiBaseUrl = 'http://10.0.2.2:8080';
  try {
    apiBaseUrl = getApiBase() || apiBaseUrl;
  } catch {
    // Why: getApiBase is always available; keep emulator default if something odd happens.
  }
  return {
    // Why: gateway uploads captures; reader only lists nearby BLE devices.
    phoneRole: DEFAULT_BLE_PHONE_ROLE,
    apiBaseUrl,
    capturePath: DEFAULT_BLE_CAPTURE_PATH,
    gmac: '',
    zoneSource: DEFAULT_BLE_ZONE_SOURCE,
    zoneMode: DEFAULT_BLE_ZONE_MODE,
    zoneCardMacs: [],
    gatewayId: 'PHONE_LOCAL',
    // Why: fallback until Home copies this van's gps_min_move_meters.
    gpsMinMoveMeters: 2,
    // Why: fallback until Home copies this van's gps_publish_interval_ms.
    gpsPublishIntervalMs: 15_000,
    minRssi: DEFAULT_BLE_MIN_RSSI,
    presentIntervalMs: DEFAULT_BLE_PRESENT_INTERVAL_MS,
    exitTimeoutMs: DEFAULT_BLE_EXIT_TIMEOUT_MS,
    scannerListMode: DEFAULT_BLE_READER_LIST_MODE,
    unfilteredDebugMode: DEFAULT_BLE_UNFILTERED_DEBUG_MODE,
  };
}

/** Read saved BLE gateway settings and merge with defaults for missing fields. */
export async function loadBleGatewaySettings() {
  // Why: always start from defaults so new fields appear after app updates.
  const defaultSettings = buildDefaultBleGatewaySettings();
  try {
    const rawJson = await AsyncStorage.getItem(BLE_GATEWAY_SETTINGS_STORAGE_KEY);
    // Why: first open has no saved row yet.
    if (!rawJson) return defaultSettings;
    // Why: parse the saved JSON object from AsyncStorage.
    const storedSettings = JSON.parse(rawJson);
    // Why: merge field-by-field so old installs pick up new keys like phoneRole.
    return {
      // Why: gateway uploads captures; reader only lists nearby BLE devices.
      phoneRole: storedSettings.phoneRole === 'reader' ? 'reader' : 'gateway',
      // Why: keep the last API host the driver typed for ble_capture POSTs.
      apiBaseUrl: storedSettings.apiBaseUrl ?? defaultSettings.apiBaseUrl,
      // Why: path is usually /api/ble_capture but may be overridden per school.
      capturePath: storedSettings.capturePath ?? defaultSettings.capturePath,
      // Why: van / school-zone gateway MAC used as GMAC on uploads.
      gmac: storedSettings.gmac ?? defaultSettings.gmac,
      // Why: phone means this handset is the gateway; zoneCard means follow a beacon MAC.
      zoneSource: storedSettings.zoneSource === 'zoneCard' ? 'zoneCard' : 'phone',
      // Why: multi follows every MAC in zoneCardMacs; single uses gmac as the one zone card.
      zoneMode: storedSettings.zoneMode === 'multi' ? 'multi' : 'single',
      // Why: only keep string MAC entries from the saved multi-zone list.
      zoneCardMacs: Array.isArray(storedSettings.zoneCardMacs)
        ? storedSettings.zoneCardMacs.filter((mac) => typeof mac === 'string')
        : defaultSettings.zoneCardMacs,
      // Why: Gateway_ID label sent in the capture JSON body.
      gatewayId: storedSettings.gatewayId ?? defaultSettings.gatewayId,
      gpsMinMoveMeters: storedSettings.gpsMinMoveMeters ?? defaultSettings.gpsMinMoveMeters,
      gpsPublishIntervalMs:
        storedSettings.gpsPublishIntervalMs ?? defaultSettings.gpsPublishIntervalMs,
      // Why: ignore packets weaker than this RSSI floor.
      minRssi: storedSettings.minRssi ?? defaultSettings.minRssi,
      // Why: PRESENT re-upload interval while a card stays in range.
      presentIntervalMs: storedSettings.presentIntervalMs ?? defaultSettings.presentIntervalMs,
      // Why: local silence window before the next sighting counts as ENTER again.
      exitTimeoutMs: storedSettings.exitTimeoutMs ?? defaultSettings.exitTimeoutMs,
      // Why: Reader list can show all advertisers or only classified ID cards.
      scannerListMode: storedSettings.scannerListMode === 'cards' ? 'cards' : 'all',
      // Why: debug mode uploads unknown BLE devices for diagnosing new card types.
      unfilteredDebugMode:
        storedSettings.unfilteredDebugMode ?? defaultSettings.unfilteredDebugMode,
    };
  } catch {
    // Why: corrupt JSON should not crash Settings — fall back to defaults.
    return defaultSettings;
  }
}

/** Persist the full BLE gateway settings object after Save. */
export async function saveBleGatewaySettings(gatewaySettings) {
  // Why: AsyncStorage keeps settings local on this driver phone only.
  await AsyncStorage.setItem(BLE_GATEWAY_SETTINGS_STORAGE_KEY, JSON.stringify(gatewaySettings));
}
