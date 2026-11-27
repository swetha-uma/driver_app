import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
import OwnerHeader from '../components/OwnerHeader';
import OwnerProfileScreen from '../profile/OwnerProfileScreen';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const MENU = [
  { id: 'profile', label: 'Profile', icon: 'person-outline', tone: 'default' },
  { id: 'logout', label: 'Log out', icon: 'log-out-outline', tone: 'error' },
];

const ICON_COLORS = {
  default: colors.primary,
  error: colors.error,
};

function LogoutModal({ visible, onCancel, onConfirm }) {
  const animation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.spring(animation, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
    } else {
      animation.setValue(0);
    }
  }, [animation, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <Animated.View
          style={[
            styles.logoutCard,
            {
              opacity: animation,
              transform: [{ scale: animation.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
            },
          ]}
        >
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={32} color={colors.error} />
          </View>
          <AppText variant="title">Log out?</AppText>
          <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            Are you sure you want to log out?
          </AppText>
          <View style={styles.logoutActions}>
            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <AppText variant="button" color={colors.textSecondary}>Cancel</AppText>
            </Pressable>
            <Pressable onPress={onConfirm} style={styles.confirmBtn}>
              <AppText variant="button" color={colors.white}>Log out</AppText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Owner More tab — profile card + logout, same shell style as Teacher More. */
export default function OwnerMoreScreen({ ownerToken, ownerName, phone, onLogout }) {
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [menu, setMenu] = useState(null);

  if (menu === 'profile') {
    return <OwnerProfileScreen ownerToken={ownerToken} onBack={() => setMenu(null)} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OwnerHeader icon="menu-outline" title="More" ownerName={ownerName} subtitle={phone || 'Owner'} />

      <View style={styles.menuList}>
        {MENU.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            onPress={() => {
              if (item.id === 'logout') setLogoutVisible(true);
              else setMenu(item.id);
            }}
          >
            <View style={[styles.menuIcon, item.tone === 'error' ? styles.menuIconError : styles.menuIconDefault]}>
              <Ionicons name={item.icon} size={24} color={ICON_COLORS[item.tone]} />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  menuList: { paddingHorizontal: spacing.md, gap: spacing.md },
  menuRow: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  menuRowPressed: { opacity: 0.82 },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconError: { backgroundColor: colors.errorBg },
  menuIconDefault: { backgroundColor: colors.primarySoft },
  menuLabel: { flex: 1, marginLeft: spacing.md, fontSize: 18, fontWeight: '500' },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(15,27,61,0.58)',
  },
  logoutCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  logoutIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.errorBg,
  },
  logoutActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg, width: '100%' },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  confirmBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
});
