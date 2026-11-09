import { PermissionsAndroid, Platform } from 'react-native';
import * as Location from 'expo-location';

import { requestDriverLocationPermissionAfterLogin } from './driverLocationPermission';
import {
  isBlePhoneBatteryExemptionGranted,
  isBlePhoneBluetoothRadioEnabled,
  isBlePhoneLocationServicesEnabled,
  openBlePhoneBluetoothSettings,
  openBlePhoneLocationSettings,
  requestBlePhoneBatteryExemption,
  requestBlePhoneEnableBluetooth,
  requestBlePhoneEnableLocation,
  requestBlePhoneNearbyPermissionsOnly,
  requestBlePhoneNotificationPermissionOnly,
} from './blePhoneScannerService';

/** Setup phases for status text while native dialogs run. */
export const DRIVER_SETUP_STEPS = {
  LOCATION: 'location',
  BLUETOOTH: 'bluetooth',
  BACKGROUND: 'background',
  DONE: 'done',
};

/**
 * Snapshot of gateway phone readiness after system dialogs.
 */
export async function getDriverGatewayDeviceSetupStatus() {
  const bluetoothPermissionGranted = await checkBleNearbyPermissionsGranted();
  const locationPermissionGranted = await checkLocationPermissionGranted();
  const locationServicesEnabled = await isBlePhoneLocationServicesEnabled();
  const bluetoothRadioEnabled = await isBlePhoneBluetoothRadioEnabled();
  const backgroundScanningAllowed = await isBlePhoneBatteryExemptionGranted();

  return {
    bluetoothPermissionGranted,
    locationPermissionGranted,
    locationServicesEnabled,
    bluetoothRadioEnabled,
    backgroundScanningAllowed,
    locationReady: locationPermissionGranted && locationServicesEnabled,
    bluetoothReady: bluetoothPermissionGranted && bluetoothRadioEnabled,
    backgroundReady: backgroundScanningAllowed,
    isReady:
      locationPermissionGranted &&
      locationServicesEnabled &&
      bluetoothPermissionGranted &&
      bluetoothRadioEnabled,
  };
}

/**
 * Step 1 — Location permission (system dialog), then Location ON panel if still off.
 * Why: Allow on permission grants access; Location panel lets the driver turn the radio ON.
 */
export async function requestDriverLocationSetupStep() {
  const locationPermissionResult = await requestDriverLocationPermissionAfterLogin();
  let locationServicesEnabled = await isBlePhoneLocationServicesEnabled();
  let openedLocationEnable = false;
  if (locationPermissionResult.granted && !locationServicesEnabled) {
    // Why: system Location panel — turn Location ON (closest to Allow → turns on).
    await requestBlePhoneEnableLocation();
    openedLocationEnable = true;
    await waitBriefly(800);
    locationServicesEnabled = await isBlePhoneLocationServicesEnabled();
  }
  return {
    locationPermissionGranted: Boolean(locationPermissionResult?.granted),
    locationBackgroundGranted: Boolean(locationPermissionResult?.backgroundGranted),
    locationServicesEnabled,
    openedLocationSettings: openedLocationEnable,
  };
}

/**
 * Step 2 — Nearby devices permission, then Bluetooth enable system dialog if radio off.
 * Why: ACTION_REQUEST_ENABLE shows Deny/Allow; Allow turns Bluetooth ON automatically.
 */
export async function requestDriverBluetoothSetupStep() {
  const bluetoothPermissionGranted = await requestBlePhoneNearbyPermissionsOnly();
  let bluetoothRadioEnabled = await isBlePhoneBluetoothRadioEnabled();
  let openedBluetoothSettings = false;
  if (bluetoothPermissionGranted && !bluetoothRadioEnabled) {
    await requestBlePhoneEnableBluetooth();
    openedBluetoothSettings = true;
    await waitBriefly(800);
    bluetoothRadioEnabled = await isBlePhoneBluetoothRadioEnabled();
  }
  return {
    bluetoothPermissionGranted: Boolean(bluetoothPermissionGranted),
    bluetoothRadioEnabled,
    openedBluetoothSettings,
  };
}

/**
 * Step 3 — Notification (13+) then “run in background?” battery dialog.
 * Why: Allow on that dialog enables background scanning exemption automatically.
 */
export async function requestDriverBackgroundSetupStep() {
  await requestBlePhoneNotificationPermissionOnly();
  await requestBlePhoneBatteryExemption();
  await waitBriefly(600);
  const backgroundScanningAllowed = await isBlePhoneBatteryExemptionGranted();
  return { backgroundScanningAllowed: Boolean(backgroundScanningAllowed) };
}

/**
 * Run Location → Bluetooth → background system dialogs in order.
 * Why: one flow after login; each Allow turns on what Android allows.
 */
export async function runDriverNativePermissionSetupSequence(onStep) {
  onStep?.(DRIVER_SETUP_STEPS.LOCATION, 'Phone is asking for Location…');
  const locationResult = await requestDriverLocationSetupStep();

  onStep?.(DRIVER_SETUP_STEPS.BLUETOOTH, 'Phone is asking for Bluetooth / Nearby devices…');
  const bluetoothResult = await requestDriverBluetoothSetupStep();

  onStep?.(DRIVER_SETUP_STEPS.BACKGROUND, 'Phone is asking to run in background…');
  const backgroundResult = await requestDriverBackgroundSetupStep();

  const status = await getDriverGatewayDeviceSetupStatus();
  onStep?.(
    status.isReady && status.backgroundReady
      ? DRIVER_SETUP_STEPS.DONE
      : DRIVER_SETUP_STEPS.BACKGROUND,
    status.isReady
      ? 'Permissions allowed. Continue to Home.'
      : 'Some items still need Allow — tap Ask again, or Continue.',
  );

  return {
    locationResult,
    bluetoothResult,
    backgroundResult,
    status,
  };
}

export async function openDriverLocationServicesSettings() {
  await openBlePhoneLocationSettings();
}

export async function openDriverBluetoothRadioSettings() {
  await openBlePhoneBluetoothSettings();
}

export async function requestDriverBackgroundScanningExemption() {
  await requestBlePhoneBatteryExemption();
}

function waitBriefly(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkLocationPermissionGranted() {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    return permission.status === 'granted';
  } catch {
    return false;
  }
}

async function checkBleNearbyPermissionsGranted() {
  if (Platform.OS !== 'android') return false;
  try {
    const androidApiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0;
    const androidPermissionNames = PermissionsAndroid.PERMISSIONS;
    const fineGranted = await PermissionsAndroid.check(
      androidPermissionNames.ACCESS_FINE_LOCATION,
    );
    const coarseGranted = await PermissionsAndroid.check(
      androidPermissionNames.ACCESS_COARSE_LOCATION,
    );
    const isLocationPermissionGranted = fineGranted || coarseGranted;
    if (androidApiLevel < 31) return isLocationPermissionGranted;
    const scanGranted = await PermissionsAndroid.check(androidPermissionNames.BLUETOOTH_SCAN);
    const connectGranted = await PermissionsAndroid.check(
      androidPermissionNames.BLUETOOTH_CONNECT,
    );
    return scanGranted && connectGranted;
  } catch {
    return false;
  }
}
