import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import BottomTabBar from '../../../components/layout/BottomTabBar';
import TeacherAttendanceScreen from '../attendance/TeacherAttendanceScreen';
import TeacherHomeScreen from '../home/TeacherHomeScreen';
import LateReasonScreen from '../lateReason/LateReasonScreen';
import LeaveDetailScreen from '../leaveDetail/LeaveDetailScreen';
import TeacherMoreScreen from '../more/TeacherMoreScreen';
import MyLeavesScreen from '../myLeaves/MyLeavesScreen';
import { fetchTeacherPendingNotificationAcks } from '../api/teacherApi';
import TeacherNotificationAckDialog from '../push/TeacherNotificationAckDialog';
import TeacherPushRegistrar from '../push/TeacherPushRegistrar';
import {
  teacherAckTargetFromPendingRow,
  teacherPushTargetFromNotificationContent,
} from '../push/teacherPushDeepLink';
import RequestLeaveScreen from '../requestLeave/RequestLeaveScreen';
import { colors } from '../../../theme/colors';
import styles from '../../../navigation/MainNavigator.styles';

const LEAVE_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'apply', label: 'Leave' },
  { id: 'notice', label: 'Notice' },
  { id: 'more', label: 'More' },
];

/** Leave-mode shell: Home / Attendance / Leave / Notice / More. */
export default function TeacherLeaveNavigator({ // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  teacherToken,
  staffName,
  designation,
  phone,
  canTrip,
  onSwitchToTrip,
  onLogout,
  deepLinkTarget,
  onDeepLinkConsumed,
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState('main');
  const [leaveId, setLeaveId] = useState(null);
  const [lateAttendanceDate, setLateAttendanceDate] = useState(null);
  // Why: action-required pushes show Mark as read / Remind me later first
  const [ackNotification, setAckNotification] = useState(null);
  // Why: drives the Notice bell shake + red dot until the teacher opens it
  const [hasUnreadNotice, setHasUnreadNotice] = useState(false);
  // Why: session memory — after Mark as read, never reopen that popup (any type)
  const dismissedAckIdsRef = useRef(new Set());

  const isDismissedAck = useCallback((notificationId) => {
    if (notificationId == null) return false;
    return dismissedAckIdsRef.current.has(String(notificationId));
  }, []);

  const rememberDismissedAck = useCallback((notificationId) => {
    if (notificationId == null) return;
    dismissedAckIdsRef.current.add(String(notificationId));
  }, []);

  // Why: Mark as read → status READ; never reopen that popup from stale FCM / tray tap
  const showAckIfStillPending = useCallback(
    async (candidate) => {
      if (!teacherToken || !candidate?.actionRequired || !candidate.notificationId) {
        return;
      }
      if (isDismissedAck(candidate.notificationId)) {
        return;
      }
      try {
        const rows = await fetchTeacherPendingNotificationAcks(teacherToken);
        const openRows = (Array.isArray(rows) ? rows : []).filter(
          (row) => !isDismissedAck(row.notificationId),
        );
        setHasUnreadNotice(openRows.length > 0);
        const stillPending = openRows.some(
          (row) => String(row.notificationId) === String(candidate.notificationId),
        );
        if (!stillPending) return;
        setAckNotification((prev) => prev ?? candidate);
      } catch {
        // Why: offline — do not force a dialog that may already be marked read
      }
    },
    [teacherToken, isDismissedAck],
  );

  // Why: FCM tap — dialog when actionRequired; otherwise open Late/Notice
  useEffect(() => {
    if (!deepLinkTarget) return;
    const target =
      typeof deepLinkTarget === 'string'
        ? { screen: deepLinkTarget, actionRequired: false }
        : deepLinkTarget;

    if (target.actionRequired && target.notificationId) {
      // Why: reject/cancel/late-pending need explicit ack or snooze (skip if already READ)
      void showAckIfStillPending(target);
      onDeepLinkConsumed?.();
      return;
    }

    if (target.screen === 'lateReason') {
      setLateAttendanceDate(null);
      setStack('lateReason');
    } else if (target.screen === 'notice') {
      setTab('notice');
      setStack('main');
    }
    onDeepLinkConsumed?.();
  }, [deepLinkTarget, onDeepLinkConsumed, showAckIfStillPending]);

  // Why: mount + resume — show first pending ack if none open
  const loadPendingAck = useCallback(async () => {
    if (!teacherToken) return;
    try {
      const rows = await fetchTeacherPendingNotificationAcks(teacherToken);
      const openRows = (Array.isArray(rows) ? rows : []).filter(
        (row) => !isDismissedAck(row.notificationId),
      );
      setHasUnreadNotice(openRows.length > 0);
      if (openRows.length === 0) return;
      const target = teacherAckTargetFromPendingRow(openRows[0]);
      if (!target) return;
      // Why: do not replace a dialog already on screen
      setAckNotification((prev) => prev ?? target);
    } catch {
      // Why: offline / soft fail — home banner still covers late reason
    }
  }, [teacherToken, isDismissedAck]);

  // Why: after Mark as read / Remind me later — open the next pending push immediately
  const openNextPendingAck = useCallback(
    async (result) => {
      if (result?.markedRead && result.notificationId != null) {
        rememberDismissedAck(result.notificationId);
      }
      setAckNotification(null);
      if (!teacherToken) return;
      try {
        const rows = await fetchTeacherPendingNotificationAcks(teacherToken);
        const openRows = (Array.isArray(rows) ? rows : []).filter(
          (row) => !isDismissedAck(row.notificationId) && String(row.notificationId) !== String(result?.notificationId ?? ''),
        );
        setHasUnreadNotice(openRows.length > 0);
        if (openRows.length === 0) return;
        const target = teacherAckTargetFromPendingRow(openRows[0]);
        if (target) setAckNotification(target);
      } catch {
        // Why: soft fail — user can reopen app later for remaining acks
      }
    },
    [teacherToken, isDismissedAck, rememberDismissedAck],
  );

  useEffect(() => {
    if (!teacherToken) return undefined;
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadPendingAck();
    })();

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') loadPendingAck();
    });
    // Why: reminder FCM while app is open — only if still PENDING on server
    const pushSub = Notifications.addNotificationReceivedListener((event) => {
      const target = teacherPushTargetFromNotificationContent(
        event?.request?.content,
      );
      if (target?.actionRequired && target.notificationId) {
        void showAckIfStillPending(target);
      }
    });

    return () => {
      cancelled = true;
      appSub.remove();
      pushSub.remove();
    };
  }, [teacherToken, loadPendingAck, showAckIfStillPending]);

  // Why: Android system Back must leave Late/Detail stack on first press
  useEffect(() => {
    if (stack !== 'lateReason' && stack !== 'leaveDetail') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setStack('main');
      return true;
    });
    return () => sub.remove();
  }, [stack]);

  const navigation = {
    navigate: (name, params) => {
      if (name === 'RequestLeave') {
        setTab('apply');
        setStack('main');
      } else if (name === 'MyLeaves') {
        setTab('notice');
        setStack('main');
      } else if (name === 'MyAttendance') {
        setTab('attendance');
        setStack('main');
      } else if (name === 'LateReason') {
        setLateAttendanceDate(params?.attendanceDate || null);
        setStack('lateReason');
      } else if (name === 'LeaveDetail') {
        setLeaveId(params?.id);
        setStack('leaveDetail');
      }
    },
    goBack: () => {
      setLateAttendanceDate(null);
      setStack('main');
    },
  };

  // Why: stays on every tab until Mark as read / Remind me later; Late stack can open under it
  const ackVisible = Boolean(ackNotification) && stack === 'main';

  return (
    <View style={styles.fill}>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.canvas} />
      {/* Why: Notice late/leave pushes need teacher_app_device FCM token */}
      <TeacherPushRegistrar teacherToken={teacherToken} />
      <View style={[styles.column, { paddingTop: insets.top }]}>
        <View style={styles.body}>
          {stack === 'lateReason' ? (
            <LateReasonScreen
              teacherToken={teacherToken}
              staffName={staffName}
              designation={designation}
              attendanceDate={lateAttendanceDate}
              navigation={navigation}
              onBack={() => {
                setLateAttendanceDate(null);
                setStack('main');
              }}
              onSubmitted={() => {
                void openNextPendingAck({ markedRead: false });
              }}
            />
          ) : null}
          {stack === 'leaveDetail' ? (
            <LeaveDetailScreen
              teacherToken={teacherToken}
              staffName={staffName}
              designation={designation}
              route={{ params: { id: leaveId } }}
              onBack={() => setStack('main')}
            />
          ) : null}
          {stack === 'main' && tab === 'home' ? (
            <TeacherHomeScreen
              teacherToken={teacherToken}
              canTrip={canTrip}
              onSwitchToTrip={onSwitchToTrip}
              onOpenMore={() => setTab('more')}
              navigation={navigation}
            />
          ) : null}
          {stack === 'main' && tab === 'attendance' ? (
            <TeacherAttendanceScreen
              teacherToken={teacherToken}
              staffName={staffName}
              designation={designation}
            />
          ) : null}
          {stack === 'main' && tab === 'apply' ? (
            <RequestLeaveScreen teacherToken={teacherToken} navigation={navigation} />
          ) : null}
          {stack === 'main' && tab === 'notice' ? (
            <MyLeavesScreen
              teacherToken={teacherToken}
              staffName={staffName}
              designation={designation}
              navigation={navigation}
            />
          ) : null}
          {stack === 'main' && tab === 'more' ? (
            <TeacherMoreScreen
              staffName={staffName}
              designation={designation}
              phone={phone}
              canTrip={canTrip}
              onSwitchToTrip={onSwitchToTrip}
              onLogout={onLogout}
            />
          ) : null}
        </View>
        {stack === 'main' ? (
          <BottomTabBar
            tabs={LEAVE_TABS}
            activeTab={tab}
            onChange={setTab}
            bottomInset={insets.bottom}
            tabsLocked={false}
            unreadTabs={{ notice: hasUnreadNotice }}
          />
        ) : null}
      </View>
      {/* Why: Mark as read / Remind me later for reject, cancel, late-pending */}
      <TeacherNotificationAckDialog
        visible={ackVisible}
        teacherToken={teacherToken}
        notification={ackNotification}
        onDone={(result) => {
          void openNextPendingAck(result);
        }}
      />
    </View>
  );
}
