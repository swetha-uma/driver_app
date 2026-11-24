import { useCallback, useEffect, useState } from 'react';
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
  // Why: action-required pushes show Mark as read / Remind me later first
  const [ackNotification, setAckNotification] = useState(null);

  // Why: FCM tap — dialog when actionRequired; otherwise open Late/Notice
  useEffect(() => {
    if (!deepLinkTarget) return;
    const target =
      typeof deepLinkTarget === 'string'
        ? { screen: deepLinkTarget, actionRequired: false }
        : deepLinkTarget;

    if (target.actionRequired && target.notificationId) {
      // Why: reject/cancel/late-pending need explicit ack or snooze
      setAckNotification(target);
      onDeepLinkConsumed?.();
      return;
    }

    if (target.screen === 'lateReason') {
      setStack('lateReason');
    } else if (target.screen === 'notice') {
      setTab('notice');
      setStack('main');
    }
    onDeepLinkConsumed?.();
  }, [deepLinkTarget, onDeepLinkConsumed]);

  // Why: mount + resume — show first pending ack if none open
  const loadPendingAck = useCallback(async () => {
    if (!teacherToken) return;
    try {
      const rows = await fetchTeacherPendingNotificationAcks(teacherToken);
      if (!Array.isArray(rows) || rows.length === 0) return;
      const target = teacherAckTargetFromPendingRow(rows[0]);
      if (!target) return;
      // Why: do not replace a dialog already on screen
      setAckNotification((prev) => prev ?? target);
    } catch {
      // Why: offline / soft fail — home banner still covers late reason
    }
  }, [teacherToken]);

  // Why: after Mark as read / Remind me later — open the next pending push immediately
  const openNextPendingAck = useCallback(async () => {
    setAckNotification(null);
    if (!teacherToken) return;
    try {
      const rows = await fetchTeacherPendingNotificationAcks(teacherToken);
      if (!Array.isArray(rows) || rows.length === 0) return;
      const target = teacherAckTargetFromPendingRow(rows[0]);
      if (target) setAckNotification(target);
    } catch {
      // Why: soft fail — user can reopen app later for remaining acks
    }
  }, [teacherToken]);

  useEffect(() => {
    if (!teacherToken) return undefined;
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadPendingAck();
    })();

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') loadPendingAck();
    });
    // Why: reminder FCM while app is open — queue behind current dialog
    const pushSub = Notifications.addNotificationReceivedListener((event) => {
      const target = teacherPushTargetFromNotificationContent(
        event?.request?.content,
      );
      if (target?.actionRequired && target.notificationId) {
        setAckNotification((prev) => prev ?? target);
      }
    });

    return () => {
      cancelled = true;
      appSub.remove();
      pushSub.remove();
    };
  }, [teacherToken, loadPendingAck]);

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
      } else if (name === 'LateReason') setStack('lateReason');
      else if (name === 'LeaveDetail') {
        setLeaveId(params?.id);
        setStack('leaveDetail');
      }
    },
    goBack: () => setStack('main'),
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
              navigation={navigation}
              onBack={() => setStack('main')}
              onSubmitted={() => {
                void openNextPendingAck();
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
          />
        ) : null}
      </View>
      {/* Why: Mark as read / Remind me later for reject, cancel, late-pending */}
      <TeacherNotificationAckDialog
        visible={ackVisible}
        teacherToken={teacherToken}
        notification={ackNotification}
        onDone={() => {
          void openNextPendingAck();
        }}
      />
    </View>
  );
}
