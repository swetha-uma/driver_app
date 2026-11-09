import { requireNativeModule } from 'expo-modules-core';
import { PermissionsAndroid, Platform } from 'react-native';

import { BleAdvertisementPacketAggregator } from './bleAdvertisementAggregator';

// Why: poll native counters every 2s so the UI can show packet gaps vs JS.
const BLE_SCAN_STATS_POLL_INTERVAL_MS = 2_000;
// Why: short delay before startScan reduces Android "too many starts" race after stop.
const BLE_SCAN_PRE_START_DELAY_MS = 300;
// Why: Location OFF blocks BLE scan results on Android even when BT is on.
const BLE_LOCATION_OFF_MESSAGE =
  'Phone Location is OFF. Turn Location ON (Settings → Location). On Xiaomi also enable ' +
  'Settings → Location → Location services → Bluetooth scanning.';

// Why: one aggregator instance merges AD + scan-response packets across the whole app session.
const bleAdvertisementPacketAggregator = new BleAdvertisementPacketAggregator();

// Why: cache the native module lookup so we do not re-require on every call.
let cachedNativeBleScannerModule = undefined;
// Why: keep active native event subscriptions so stop can remove them cleanly.
let activeBleScanEventSubscriptions = [];
// Why: interval id for native stats polling while a scan is live.
let bleScanStatsPollTimerId = null;
// Why: true while start succeeded and stop has not run for this session.
let isBlePhoneScanRunning = false;
// Why: 'gateway' or 'reader' so one screen unmount does not stop the other role's scan.
let currentBleScanOwnerRole = null;
// Why: latest callbacks from the screen that owns the scan.
let activeBleScanCallbacks = null;
// Why: bumping this invalidates in-flight async start work after a stop.
let bleScanSessionGenerationId = 0;
// Why: hold live packet / restart counters for the Scan Stats bar.
let currentBleScanStatsSnapshot = buildEmptyBleScanStatsSnapshot();

/** Build a zeroed scan-stats object for a new scan session. */
function buildEmptyBleScanStatsSnapshot() {
  // Why: packets = JS events; nativeResults = Kotlin count; gap means bridge drop.
  return {
    packets: 0,
    nativeResults: 0,
    restarts: 0,
    lastPacketAt: null,
    profile: null,
  };
}

/** Resolve the Android NativeBleScanner Expo module, or null when the APK lacks it. */
function getNativeBleScannerModule() {
  // Why: undefined means "not looked up yet"; null means "looked up and missing".
  if (cachedNativeBleScannerModule !== undefined) return cachedNativeBleScannerModule;
  try {
    // Why: requireNativeModule throws when the native side was not linked into this build.
    cachedNativeBleScannerModule = requireNativeModule('NativeBleScanner');
  } catch {
    // Why: Expo Go / old APK has no BLE module — mark null so callers show a clear error.
    cachedNativeBleScannerModule = null;
  }
  return cachedNativeBleScannerModule;
}

/** Wait a fixed number of milliseconds (used before startScan). */
function waitBleScanMilliseconds(delayMilliseconds) {
  // Why: Promise wrapper keeps startBlePhoneScan async/await readable.
  return new Promise((resolveWait) => setTimeout(resolveWait, delayMilliseconds));
}

/** True when this Android build includes the native BLE scanner. */
export function isBlePhoneNativeScannerAvailable() {
  // Why: iOS is out of scope for this driver BLE port.
  return Platform.OS === 'android' && getNativeBleScannerModule() !== null;
}

/** True while a BLE scan session is currently running. */
export function isBlePhoneScanActive() {
  // Why: Gateway and Reader screens both need a shared "is scanning" flag.
  return isBlePhoneScanRunning;
}

/** Return which settings role currently owns the scan: gateway, reader, or null. */
export function getBlePhoneScanOwnerRole() {
  // Why: stop only acts when the caller matches the owner role.
  return currentBleScanOwnerRole;
}

/** Return the latest packet/restart counters for the UI stats bar. */
export function getBlePhoneScanStatsSnapshot() {
  // Why: UI polls this without talking to native on every render.
  return currentBleScanStatsSnapshot;
}

