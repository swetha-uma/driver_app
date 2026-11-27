import { useEffect, useState } from 'react';
import { View } from 'react-native';
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

  useEffect(() => {
    registerOwnerFcmToken(ownerToken).catch(() => undefined);
  }, [ownerToken]);

  return (
    <View style={styles.fill}>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.canvas} />
      <View style={[styles.column, { paddingTop: insets.top }]}>
        <View style={styles.body}>
          {tab === 'home' ? (
            <OwnerHomeScreen ownerToken={ownerToken} ownerName={ownerName} />
          ) : null}
          {tab === 'leave' ? (
            <LeaveLateApprovalScreen ownerToken={ownerToken} ownerName={ownerName} />
          ) : null}
          {tab === 'salary' ? (
            <SalaryAdvanceApprovalScreen ownerToken={ownerToken} ownerName={ownerName} />
          ) : null}
          {tab === 'scholarship' ? (
            <ScholarshipApprovalScreen ownerToken={ownerToken} ownerName={ownerName} />
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
