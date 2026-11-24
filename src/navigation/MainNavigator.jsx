import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomTabBar from '../components/layout/BottomTabBar';
import { MAIN_TABS } from '../constants/navigation';
import StudentStillOnVanCallListener from '../features/alertcall/StudentStillOnVanCallListener';
import HomeScreen from '../features/home/HomeScreen';
import TripHistoryScreen from '../features/history/TripHistoryScreen';
import TripScheduleScreen from '../features/schedule/TripScheduleScreen';
import MoreScreen from '../features/more/overview/MoreScreen';
import TeacherPushRegistrar from '../features/teacherapp/push/TeacherPushRegistrar';
import { colors } from '../theme/colors';
import styles from './MainNavigator.styles';

/**
 * Logged-in shell: Home, Schedule, History, Profile tabs.
 * Schedule and History stay open without gateway proximity.
 */
export default function MainNavigator({ phone, verifiedPage, onLogout, onSwitchToLeave }) { // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('home');
  // Why: home / schedule / history / profile APIs need the Redis session token
  const driverToken = verifiedPage?.token;
  // Why: Home greeting can use the name returned at verify-otp
  const driverName = verifiedPage?.driverName;

  /** Profile shortcut from Home greeting — always allowed. */
  const handleOpenProfile = useCallback(() => {
    setActiveTab('profile');
  }, []);

  return (
    <View style={styles.fill}>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.canvas} />
      <View style={[styles.column, { paddingTop: insets.top }]}>
        <View style={styles.body}>
          <View
            style={activeTab === 'home' ? styles.fill : styles.screenHidden}
            pointerEvents={activeTab === 'home' ? 'auto' : 'none'}
          >
            <HomeScreen
              driverToken={driverToken}
              driverName={driverName}
              designation={verifiedPage?.designation}
              onOpenProfile={handleOpenProfile}
              canLeave={Boolean(verifiedPage?.canLeave)}
              onSwitchToLeave={onSwitchToLeave}
            />
          </View>
          {activeTab === 'schedule' ? (
            <TripScheduleScreen driverToken={driverToken} />
          ) : null}
          {activeTab === 'history' ? (
            <TripHistoryScreen driverToken={driverToken} />
          ) : null}
          {activeTab === 'profile' ? (
            <MoreScreen
              driverToken={driverToken}
              canLeave={Boolean(verifiedPage?.canLeave)}
              onSwitchToLeave={onSwitchToLeave}
              onLogout={onLogout}
            />
          ) : null}
        </View>
        <BottomTabBar
          tabs={MAIN_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          bottomInset={insets.bottom}
          tabsLocked={false}
        />
      </View>
      {/* Why: alert-call channel/FSI + shared FCM save via teacher-app device-token */}
      <StudentStillOnVanCallListener
        driverToken={driverToken}
        teacherToken={verifiedPage?.teacherToken}
      />
      {/* Why: Leave/Notice FCM also registers in Trip shell (same teacher_app_device row) */}
      <TeacherPushRegistrar teacherToken={verifiedPage?.teacherToken} />
    </View>
  );
}
