import { useCallback, useEffect, useState } from 'react';
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
import { colors } from '../theme/colors';
import styles from './MainNavigator.styles';

/**
 * Logged-in shell: Home, Schedule, History, Profile tabs.
 * Why: Schedule/History need nearVan; Profile stays open even out of gateway range.
 */
export default function MainNavigator({ phone, verifiedPage, onLogout }) {
  const insets = useSafeAreaInsets();
  // Why: app always starts on Home so the van gate can show first
  const [activeTab, setActiveTab] = useState('home');
  // Why: Schedule / History stay locked until Home reports nearVan from /ble_capture
  const [nearVan, setNearVan] = useState(false);
  // Why: home / schedule / history / profile APIs need the Redis session token
  const driverToken = verifiedPage?.token;
  // Why: Home greeting can use the name returned at verify-otp
  const driverName = verifiedPage?.driverName;

  /** Home polls proximity and pushes the unlock flag here. */
  const handleNearVanChange = useCallback((unlocked) => {
    // Why: coerce to boolean so undefined never leaves tabs half-open
    setNearVan(Boolean(unlocked));
  }, []);

  useEffect(() => {
    // Why: walking away from the van must leave Schedule/History — but Profile may stay open
    if (!nearVan && activeTab !== 'home' && activeTab !== 'profile') {
      setActiveTab('home');
    }
  }, [nearVan, activeTab]);

  /**
   * Schedule / History need the van; Profile is always allowed (out of range OK).
   */
  const handleTabChange = useCallback((tabId) => {
    // Why: Profile must work before the driver reaches the van
    if (tabId === 'profile' || tabId === 'home') {
      setActiveTab(tabId);
      return;
    }
    // Why: Schedule / History stay blocked until nearVan
    if (!nearVan) {
      return;
    }
    setActiveTab(tabId);
  }, [nearVan]);

  /** Profile shortcut from Home greeting — always allowed. */
  const handleOpenProfile = useCallback(() => {
    // Why: driver can open My Profile even when the van gate is locked
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
              onOpenProfile={handleOpenProfile}
              onNearVanChange={handleNearVanChange}
            />
          </View>
          {/* Why: Schedule only after gateway unlock */}
          {nearVan && activeTab === 'schedule' ? (
            <TripScheduleScreen driverToken={driverToken} />
          ) : null}
          {/* Why: History only after gateway unlock */}
          {nearVan && activeTab === 'history' ? (
            <TripHistoryScreen driverToken={driverToken} />
          ) : null}
          {/* Why: Profile mounts even when out of gateway range */}
          {activeTab === 'profile' ? (
            <MoreScreen driverToken={driverToken} onLogout={onLogout} />
          ) : null}
        </View>
        <BottomTabBar
          tabs={MAIN_TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
          bottomInset={insets.bottom}
          // Why: grey out Schedule/History only — Profile stays tappable
          tabsLocked={!nearVan}
        />
      </View>
      {/* Why: FCM register + native Answer/Reject overlay for student-still-on-van alerts */}
      <StudentStillOnVanCallListener driverToken={driverToken} />
    </View>
  );
}
