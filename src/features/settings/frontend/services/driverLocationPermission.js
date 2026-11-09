import * as Location from 'expo-location';

/**
 * Ask the driver for location after login.
 * Why: van live tracking needs phone GPS; BLE student capture does not.
 */
export async function requestDriverLocationPermissionAfterLogin() {
  try {
    // Why: foreground is enough to read coords while the driver app is open.
    const foregroundResult = await Location.requestForegroundPermissionsAsync();
    // Why: denied means GPS publishing must stay off (BLE can still run).
    if (foregroundResult.status !== 'granted') {
      return { granted: false, backgroundGranted: false };
    }
    // Why: background helps keep GPS publishing when the screen is off during a trip.
    let backgroundGranted = false;
    try {
      const backgroundResult = await Location.requestBackgroundPermissionsAsync();
      backgroundGranted = backgroundResult.status === 'granted';
    } catch {
      // Why: older Android builds may not support background location dialog.
      backgroundGranted = false;
    }
    return { granted: true, backgroundGranted };
  } catch {
    // Why: missing native Location module must not crash login.
    return { granted: false, backgroundGranted: false };
  }
}

/** True when foreground location permission is currently granted. */
export async function isDriverForegroundLocationGranted() {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    return permission.status === 'granted';
  } catch {
    return false;
  }
}
