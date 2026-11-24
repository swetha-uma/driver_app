import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  clearDriverSession,
  loadDriverSession,
  saveDriverSession,
} from '../features/auth/sessionStorage';
import { loadApiBase } from '../features/settings/backendUrl';
import {
  getDriverGatewayDeviceSetupStatus,
  requestDriverBackgroundSetupStep,
  requestDriverBluetoothSetupStep,
  requestDriverLocationSetupStep,
  runDriverNativePermissionSetupSequence,
} from '../features/settings/frontend/services/driverGatewayDeviceSetup';
import {
  clearDriverDeviceSetupComplete,
  markDriverDeviceSetupComplete,
} from '../features/settings/frontend/storage/driverDeviceSetupStorage';
import { stopDriverVanGpsPublishing } from '../features/settings/frontend/services/driverVanLocationPublisher';
import { stopBlePhoneScan } from '../features/settings/frontend/services/blePhoneScannerService';
import TeacherLeaveNavigator from '../features/teacherapp/navigation/TeacherLeaveNavigator';
import {
  clearTeacherSession,
  loadTeacherSession,
  saveTeacherSession,
} from '../features/teacherapp/session/teacherSessionStorage';
import {
  clearTeacherDeviceToken,
  logoutTeacher,
  saveTeacherMode,
} from '../features/teacherapp/api/teacherApi';
import {
  consumePendingTeacherPushDeepLink,
  setPendingTeacherPushDeepLink,
  teacherPushTargetFromNotificationContent,
} from '../features/teacherapp/push/teacherPushDeepLink';
import { registerStaffFcmToken } from '../features/teacherapp/push/registerStaffFcmToken';
import { logoutDriver } from '../services/loginApi';
import { colors } from '../theme/colors';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

/** True in Expo Go — native BLE / gateway setup is unavailable and hangs. */
function isExpoGoRuntime() { // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Constants = require('expo-constants').default;
    return Constants?.appOwnership === 'expo';
  } catch {
    return false;
  }
}

/** Run Location → Bluetooth → background on every login / Trip open (real APK only). */
async function askNativeGatewayPermissionsBeforeHome() {
  // Why: Expo Go has no native BLE modules — never await them
  if (isExpoGoRuntime()) {
    await markDriverDeviceSetupComplete().catch(() => undefined);
    return;
  }
  try {
    // Why: every login and Trip open must ask again — do not skip after the first Allow
    await runDriverNativePermissionSetupSequence();
  } catch {
    // Why: deny/fail must not trap the driver
  } finally {
    await markDriverDeviceSetupComplete().catch(() => undefined);
  }
}

function PermissionAskGate({ message }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.canvas,
        paddingHorizontal: 28,
        gap: 14,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
        {message}
      </Text>
    </View>
  );
}

/** Pick shell: drivers default Trip; others Leave. Respect saved preferredMode. */
function resolveShell(page) {
  if (!page) return 'auth';
  if (page.preferredMode === 'TRIP' && page.canTrip) return 'trip';
  if (page.preferredMode === 'LEAVE' && page.canLeave) return 'leave';
  if (page.canTrip) return 'trip';
  if (page.canLeave) return 'leave';
  return 'leave';
}

