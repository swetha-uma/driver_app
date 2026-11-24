import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { TEACHER_NOTICE_CHANNEL_ID } from './teacherPushDeepLink';

/**
 * Creates the Android tray channel with default phone notification sound.
 * Call at app start so late/leave pushes are not silent.
 */
export async function ensureTeacherNoticeChannel() { // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(TEACHER_NOTICE_CHANNEL_ID, {
      name: 'Teacher notices',
      description: 'Late attendance and leave status alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
      bypassDnd: false,
    });
  } catch (err) {
    console.warn('[TeacherPush] notice channel setup failed:', err?.message || err);
  }
}