/** Ask Android for BLE + Location permissions required to scan advertisements. */
async function requestBlePhoneAndroidScanPermissions() {
  // Why: API level decides whether runtime BLUETOOTH_SCAN exists (31+).
  const androidApiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0;
  // Why: PermissionsAndroid.PERMISSIONS keeps string constants in one place.
  const androidPermissionNames = PermissionsAndroid.PERMISSIONS;
  // Why: Android 12+ needs explicit nearby-devices permissions for BLE scan.
  const requiredPermissionList =
    androidApiLevel >= 31
      ? [
          androidPermissionNames.BLUETOOTH_SCAN,
          androidPermissionNames.BLUETOOTH_CONNECT,
          androidPermissionNames.ACCESS_FINE_LOCATION,
          androidPermissionNames.ACCESS_COARSE_LOCATION,
        ]
      : [androidPermissionNames.ACCESS_FINE_LOCATION, androidPermissionNames.ACCESS_COARSE_LOCATION];
  // Why: foreground-service notification on Android 13+ needs POST_NOTIFICATIONS (optional for scan).
  const notificationPermissionList =
    androidApiLevel >= 33 ? [androidPermissionNames.POST_NOTIFICATIONS] : [];
  // Why: requestMultiple shows one system dialog batch for the driver.
  const permissionResults = await PermissionsAndroid.requestMultiple([
    ...requiredPermissionList,
    ...notificationPermissionList,
  ]);
  // Why: either fine or coarse location is enough for scan results on older APIs.
  const isLocationPermissionGranted =
    permissionResults[androidPermissionNames.ACCESS_FINE_LOCATION] === 'granted' ||
    permissionResults[androidPermissionNames.ACCESS_COARSE_LOCATION] === 'granted';
  // Why: pre-31 only needs location for BLE scan.
  if (androidApiLevel < 31) return isLocationPermissionGranted;
  // Why: Android 12+ requires both BLE nearby permissions plus location.
  return (
    permissionResults[androidPermissionNames.BLUETOOTH_SCAN] === 'granted' &&
    permissionResults[androidPermissionNames.BLUETOOTH_CONNECT] === 'granted' &&
    isLocationPermissionGranted
  );
}

/** Return a driver-facing blocker message, or null when the phone can scan. */
async function findBlePhoneScanBlockerReason(nativeBleScannerModule) {
  // Why: permissions must be granted before Location check so the dialog appears first.
  const arePermissionsGranted = await requestBlePhoneAndroidScanPermissions();
  if (!arePermissionsGranted) {
    // Why: tell the driver exactly which settings to open.
    return 'Nearby devices and Location permissions are required. Allow them in the app settings.';
  }
  // Why: Location services toggle must be ON or Android hides BLE results.
  const isPhoneLocationEnabled = await nativeBleScannerModule.isLocationEnabled();
  // Why: null means ready; message means show error and abort start.
  return isPhoneLocationEnabled ? null : BLE_LOCATION_OFF_MESSAGE;
}

/** Attach native advertisement / status / error listeners for the active scan. */
function attachBlePhoneScanEventListeners(nativeBleScannerModule) {
  // Why: replace any previous subscription list for this new session.
  activeBleScanEventSubscriptions = [
    nativeBleScannerModule.addListener('onAdvertisement', (nativeAdvertisementPayload) => {
      // Why: ignore late events after stop flipped the running flag.
      if (!isBlePhoneScanRunning) return;
      // Why: bump JS packet counter and remember last hear time for the stats bar.
      currentBleScanStatsSnapshot = {
        ...currentBleScanStatsSnapshot,
        packets: currentBleScanStatsSnapshot.packets + 1,
        lastPacketAt: Date.now(),
      };
      // Why: merge AD + scan response before Gateway/Reader see the beacon.
      const scannedBeacon =
        bleAdvertisementPacketAggregator.ingestNativeAdvertisement(nativeAdvertisementPayload);
      // Why: only forward when MAC parsed and aggregator produced a beacon.
      if (scannedBeacon) activeBleScanCallbacks?.onBeacon(scannedBeacon);
    }),
    nativeBleScannerModule.addListener('onScanStatus', (statusPayload) => {
      // Why: surface native restart messages into the Gateway/Reader status line.
      activeBleScanCallbacks?.onStatus(statusPayload.message);
    }),
    nativeBleScannerModule.addListener('onScanError', (errorPayload) => {
      // Why: capture callbacks before stop clears them.
      const callbacksBeforeStop = activeBleScanCallbacks;
      // Why: hard-stop on native error so the UI does not think scan is still live.
      stopBlePhoneScan();
      // Why: show the native error string on the owning screen.
      callbacksBeforeStop?.onError(errorPayload.message);
    }),
  ];
}

