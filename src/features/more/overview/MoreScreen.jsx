import { Animated, ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../../components/common/AppText';
import {
  buildDriverDetailRowsFromProfile,
  loadDriverProfile,
} from '../../../services/profileApi';
import { colors } from '../../../theme/colors';
import BlePhoneGatewayHubScreen from '../../settings/frontend/screens/BlePhoneGatewayHubScreen';
import ServerSettingsScreen from '../../settings/ServerSettingsScreen';
import DriverDetailsScreen from '../driverDetails/DriverDetailsScreen';
import styles from './MoreScreen.styles';

// Why: menu labels stay local — they are not staff HR fields
const PROFILE_MENU_ITEMS = [
  { id: 'details', label: 'Driver details', icon: 'person', tone: 'purple' },
  // Why: open BLE Gateway/Reader settings hub so this phone can replace the external van gateway
  { id: 'bleGateway', label: 'BLE Gateway', icon: 'bluetooth', tone: 'slate' },
  { id: 'server', label: 'Server', icon: 'settings', tone: 'slate' },
  { id: 'logout', label: 'Log out', icon: 'log-out', tone: 'error' },
];

const ICONS = {
  person: 'person',
  // Why: BLE menu row uses the bluetooth icon from Ionicons
  bluetooth: 'bluetooth',
  settings: 'settings',
  'log-out': 'log-out',
};

const ICON_COLORS = {
  purple: '#6B4BB6',
  slate: '#4B648F',
  error: colors.error,
};

function getInitial(name) {
  // Why: avatar letter falls back to D when the name is missing
  return (name || 'D').trim().charAt(0).toUpperCase();
}

/** More header with driver summary from the staff-backed profile API. */
function MoreHeader({ driver, onOpenDetails }) {
  return (
    <LinearGradient
      colors={[colors.heroTop, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View pointerEvents="none" style={styles.headerGlow} />
      <View style={styles.headerTopRow}>
        <Ionicons name="person-circle-outline" size={30} color={colors.white} />
        <AppText variant="heading" color={colors.white} style={styles.headerTitle}>
          My Profile
        </AppText>
      </View>

      <Pressable
        onPress={onOpenDetails}
        accessibilityRole="button"
        accessibilityLabel={`Open ${driver.name} details`}
        style={styles.studentCard}
      >
        <View style={styles.avatar}>
          <AppText variant="title" color={colors.primary}>
            {getInitial(driver.name)}
          </AppText>
        </View>
        <View style={styles.studentCopy}>
          <AppText variant="subtitle" color={colors.white} style={styles.studentName}>
            {driver.name}
          </AppText>
          <AppText variant="caption" color={colors.onPrimaryMuted}>
            {driver.role}
          </AppText>
          <AppText variant="caption" color={colors.onPrimaryMuted}>
            {driver.phoneDisplay || driver.phone}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.white} />
      </Pressable>
    </LinearGradient>
  );
}

function MenuRow({ item, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
      <View style={[styles.menuIcon, styles[`menuIcon${item.tone}`]]}>
        <Ionicons name={ICONS[item.icon]} size={22} color={ICON_COLORS[item.tone] || colors.primary} />
      </View>
      <AppText
        variant="body"
        color={item.tone === 'error' ? colors.errorText : colors.textPrimary}
        style={styles.menuLabel}
      >
        {item.label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

function LogoutModal({ visible, onCancel, onConfirm }) {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(animation, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      animation.setValue(0);
    }
  }, [animation, visible]);

  const animatedCardStyle = {
    opacity: animation,
    transform: [{ scale: animation.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <Animated.View style={[styles.logoutCard, animatedCardStyle]}>
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={32} color={colors.error} />
          </View>
          <AppText variant="title" style={styles.logoutTitle}>
            Log out?
          </AppText>
          <AppText variant="body" style={styles.logoutMessage}>
            Are you sure you want to log out of your driver account?
          </AppText>
          <View style={styles.logoutActions}>
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <AppText variant="button" color={colors.textSecondary}>
                Cancel
              </AppText>
            </Pressable>
            <Pressable onPress={onConfirm} style={styles.confirmLogoutButton}>
              <Ionicons name="log-out-outline" size={18} color={colors.white} />
              <AppText variant="button" color={colors.white}>
                Log out
              </AppText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Profile tab: header + menu from staff-backed GET /api/v1/driver-app/profile.
 */
export default function MoreScreen({ driverToken, onLogout }) {
  // Why: block header until staff profile JSON arrives
  const [loading, setLoading] = useState(true);
  // Why: show retry when employee/staff lookup fails
  const [error, setError] = useState('');
  // Why: header + details both read from the same profile object
  const [profile, setProfile] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [logoutVisible, setLogoutVisible] = useState(false);

  /** Fetch staff-backed profile for this session token. */
  const refreshProfile = useCallback(async () => {
    if (!driverToken) {
      // Why: without a token we cannot call the private profile API
      setError('Sign in again to load profile');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await loadDriverProfile(driverToken);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [driverToken]);

  useEffect(() => {
    // Why: load profile as soon as the Profile tab mounts
    refreshProfile();
  }, [refreshProfile]);

  function handleMenuPress(itemId) {
    if (itemId === 'logout') {
      setLogoutVisible(true);
      return;
    }
    // Why: details / server / BLE gateway are nested screens opened from Profile only
    if (itemId === 'details' || itemId === 'server' || itemId === 'bleGateway') {
      setSelectedMenu(itemId);
    }
  }

  if (selectedMenu === 'details' && profile) {
    // Why: details rows are built from the same API payload as the header
    const detailRows = buildDriverDetailRowsFromProfile(profile);
    return (
      <DriverDetailsScreen
        driver={{
          name: profile.name,
          role: profile.role,
          // Why: details header shows employee code (not numeric employees.id)
          employeeId: profile.employeeCode,
        }}
        details={detailRows}
        onBack={() => setSelectedMenu(null)}
      />
    );
  }

  if (selectedMenu === 'server') {
    return (
      <ServerSettingsScreen
        onBack={() => setSelectedMenu(null)}
        onSaved={() => onLogout?.()}
      />
    );
  }

  // Why: BLE hub is settings-only — Home / trip / nearVan flows stay unchanged
  if (selectedMenu === 'bleGateway') {
    return <BlePhoneGatewayHubScreen onBack={() => setSelectedMenu(null)} />;
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={styles.statusText}>
          Loading profile...
        </AppText>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <AppText variant="subtitle" style={styles.statusTitle}>
          Could not load profile
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.statusText}>
          {error || 'Profile is unavailable'}
        </AppText>
        <Pressable onPress={refreshProfile} style={styles.retryButton}>
          <AppText variant="body" color={colors.primary}>
            Try again
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <MoreHeader driver={profile} onOpenDetails={() => setSelectedMenu('details')} />
      <View style={styles.menuList}>
        {PROFILE_MENU_ITEMS.map((item) => (
          <MenuRow key={item.id} item={item} onPress={() => handleMenuPress(item.id)} />
        ))}
      </View>
      <LogoutModal
        visible={logoutVisible}
        onCancel={() => setLogoutVisible(false)}
        onConfirm={() => {
          setLogoutVisible(false);
          onLogout?.();
        }}
      />
    </ScrollView>
  );
}
