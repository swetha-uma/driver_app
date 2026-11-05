import { Platform } from 'react-native';

let Native = null;

try {
  // Why: only present after a native rebuild includes this Expo module
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const { requireNativeModule } = require('expo-modules-core');
  Native = requireNativeModule('IncomingAlertCall');
} catch {
  Native = null;
}

/**
 * Open the native full-screen call Activity + ringtone (no notification tap needed).
 * @param {{ title?: string, titleTamil?: string, body?: string, bodyTamil?: string, tripId?: string, studentId?: string }} call
 */
export async function presentIncomingAlertCall(call) {
  if (!Native || Platform.OS !== 'android' || !call) {
    return false;
  }
  try {
    await Native.present({
      title: call.title || 'Student still on van',
      titleTamil: call.titleTamil || '',
      body: call.body || '',
      bodyTamil: call.bodyTamil || '',
      tripId: call.tripId || '',
      studentId: call.studentId || '',
    });
    return true;
  } catch {
    // Why: missing native module must not crash the headless FCM task
    return false;
  }
}

/** Stop ringtone + cancel the sticky full-screen notification. */
export function dismissIncomingAlertCall() {
  try {
    Native?.dismiss?.();
  } catch {
    // ignore
  }
}

/**
 * Subscribe to native Answer / Reject / opened events.
 * @param {'incomingAlertCallOpened'|'incomingAlertCallAnswered'|'incomingAlertCallRejected'} eventName
 * @param {(payload: object) => void} listener
 */
export function addIncomingAlertCallListener(eventName, listener) {
  if (!Native?.addListener) {
    return { remove: () => undefined };
  }
  // Why: Expo NativeModule is already an EventEmitter (SDK 52+)
  return Native.addListener(eventName, listener);
}

/**
 * If the driver Answered while JS was not awake, return that payload once.
 */
export function consumePendingAnsweredAlertCall() {
  try {
    return Native?.consumePendingAnswered?.() || null;
  } catch {
    return null;
  }
}

/**
 * True when the OS allows full-screen incoming-call UI over lock / other apps.
 * Why: Android 14+ needs a separate toggle; older OS returns true.
 */
export function canUseFullScreenIntent() {
  if (Platform.OS !== 'android' || !Native?.canUseFullScreenIntent) {
    // Why: iOS / Expo Go — nothing to prompt for
    return true;
  }
  try {
    return Boolean(Native.canUseFullScreenIntent());
  } catch {
    return true;
  }
}

/**
 * Opens system settings so the driver can turn on full-screen notifications.
 * @returns {boolean} true when the settings screen was launched
 */
export function openFullScreenIntentSettings() {
  if (Platform.OS !== 'android' || !Native?.openFullScreenIntentSettings) {
    return false;
  }
  try {
    return Boolean(Native.openFullScreenIntentSettings());
  } catch {
    return false;
  }
}