/** Poll native getStats so the UI can compare JS packets vs native results. */
function startBlePhoneScanStatsPolling(nativeBleScannerModule, scanSessionId) {
  // Why: store timer so stop can clear it.
  bleScanStatsPollTimerId = setInterval(() => {
    nativeBleScannerModule
      .getStats()
      .then((nativeStatsPayload) => {
        // Why: ignore results from a previous generation after stop/start.
        if (scanSessionId !== bleScanSessionGenerationId) return;
        // Why: merge native counters into the shared snapshot.
        currentBleScanStatsSnapshot = {
          ...currentBleScanStatsSnapshot,
          nativeResults: nativeStatsPayload.results,
          restarts: nativeStatsPayload.restarts,
          profile: nativeStatsPayload.profile,
        };
      })
      .catch(() => undefined);
  }, BLE_SCAN_STATS_POLL_INTERVAL_MS);
}

/** Turn an unknown thrown value into a short driver-facing string. */
function describeBlePhoneScanThrownError(thrownError) {
  // Why: Error.message is readable; non-Error values need a fallback string.
  return thrownError instanceof Error
    ? thrownError.message
    : 'Could not start the Bluetooth scan.';
}

/** Start the Android foreground service that keeps Gateway scan alive with screen off. */
async function startBlePhoneBackgroundScanService(nativeBleScannerModule) {
  try {
    // Why: foreground notification prevents OEM kill while the driver walks with screen off.
    await nativeBleScannerModule.startScanService();
    // Why: append a short note to the status line when background keep-alive works.
    return ' · keeps scanning with the screen off';
  } catch (thrownError) {
    // Why: older APKs may lack the service — still allow foreground scan.
    return ` · screen-off scanning unavailable (${describeBlePhoneScanThrownError(thrownError)})`;
  }
}

/** Stop the Android foreground scan service if it was started. */
async function stopBlePhoneBackgroundScanService(nativeBleScannerModule) {
  try {
    // Why: leave no orphan notification after the driver stops Gateway scan.
    await nativeBleScannerModule.stopScanService();
  } catch {
    // Why: missing service method on old builds is safe to ignore.
  }
}

/** True when Android battery optimisation will not kill background BLE scan. */
export async function isBlePhoneBatteryExemptionGranted() {
  // Why: Settings UI shows Allow / Restricted based on this flag.
  const nativeBleScannerModule = getNativeBleScannerModule();
  if (Platform.OS !== 'android' || !nativeBleScannerModule) return false;
  try {
    // Why: native PowerManager check matches system Battery settings.
    return await nativeBleScannerModule.isIgnoringBatteryOptimizations();
  } catch {
    // Why: old APK without the method should not crash Settings.
    return false;
  }
}

/** Open the system dialog that lets the driver exempt this app from battery optimisation. */
export async function requestBlePhoneBatteryExemption() {
  // Why: Settings "Allow background scanning" button calls this.
  const nativeBleScannerModule = getNativeBleScannerModule();
  if (Platform.OS !== 'android' || !nativeBleScannerModule) return;
  try {
    // Why: Intent opens the OEM battery-exemption page for this package.
    await nativeBleScannerModule.requestIgnoreBatteryOptimizations();
  } catch {
    // Why: driver can still grant exemption manually in phone settings.
  }
}

/** True when phone Bluetooth radio is currently ON. */
export async function isBlePhoneBluetoothRadioEnabled() {
  // Why: setup screen must know whether to open Bluetooth settings after permission grant.
  const nativeBleScannerModule = getNativeBleScannerModule();
  if (Platform.OS !== 'android' || !nativeBleScannerModule) return false;
  try {
    return await nativeBleScannerModule.isBluetoothEnabled();
  } catch {
    return false;
  }
}

/** True when phone Location services toggle is ON. */
export async function isBlePhoneLocationServicesEnabled() {
  // Why: Android hides BLE results when Location services are off.
  const nativeBleScannerModule = getNativeBleScannerModule();
  if (Platform.OS !== 'android' || !nativeBleScannerModule) return false;
  try {
    return await nativeBleScannerModule.isLocationEnabled();
  } catch {
    return false;
  }
}

/** Open the system Bluetooth settings panel so the driver can turn BT ON. */
export async function openBlePhoneBluetoothSettings() {
  // Why: apps cannot force-enable Bluetooth on modern Android — open the system toggle UI.
  const nativeBleScannerModule = getNativeBleScannerModule();
  if (Platform.OS !== 'android' || !nativeBleScannerModule) return;
  try {
    await nativeBleScannerModule.openBluetoothSettings();
  } catch {
    // Why: older APK without this method — driver opens Bluetooth manually.
  }
}

