import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { saveOwnerDeviceToken } from '../api/ownerApi';

/**
 * Ask notification permission, read this phone's FCM token, then save it so the
 * end-of-day late-staff summary job (and other Owner pushes) can reach this device.
 *
 * @param {string} ownerToken Session from verify-otp
 * @returns {Promise<boolean>} true when the token was saved
 */
export async function registerOwnerFcmToken(ownerToken) {
  if (!ownerToken) return false;

  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') {
    console.warn('[OwnerFcm] notification permission not granted:', permission.status);
    return false;
  }

  const device = await Notifications.getDevicePushTokenAsync();
  const fcmToken = device?.data;
  if (!fcmToken) {
    console.warn('[OwnerFcm] no FCM token from device');
    return false;
  }

  const deviceType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  await saveOwnerDeviceToken(ownerToken, String(fcmToken), deviceType);
  return true;
}
