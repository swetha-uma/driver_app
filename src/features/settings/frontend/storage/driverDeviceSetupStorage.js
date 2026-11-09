import AsyncStorage from '@react-native-async-storage/async-storage';

// Why: remember native Location / BT / background dialogs were already asked on this phone.
const DRIVER_DEVICE_SETUP_STORAGE_KEY = 'driver_app_device_setup_complete_v1';

/** True when system permission dialogs were already shown once. */
export async function isDriverDeviceSetupComplete() {
  try {
    const savedValue = await AsyncStorage.getItem(DRIVER_DEVICE_SETUP_STORAGE_KEY);
    return savedValue === '1';
  } catch {
    return false;
  }
}

/** Mark that system permission dialogs were asked (so we do not spam every launch). */
export async function markDriverDeviceSetupComplete() {
  await AsyncStorage.setItem(DRIVER_DEVICE_SETUP_STORAGE_KEY, '1');
}

/** Clear flag on logout so the next login asks system dialogs again. */
export async function clearDriverDeviceSetupComplete() {
  try {
    await AsyncStorage.removeItem(DRIVER_DEVICE_SETUP_STORAGE_KEY);
  } catch {
    // Why: ignore clear failures — next login still works.
  }
}