/** Open the system Location settings panel so the driver can turn Location ON. */
export async function openBlePhoneLocationSettings() {
  // Why: apps cannot force-enable Location services — open the system toggle UI.
  const nativeBleScannerModule = getNativeBleScannerModule();
  if (Platform.OS !== 'android' || !nativeBleScannerModule) return;
  try {
    await nativeBleScannerModule.openLocationSettings();
  } catch {
    // Why: older APK without this method — driver opens Location manually.
  }
}

/**
 * System dialog to turn Bluetooth ON (Allow → radio enables automatically).
 * Why: same Deny/Allow style as background battery prompt.
 */
export async function requestBlePhoneEnableBluetooth() {
  const nativeBleScannerModule = getNativeBleScannerModule();
  if (Platform.OS !== 'android' || !nativeBleScannerModule) return;
  try {
    if (typeof nativeBleScannerModule.requestEnableBluetooth === 'function') {
      await nativeBleScannerModule.requestEnableBluetooth();
      return;
    }
    await nativeBleScannerModule.openBluetoothSettings();
  } catch {
    // Why: older APK — fall back to Bluetooth settings page.
    try {
      await nativeBleScannerModule.openBluetoothSettings();
    } catch {
      // ignore
    }
  }
}

/**
 * System Location panel so the driver can turn Location services ON after Allow.
 * Why: Android will not silently force Location ON; panel is the closest system prompt.
 */
export async function requestBlePhoneEnableLocation() {
  const nativeBleScannerModule = getNativeBleScannerModule();
  if (Platform.OS !== 'android' || !nativeBleScannerModule) return;
  try {
    if (typeof nativeBleScannerModule.requestEnableLocation === 'function') {
      await nativeBleScannerModule.requestEnableLocation();
      return;
    }
    await nativeBleScannerModule.openLocationSettings();
  } catch {
    try {
      await nativeBleScannerModule.openLocationSettings();
    } catch {
      // ignore
    }
  }
}

/** Ask Android for BLE nearby + location permissions (used by setup screen and Start scan). */
export async function requestBlePhoneScanPermissionsForSetup() {
  // Why: setup screen reuses the same permission set Start scan needs later.
  return requestBlePhoneAndroidScanPermissions();
}

/**
 * Ask only for Nearby devices (Bluetooth) permissions — one system dialog step.
 * Why: setup screen asks Location, then Bluetooth, then battery, not all at once.
 */
