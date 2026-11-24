import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { saveTeacherDeviceToken } from '../api/teacherApi';
import { ensureTeacherNoticeChannel } from './ensureTeacherNoticeChannel';

/**
 * Option 1 — shared-phone FCM:
 * Ask notification permission (OS shows dialog only once), read this phone's FCM token,
 * then POST it so the server reuses the same teacher_app_device row and updates
 * employee_id + phone for the staff who just logged in.
 *
 * @param {string} teacherToken Session from verify-otp
 * @returns {Promise<boolean>} true when the token was saved
 */
export async function registerStaffFcmToken(teacherToken) {
  if (!teacherToken) return false;

  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') {
    console.warn('[StaffFcm] notification permission not granted:', permission.status);
    return false;
  }

  await ensureTeacherNoticeChannel();

  const device = await Notifications.getDevicePushTokenAsync();
  const fcmToken = device?.data;
  if (!fcmToken) {
    console.warn('[StaffFcm] no FCM token from device');
    return false;
  }

  const deviceType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  await saveTeacherDeviceToken(teacherToken, String(fcmToken), deviceType);
  console.log('[StaffFcm] FCM bound for current login (server updates employee_id + phone on same row)');
  return true;
}
