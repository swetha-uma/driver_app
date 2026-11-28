import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import BottomTabBar from '../../../components/layout/BottomTabBar';
import { registerOwnerFcmToken } from '../push/registerOwnerFcmToken';
import OwnerHomeScreen from '../home/OwnerHomeScreen';
import LeaveLateApprovalScreen from '../leaveLate/LeaveLateApprovalScreen';
import SalaryAdvanceApprovalScreen from '../salaryAdvance/SalaryAdvanceApprovalScreen';
import ScholarshipApprovalScreen from '../scholarship/ScholarshipApprovalScreen';
import OwnerNoticesScreen from '../notices/OwnerNoticesScreen';
import OwnerMoreScreen from '../more/OwnerMoreScreen';
import { colors } from '../../../theme/colors';
import styles from '../../../navigation/MainNavigator.styles';
import { ownerPushTargetFromNotificationContent } from '../push/ownerPushDeepLink';

const OWNER_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'leave', label: 'Leave/Late' },
  { id: 'salary', label: 'Salary' },
  { id: 'scholarship', label: 'Scholarship' },
  { id: 'notice', label: 'Notices' },
  { id: 'more', label: 'More' },
];

/** Owner shell: Leave/Late, Salary & Advance, Scholarship, Notices, More. */
export default function OwnerNavigator({ ownerToken, ownerName, phone, onLogout }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('home');
  const [pushTarget, setPushTarget] = useState(null);
  const handledResponseIds = useRef(new Set());
  const coldStartChecked = useRef(false);

  useEffect(() => {
    registerOwnerFcmToken(ownerToken).catch(() => undefined);
  }, [ownerToken]);

  useEffect(() => {
    const handleResponse = (response) => {
      const notification = response?.notification;
      const key = String(notification?.request?.identifier || `${notification?.date || ''}:${JSON.stringify(notification?.request?.content?.data || {})}`);
      if (handledResponseIds.current.has(key)) return;
      handledResponseIds.current.add(key);

      const target = ownerPushTargetFromNotificationContent(notification?.request?.content);
      if (!target) return;
      setPushTarget(target);
      setTab(target.tab);
      if (typeof Notifications.clearLastNotificationResponseAsync === 'function') {
        Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    if (!coldStartChecked.current) {
      coldStartChecked.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => { if (response) handleResponse(response); })
        .catch(() => undefined);
    }
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.fill}>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.canvas} />
      <View style={[styles.column, { paddingTop: insets.top }]}>
        <View style={styles.body}>
          {tab === 'home' ? (
            <OwnerHomeScreen ownerToken={ownerToken} ownerName={ownerName} onNavigateTab={setTab} />
          ) : null}
          {tab === 'leave' ? (
            <LeaveLateApprovalScreen ownerToken={ownerToken} ownerName={ownerName} pushTarget={pushTarget} onPushTargetHandled={() => setPushTarget(null)} />
          ) : null}
          {tab === 'salary' ? (
            <SalaryAdvanceApprovalScreen ownerToken={ownerToken} ownerName={ownerName} pushTarget={pushTarget} onPushTargetHandled={() => setPushTarget(null)} />
          ) : null}
          {tab === 'scholarship' ? (
            <ScholarshipApprovalScreen ownerToken={ownerToken} ownerName={ownerName} pushTarget={pushTarget} onPushTargetHandled={() => setPushTarget(null)} />
          ) : null}
          {tab === 'notice' ? (
            <OwnerNoticesScreen ownerToken={ownerToken} ownerName={ownerName} />
          ) : null}
          {tab === 'more' ? (
            <OwnerMoreScreen ownerToken={ownerToken} ownerName={ownerName} phone={phone} onLogout={onLogout} />
          ) : null}
        </View>
        <BottomTabBar
          tabs={OWNER_TABS}
          activeTab={tab}
          onChange={setTab}
          bottomInset={insets.bottom}
          tabsLocked={false}
        />
      </View>
    </View>
  );
}
