import { DRIVER_TOKEN_HEADER } from './loginApi';
import { getApiBase } from '../features/settings/backendUrl';

/**
 * Register this phone's FCM token for driver alert calls.
 * Backend: POST /api/v1/driver-app/device-token (writes shared teacher_app_device row).
 *
 * @param {string} driverToken Redis session from verify-otp
 * @param {string} fcmToken Device push token
 * @param {'ANDROID'|'IOS'} deviceType
 */
export async function saveDriverDeviceToken(driverToken, fcmToken, deviceType) {
  if (!driverToken || !fcmToken || !deviceType) {
    throw new Error('Missing driver token, FCM token, or device type');
  }
  const url = `${getApiBase()}/api/v1/driver-app/device-token`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [DRIVER_TOKEN_HEADER]: driverToken,
    },
    body: JSON.stringify({
      fcmToken: String(fcmToken),
      deviceType: String(deviceType).toUpperCase(),
    }),
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(response.ok ? 'Invalid server response' : 'Could not reach the school server');
  }
  if (!response.ok || body.success === false) {
    throw new Error(body.message || 'Could not save device token');
  }
  return body;
}
