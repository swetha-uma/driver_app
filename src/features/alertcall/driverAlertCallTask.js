import * as TaskManager from 'expo-task-manager';
import { presentIncomingAlertCall } from 'incoming-alert-call';

import {
  DRIVER_STUDENT_STILL_ON_VAN_FCM_TYPE,
} from '../../constants/alertCall';

/** Background task name. Must be registered before the app paints. */
export const DRIVER_ALERT_CALL_TASK = 'DRIVER_ALERT_CALL_TASK';

/**
 * Read still-on-van fields from whichever shape Expo gives a background push.
 */
function callData(taskData) {
  const content = taskData?.notification?.request?.content;
  const nested = content?.data || taskData?.data || taskData || {};
  const data = nested.data && typeof nested.data === 'object' ? nested.data : nested;
  // Why: only student-still-on-van rings use this wake path
  if (data.type !== DRIVER_STUDENT_STILL_ON_VAN_FCM_TYPE) return null;
  return {
    title: data.title || content?.title || 'Student still on van',
    // Why: full spoken sentence stays in data; tray text stays short
    body: data.body || data.message || '',
    bodyTamil: data.bodyTamil || '',
    titleTamil: data.titleTamil || '',
    tripId: data.tripId || '',
    studentId: data.studentId || '',
    // Why: only the server push has a trip id — local ring must not reschedule itself
    fromServer: Boolean(data.tripId),
  };
}

/**
 * Open the native full-screen call Activity + ringtone immediately (no tray tap).
 */
export async function presentDriverAlertCall(call) {
  if (!call) return;
  // Why: native Activity + FSI notification — works when locked / backgrounded
  await presentIncomingAlertCall(call);
}

// Why: defined at import time so a push can run it while the app is closed / locked
TaskManager.defineTask(DRIVER_ALERT_CALL_TASK, async ({ data, error }) => {
  if (error) return;
  const call = callData(data);
  if (!call?.fromServer) return;
  await presentDriverAlertCall(call);
});
