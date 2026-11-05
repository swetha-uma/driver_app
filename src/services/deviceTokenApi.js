import { DRIVER_TOKEN_HEADER } from './loginApi';
import { getApiBase } from '../features/settings/backendUrl';

/**
 * Save this phone's FCM token so student-still-on-van rings can reach the driver.
 * @param {string} driverToken Redis session from verify-otp
 * @param {string} fcmToken native push token from expo-notifications
 * @param {'ANDROID'|'IOS'} deviceType platform label the backend stores
 */
export async function saveDriverDeviceToken(driverToken, fcmToken, deviceType) {
  // Why: blank session or token would create an unusable device row
  if (!driverToken || !fcmToken || !deviceType) {
    return;
  }
  // Why: same path as DriverDeviceNames.DEVICE_TOKEN on the backend
  const response = await fetch(`${getApiBase()}/api/v1/driver-app/device-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Why: backend maps employeeId + phone from the Redis session, not the body
      [DRIVER_TOKEN_HEADER]: driverToken,
    },
    body: JSON.stringify({
      fcmToken: String(fcmToken),
      deviceType: String(deviceType),
    }),
  });
  let body;
  try {
    body = await response.json();
  } catch {
    // Why: surface a clear network/parse failure instead of a blank throw
    throw new Error(response.ok ? 'Invalid server response' : 'Could not reach the school server');
  }
  // Why: ApiResponse.success is false when validation or session fails
  if (!response.ok || body.success === false) {
    throw new Error(body.message || 'Could not save device token');
  }
}
