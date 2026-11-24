import { useEffect, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import {
  addIncomingAlertCallListener,
  canUseFullScreenIntent,
  consumePendingAnsweredAlertCall,
  dismissIncomingAlertCall,
  openFullScreenIntentSettings,
  presentIncomingAlertCall,
} from 'incoming-alert-call';

import {
  DRIVER_ALERT_CALL_CHANNEL_ID,
  DRIVER_STUDENT_STILL_ON_VAN_FCM_TYPE,
} from '../../constants/alertCall';
import { registerStaffFcmToken } from '../teacherapp/push/registerStaffFcmToken';
import IncomingStudentStillOnVanCall, {
  studentStillOnVanCallId,
  useIncomingStudentStillOnVanCall,
} from './IncomingStudentStillOnVanCall';
import { DRIVER_ALERT_CALL_TASK } from './driverAlertCallTask';

// Why: foreground sound/banner policy lives in App.js (plays default for late/leave)

/**
 * Sets up alert-call channel/task + FSI, and saves FCM via the shared teacher device-token API.
 */
export default function StudentStillOnVanCallListener({ driverToken, teacherToken }) { // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.
  // Why: after Answer, React shows the attended / TTS screen
  const { call, setCall } = useIncomingStudentStillOnVanCall();
  // Why: blocks duplicate FCM while one ring is already open
  const openIdRef = useRef('');
  // Why: true once native Answer — modal starts in attended mode (no second ring)
  const answeredRef = useRef(false);
  // Why: true while the FSI Allow/Deny alert is on screen — blocks duplicate dialogs
  const fullScreenPromptOpenRef = useRef(false);

  useEffect(() => {
    // Why: ignore when the driver is logged out
    if (!driverToken) return undefined;
    let cancelled = false;
    fullScreenPromptOpenRef.current = false;

    /**
     * If full-screen notifications are off, show Allow / Deny.
     * Why: without Allow, Android only shows a tray message instead of the blue call screen.
     * Why: Android has no auto-grant API — Allow opens the system page so the driver can enable it.
     * Why: re-ask on resume when the switch was turned off after Allow.
     */
    function promptFullScreenIntentIfNeeded() {
      if (cancelled || Platform.OS !== 'android') {
        return;
      }
      // Why: already allowed — clear any open-prompt lock
      if (canUseFullScreenIntent()) {
        fullScreenPromptOpenRef.current = false;
        return;
      }
      if (fullScreenPromptOpenRef.current) {
        return;
      }
      fullScreenPromptOpenRef.current = true;
      Alert.alert(
        'Allow full screen notifications?',
        'Teacher App needs full screen notifications so alert calls open over other apps and the lock screen with ringtone.\n\nTap Allow, then turn the switch On in the next screen.',
        [
          {
            text: 'Deny',
            style: 'cancel',
            // Why: allow a later resume to ask again if still off
            onPress: () => {
              fullScreenPromptOpenRef.current = false;
            },
          },
          {
            text: 'Allow',
            // Why: OS cannot grant FSI from the app — open Settings where the switch lives
            onPress: () => {
              fullScreenPromptOpenRef.current = false;
              openFullScreenIntentSettings();
            },
          },
        ],
        // Why: back button should not silently dismiss without a choice on Android
        { cancelable: false },
      );
    }

    /** Ask permission, create Android channel, register lock-screen task, save FCM token. */
    async function registerDriverPhoneForAlertCalls() {
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        console.warn('[DriverAlertCall] notification permission not granted:', permission.status);
        return;
      }
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync(DRIVER_ALERT_CALL_CHANNEL_ID, {
            name: 'Driver alert call',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
            bypassDnd: true,
            vibrationPattern: [0, 800, 400, 800, 400, 800],
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            enableVibrate: true,
            audioAttributes: {
              usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
              contentType: Notifications.AndroidAudioContentType.SONIFICATION,
            },
          });
        } catch (channelError) {
          console.warn('[DriverAlertCall] channel setup failed:', channelError);
        }
      }
      try {
        await Notifications.registerTaskAsync(DRIVER_ALERT_CALL_TASK);
      } catch (taskError) {
        console.warn('[DriverAlertCall] registerTaskAsync failed:', taskError);
      }
      // Why: Option 1 — same FCM row; server updates employee_id + phone for this login
      try {
        if (teacherToken) {
          await registerStaffFcmToken(teacherToken);
          console.log('[DriverAlertCall] FCM bound via teacher-app device-token');
        } else {
          const device = await Notifications.getDevicePushTokenAsync();
          const fcmToken = device?.data;
          if (!fcmToken) {
            console.warn('[DriverAlertCall] no FCM token from device; rebuild with google-services.json');
          } else {
            const deviceType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
            const { saveDriverDeviceToken } = await import('../../services/deviceTokenApi');
            await saveDriverDeviceToken(driverToken, String(fcmToken), deviceType);
            console.log('[DriverAlertCall] FCM token saved via driver-app device-token');
          }
        }
      } catch (saveError) {
        console.warn('[DriverAlertCall] device token save failed:', saveError);
      }
      // Why: right after login registration — detect FSI off and ask to turn on
      if (!cancelled) {
        promptFullScreenIntentIfNeeded();
      }
    }

    /** Launch native full-screen Activity + ringtone (no tap). */
    async function ringNativeCall(next) {
      if (!next) return;
      const id = studentStillOnVanCallId(next);
      if (!id) return;
      if (openIdRef.current === id) return;
      if (openIdRef.current) return;
      openIdRef.current = id;
      answeredRef.current = false;
      // Why: native screen owns ringing; React modal waits until Answer
      const opened = await presentIncomingAlertCall(next);
      if (!opened) {
        // Why: Expo Go / missing rebuild — fall back to in-app modal ring
        setCall({ ...next, startAnswered: false });
      }
      Notifications.dismissAllNotificationsAsync().catch(() => undefined);
    }

    function clearStudentStillOnVanCall() {
      openIdRef.current = '';
      answeredRef.current = false;
      dismissIncomingAlertCall();
      Speech.stop();
      setCall(null);
    }

    function payloadFromContent(content) {
      const data = content?.data || {};
      if (data.type !== DRIVER_STUDENT_STILL_ON_VAN_FCM_TYPE) return null;
      return {
        title: data.title || content.title || 'Student still on van',
        titleTamil: data.titleTamil || '',
        body: data.body || data.message || '',
        bodyTamil: data.bodyTamil || '',
        tripId: data.tripId || '',
        studentId: data.studentId || '',
      };
    }

    function openFromNotificationContent(content) {
      const next = payloadFromContent(content);
      if (next) {
        ringNativeCall(next);
      }
    }

    registerDriverPhoneForAlertCalls().catch((error) => {
      console.warn('[DriverAlertCall] register failed:', error);
    });

    // Why: foreground FCM — open native call immediately
    const received = Notifications.addNotificationReceivedListener((event) => {
      openFromNotificationContent(event.request.content);
    });
    // Why: if user taps the backup notification, still open the native Activity
    const opened = Notifications.addNotificationResponseReceivedListener((event) => {
      if (event.actionIdentifier === 'REJECT') {
        clearStudentStillOnVanCall();
        return;
      }
      openFromNotificationContent(event.notification.request.content);
    });

    /** Native Answer → show attended UI + EN/TA TTS in React. */
    function applyAnswered(payload) {
      if (!payload) return;
      answeredRef.current = true;
      openIdRef.current = studentStillOnVanCallId(payload) || openIdRef.current;
      setCall({
        title: payload?.title || 'Student still on van',
        titleTamil: payload?.titleTamil || '',
        body: payload?.body || '',
        bodyTamil: payload?.bodyTamil || '',
        tripId: payload?.tripId || '',
        studentId: payload?.studentId || '',
        startAnswered: true,
      });
    }

    const answeredSub = addIncomingAlertCallListener('incomingAlertCallAnswered', applyAnswered);
    // Why: native Reject → silence and clear
    const rejectedSub = addIncomingAlertCallListener('incomingAlertCallRejected', () => {
      clearStudentStillOnVanCall();
    });

    // Why: Answer while app was killed — consume pending payload when JS wakes
    function consumePendingAnswer() {
      const pending = consumePendingAnsweredAlertCall();
      applyAnswered(pending);
    }
    consumePendingAnswer();
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        consumePendingAnswer();
        // Why: returning from Settings or after turning FSI off — ask again while still off
        promptFullScreenIntentIfNeeded();
      }
    });

    return () => {
      cancelled = true;
      received.remove();
      opened.remove();
      answeredSub.remove();
      rejectedSub.remove();
      appStateSub.remove();
    };
  }, [driverToken, teacherToken, setCall]);

  return (
    <IncomingStudentStillOnVanCall
      call={call}
      onReject={() => {
        openIdRef.current = '';
        answeredRef.current = false;
        dismissIncomingAlertCall();
        Speech.stop();
        setCall(null);
      }}
    />
  );
}
