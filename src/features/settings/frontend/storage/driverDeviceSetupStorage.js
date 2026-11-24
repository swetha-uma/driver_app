import AsyncStorage from '@react-native-async-storage/async-storage';

// Why: setup screen / logout still track that Location / BT / background were walked through.
const DRIVER_DEVICE_SETUP_STORAGE_KEY = 'driver_app_device_setup_complete_v1'; // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.

/** True when system permission dialogs were walked through at least once on this phone. */
export async function isDriverDeviceSetupComplete() {
  try {
    const savedValue = await AsyncStorage.getItem(DRIVER_DEVICE_SETUP_STORAGE_KEY);
    return savedValue === '1';
  } catch {
    return false;
  }
}

/** Mark that system permission dialogs ran (login still re-asks missing radios every open). */
export async function markDriverDeviceSetupComplete() {
  await AsyncStorage.setItem(DRIVER_DEVICE_SETUP_STORAGE_KEY, '1');
}

/** Clear flag on logout so the next login treats setup as fresh. */
export async function clearDriverDeviceSetupComplete() {
  try {
    await AsyncStorage.removeItem(DRIVER_DEVICE_SETUP_STORAGE_KEY);
  } catch {
    // Why: ignore clear failures — next login still works.
  }
}