/** Login → Trip for drivers (default), Leave otherwise. Switch from Home either way. */
export default function AppNavigator() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPermissionGateDone, setIsPermissionGateDone] = useState(false);
  const [phone, setPhone] = useState('');
  const [verifiedPage, setVerifiedPage] = useState(null);
  const [shell, setShell] = useState('auth');
  // Why: FCM tap target for Leave shell (lateReason | notice)
  const [leaveDeepLink, setLeaveDeepLink] = useState(null);
  // Why: avoid re-opening the same notification after Back (getLastNotificationResponseAsync)
  const handledPushResponseIdsRef = useRef(new Set());
  const coldStartPushCheckedRef = useRef(false);

  const openLeaveFromPush = useCallback(async (target) => {
    if (!target) return;
    // Why: tap before session ready — open after login/bootstrap
    if (!verifiedPage) {
      setPendingTeacherPushDeepLink(target);
      return;
    }
    // Why: do not re-queue pending here — that re-applied deep link after Back
    try {
      if (verifiedPage?.teacherToken) await saveTeacherMode(verifiedPage.teacherToken, 'LEAVE');
    } catch {
      // Why: still open Leave shell when mode API is down
    }
    const next = { ...verifiedPage, preferredMode: 'LEAVE', askMode: false };
    setVerifiedPage(next);
    await saveDriverSession(phone || next.phone || '', next).catch(() => undefined);
    if (next.teacherToken) {
      await saveTeacherSession({
        teacherToken: next.teacherToken,
        canTrip: next.canTrip,
        canLeave: next.canLeave,
        preferredMode: 'LEAVE',
        staffName: next.driverName,
        designation: next.designation,
      }).catch(() => undefined);
    }
    setLeaveDeepLink(target);
    setShell('leave');
  }, [verifiedPage, phone]);

  useEffect(() => {
    function responseKey(response) {
      const id = response?.notification?.request?.identifier;
      if (id) return String(id);
      const type = response?.notification?.request?.content?.data?.type;
      const date = response?.notification?.date;
      return `${type || ''}:${date || ''}`;
    }

    function handleResponse(response) {
      const key = responseKey(response);
      if (key && handledPushResponseIdsRef.current.has(key)) return;
      if (key) handledPushResponseIdsRef.current.add(key);
      const target = teacherPushTargetFromNotificationContent(
        response?.notification?.request?.content,
      );
      if (!target) return;
      openLeaveFromPush(target).catch(() => undefined);
      // Why: clear sticky last-response so Back is not undone by effect re-runs
      if (typeof Notifications.clearLastNotificationResponseAsync === 'function') {
        Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      }
    }

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    // Why: cold start from killed state — check once, not on every openLeaveFromPush identity change
    if (!coldStartPushCheckedRef.current) {
      coldStartPushCheckedRef.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) handleResponse(response);
        })
        .catch(() => undefined);
    }

    return () => sub.remove();
  }, [openLeaveFromPush]);

  // Why: apply queued push deep link once after login (not after every verifiedPage tweak)
  useEffect(() => {
    if (!isAuthenticated || !verifiedPage) return;
    const queued = consumePendingTeacherPushDeepLink();
    if (!queued) return;
    setLeaveDeepLink(queued);
    if (shell !== 'leave') {
      openLeaveFromPush(queued).catch(() => undefined);
    }
  }, [isAuthenticated, verifiedPage, shell, openLeaveFromPush]);

  useEffect(() => {
    // Why: Expo Go — skip radio re-ask loop that hangs native BLE status
    if (isExpoGoRuntime()) return undefined;
    if (!isAuthenticated || !isPermissionGateDone || shell !== 'trip') return undefined;
    let asking = false;
    let waitingForDriver = false;

    async function askAgainIfRadiosOff() {
      if (asking || waitingForDriver) return;
      try {
        const status = await getDriverGatewayDeviceSetupStatus();
        if (status.locationReady && status.bluetoothReady && status.backgroundReady) {
          waitingForDriver = false;
          return;
        }
        asking = true;
        waitingForDriver = true;
        if (!status.locationReady) await requestDriverLocationSetupStep();
        const afterLocation = await getDriverGatewayDeviceSetupStatus();
        if (!afterLocation.bluetoothReady) await requestDriverBluetoothSetupStep();
        // Why: re-ask battery / background when Gateway needs lock-screen GPS + BLE
        const afterBt = await getDriverGatewayDeviceSetupStatus();
        if (!afterBt.backgroundReady) await requestDriverBackgroundSetupStep();
      } catch {
        // Why: dismissed dialog must not block Home
      } finally {
        asking = false;
      }
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        waitingForDriver = false;
        askAgainIfRadiosOff();
      }
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') askAgainIfRadiosOff();
    }, 5000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [isAuthenticated, isPermissionGateDone, shell]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadApiBase();
      const saved = await loadDriverSession();
      const teacherSaved = await loadTeacherSession();
      if (!saved) {
        if (!cancelled) setBootstrapping(false);
        return;
      }
      if (cancelled) return;
      const page = {
        ...saved.verifiedPage,
        teacherToken: saved.verifiedPage?.teacherToken || teacherSaved?.teacherToken,
        canTrip: saved.verifiedPage?.canTrip ?? teacherSaved?.canTrip,
        canLeave: saved.verifiedPage?.canLeave ?? teacherSaved?.canLeave ?? true,
        askMode: false,
        preferredMode: saved.verifiedPage?.preferredMode
          || teacherSaved?.preferredMode
          || ((saved.verifiedPage?.canTrip ?? teacherSaved?.canTrip) ? 'TRIP' : 'LEAVE'),
      };
      setPhone(saved.phone);
      setVerifiedPage(page);
      setShell(resolveShell(page));
      setIsAuthenticated(true);
      setBootstrapping(false);
      // Why: open UI first — never await BLE before Trip Home in Expo
      setIsPermissionGateDone(true);
      // Why: Option 1 — re-bind this phone FCM to the restored staff (updates employee_id + phone)
      if (page.teacherToken) {
        registerStaffFcmToken(page.teacherToken).catch(() => undefined);
      }
      if (page.canTrip && resolveShell(page) === 'trip') {
        askNativeGatewayPermissionsBeforeHome().catch(() => undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persistPage(page) {
    setVerifiedPage(page);
    await saveDriverSession(phone, page).catch(() => undefined);
    if (page?.teacherToken) {
      await saveTeacherSession({
        teacherToken: page.teacherToken,
        canTrip: page.canTrip,
        canLeave: page.canLeave,
        preferredMode: page.preferredMode,
        staffName: page.driverName,
        designation: page.designation,
      }).catch(() => undefined);
    }
  }

  async function handleLogout() {
    const driverToken = verifiedPage?.token;
    const teacherToken = verifiedPage?.teacherToken;
    // Why: Option 1 — soft-delete this phone row so previous staff stops getting pushes;
    // fcm_token stays on the row for the next login to reuse and update employee_id + phone
    try {
      if (teacherToken) {
        let fcmToken = null;
        try {
          const device = await Notifications.getDevicePushTokenAsync();
          fcmToken = device?.data ? String(device.data) : null;
        } catch {
          // Why: still clear by employee if token read fails
        }
        await clearTeacherDeviceToken(teacherToken, fcmToken);
      }
    } catch {
      // Why: still continue logout if clear API fails
    }
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch {
      // Why: tray clear is best-effort
    }
    try {
      if (verifiedPage?.canTrip) await logoutDriver(driverToken);
    } catch {
      // Why: still leave the app if network fails
    }
    try {
      await logoutTeacher(teacherToken);
    } catch {
      // Why: still clear local session
    }
    stopBlePhoneScan();
    stopDriverVanGpsPublishing();
    await clearDriverDeviceSetupComplete();
    await clearDriverSession().catch(() => undefined);
    await clearTeacherSession().catch(() => undefined);
    setPhone('');
    setVerifiedPage(null);
    setIsPermissionGateDone(false);
    setShell('auth');
    setIsAuthenticated(false);
  }

  if (bootstrapping) {
    return <PermissionAskGate message="Starting…" />;
  }

  // Why: Trip must never stay on the BLE spinner — gate unlocks before Trip shell
  if (isAuthenticated && shell === 'leave') {
    return (
      <TeacherLeaveNavigator
        teacherToken={verifiedPage?.teacherToken}
        staffName={verifiedPage?.driverName}
        designation={verifiedPage?.designation}
        phone={phone || verifiedPage?.phone}
        canTrip={
          Boolean(verifiedPage?.canTrip)
          || String(verifiedPage?.designation || '').toLowerCase().includes('driver')
        }
        deepLinkTarget={leaveDeepLink}
        onDeepLinkConsumed={() => setLeaveDeepLink(null)}
        onSwitchToTrip={async () => {
          try {
            if (verifiedPage?.teacherToken) await saveTeacherMode(verifiedPage.teacherToken, 'TRIP');
          } catch {
            // Why: still switch locally when API is down
          }
          const next = {
            ...verifiedPage,
            canTrip: true,
            preferredMode: 'TRIP',
            askMode: false,
          };
          await persistPage(next);
          // Why: Expo Go has no BLE — do not block Trip behind permission gate
          setIsPermissionGateDone(true);
          setShell('trip');
          askNativeGatewayPermissionsBeforeHome().catch(() => undefined);
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (isAuthenticated && shell === 'trip') {
    return (
      <MainNavigator
        phone={phone}
        verifiedPage={verifiedPage}
        onSwitchToLeave={async () => {
          try {
            if (verifiedPage?.teacherToken) await saveTeacherMode(verifiedPage.teacherToken, 'LEAVE');
          } catch {
            // Why: still switch locally
          }
          const next = { ...verifiedPage, preferredMode: 'LEAVE', askMode: false };
          await persistPage(next);
          setShell('leave');
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <AuthNavigator
      onAuthenticated={(number, page) => {
        const next = {
          ...page,
          canTrip: Boolean(page.canTrip),
          canLeave: page.canLeave !== false,
          askMode: false,
          // Why: drivers open Trip first; Leave via Home Switch (and back again)
          preferredMode: Boolean(page.canTrip)
            ? (page.preferredMode === 'LEAVE' ? 'LEAVE' : 'TRIP')
            : 'LEAVE',
          teacherToken: page.teacherToken || null,
        };
        saveDriverSession(number, next).catch(() => undefined);
        if (next.teacherToken) {
          saveTeacherSession({
            teacherToken: next.teacherToken,
            canTrip: next.canTrip,
            canLeave: next.canLeave,
            preferredMode: next.preferredMode,
            staffName: next.driverName,
            designation: next.designation,
          }).catch(() => undefined);
        }
        setPhone(number);
        setVerifiedPage(next);
        const nextShell = resolveShell(next);
        // Why: unlock immediately so Expo never shows the BLE waiting screen
        setIsPermissionGateDone(true);
        setShell(nextShell);
        setIsAuthenticated(true);
        // Why: Option 1 — bind FCM immediately; server reuses row and sets this login's employee_id + phone
        if (next.teacherToken) {
          registerStaffFcmToken(next.teacherToken).catch(() => undefined);
        }
        if (nextShell === 'trip') {
          askNativeGatewayPermissionsBeforeHome().catch(() => undefined);
        }
      }}
    />
  );
}