export async function requestBlePhoneNearbyPermissionsOnly() {
  if (Platform.OS !== 'android') return false;
  const androidApiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0;
  const androidPermissionNames = PermissionsAndroid.PERMISSIONS;
  // Why: before Android 12, BLE scan rides on Location permission (asked in Location step).
  if (androidApiLevel < 31) {
    const fineGranted = await PermissionsAndroid.check(
      androidPermissionNames.ACCESS_FINE_LOCATION,
    );
    const coarseGranted = await PermissionsAndroid.check(
      androidPermissionNames.ACCESS_COARSE_LOCATION,
    );
    return fineGranted || coarseGranted;
  }
  // Why: ask SCAN then CONNECT separately so the driver sees clear system prompts.
  const scanResult = await PermissionsAndroid.request(androidPermissionNames.BLUETOOTH_SCAN, {
    title: 'Bluetooth / Nearby devices',
    message: 'Allow Nearby devices so this phone can hear student BLE tags in the van.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  if (scanResult !== PermissionsAndroid.RESULTS.GRANTED) return false;
  const connectResult = await PermissionsAndroid.request(
    androidPermissionNames.BLUETOOTH_CONNECT,
    {
      title: 'Bluetooth connect',
      message: 'Allow Bluetooth connect so the van gateway can use this phone’s Bluetooth radio.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return connectResult === PermissionsAndroid.RESULTS.GRANTED;
}

/** Ask notification permission (Android 13+) as part of background scanning setup. */
export async function requestBlePhoneNotificationPermissionOnly() {
  if (Platform.OS !== 'android') return true;
  const androidApiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0;
  if (androidApiLevel < 33) return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    {
      title: 'Background scanning notification',
      message: 'Allow notifications so Gateway can show that scanning is running in the background.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Start BLE advertisement scanning for Gateway or Reader.
 * @param {{ onBeacon: Function, onError: Function, onStatus: Function }} scanCallbacks
 * @param {'gateway'|'reader'} scanOwnerRole
 */
export async function startBlePhoneScan(scanCallbacks, scanOwnerRole = 'gateway') {
  // Why: same owner re-attaching callbacks should not restart native scan.
  if (isBlePhoneScanRunning && currentBleScanOwnerRole === scanOwnerRole) {
    activeBleScanCallbacks = scanCallbacks;
    scanCallbacks.onStatus('Scanning every advertisement (no filter).');
    return;
  }
  // Why: switching Gateway ↔ Reader must stop the previous owner's scan first.
  if (isBlePhoneScanRunning) stopBlePhoneScan();

  const nativeBleScannerModule = getNativeBleScannerModule();
  if (Platform.OS !== 'android' || !nativeBleScannerModule) {
    // Why: Expo Go cannot load NativeBleScanner — driver needs a rebuilt APK.
    scanCallbacks.onError('Native BLE scanner is missing. Install the latest Android build (APK).');
    return;
  }

  // Why: new session id invalidates any in-flight previous start.
  bleScanSessionGenerationId += 1;
  const thisScanSessionId = bleScanSessionGenerationId;
  // Why: mark running early so late stop during await still wins via session id.
  isBlePhoneScanRunning = true;
  currentBleScanOwnerRole = scanOwnerRole;
  activeBleScanCallbacks = scanCallbacks;
  currentBleScanStatsSnapshot = buildEmptyBleScanStatsSnapshot();
  // Why: clear merged device state so Reader/Gateway do not show stale MACs.
  bleAdvertisementPacketAggregator.resetAggregatedDevices();

  try {
    const blockerReason = await findBlePhoneScanBlockerReason(nativeBleScannerModule);
    // Why: stop during permission dialog should abort silently.
    if (thisScanSessionId !== bleScanSessionGenerationId) return;
    if (blockerReason) {
      stopBlePhoneScan();
      scanCallbacks.onError(blockerReason);
      return;
    }

    attachBlePhoneScanEventListeners(nativeBleScannerModule);
    await waitBleScanMilliseconds(BLE_SCAN_PRE_START_DELAY_MS);
    if (thisScanSessionId !== bleScanSessionGenerationId) return;

    // Why: startScan returns the active scan profile label for the status line.
    currentBleScanStatsSnapshot = {
      ...currentBleScanStatsSnapshot,
      profile: await nativeBleScannerModule.startScan(),
    };
    if (thisScanSessionId !== bleScanSessionGenerationId) {
      // Why: stop native scan if the session was cancelled mid-start.
      void nativeBleScannerModule.stopScan().catch(() => undefined);
      return;
    }
  } catch (thrownError) {
    if (thisScanSessionId !== bleScanSessionGenerationId) return;
    stopBlePhoneScan();
    scanCallbacks.onError(describeBlePhoneScanThrownError(thrownError));
    return;
  }

  // Why: only Gateway needs screen-off keep-alive; Reader is a foreground debug tool.
  const backgroundScanStatusNote =
    scanOwnerRole === 'gateway' ? await startBlePhoneBackgroundScanService(nativeBleScannerModule) : '';
  if (thisScanSessionId !== bleScanSessionGenerationId) return;

  startBlePhoneScanStatsPolling(nativeBleScannerModule, thisScanSessionId);
  scanCallbacks.onStatus(
    `Scanning every advertisement (no filter) · ${currentBleScanStatsSnapshot.profile ?? 'default'}${backgroundScanStatusNote}`,
  );
}

/**
 * Stop BLE scanning.
 * When scanOwnerRole is passed, only stop if that role currently owns the scan.
 */
export function stopBlePhoneScan(scanOwnerRole) {
  // Why: Gateway unmount must not kill Reader scan, and vice versa.
  if (scanOwnerRole && currentBleScanOwnerRole && scanOwnerRole !== currentBleScanOwnerRole) return;

  // Why: invalidate in-flight startBlePhoneScan awaits.
  bleScanSessionGenerationId += 1;
  isBlePhoneScanRunning = false;
  currentBleScanOwnerRole = null;
  activeBleScanCallbacks = null;

  // Why: detach native listeners so stopped sessions stop receiving packets.
  activeBleScanEventSubscriptions.forEach((eventSubscription) => eventSubscription.remove());
  activeBleScanEventSubscriptions = [];
  if (bleScanStatsPollTimerId) clearInterval(bleScanStatsPollTimerId);
  bleScanStatsPollTimerId = null;
  const nativeBleScannerModule = getNativeBleScannerModule();
  // Why: always ask native to stop even if JS thinks it was already stopped.
  void nativeBleScannerModule?.stopScan().catch(() => undefined);
  if (nativeBleScannerModule) void stopBlePhoneBackgroundScanService(nativeBleScannerModule);
}
