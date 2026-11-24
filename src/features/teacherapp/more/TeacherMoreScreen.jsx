import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../../components/common/AppText';
import ServerSettingsScreen from '../../settings/ServerSettingsScreen';
import ModeSwitcher from '../components/ModeSwitcher';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const MENU = [ // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  { id: 'details', label: 'Teacher / staff details', icon: 'person-outline', tone: 'purple' },
  { id: 'server', label: 'Server', icon: 'settings-outline', tone: 'slate' },
  { id: 'logout', label: 'Log out', icon: 'log-out-outline', tone: 'error' },
];

const ICON_COLORS = {
  purple: '#6B4BB6',
  slate: '#4B648F',
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
              <AppText variant="button" color={colors.textSecondary}>
                Cancel
              </AppText>
            </Pressable>
            <Pressable onPress={onConfirm} style={styles.confirmBtn}>
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

/** Parent My Child–style staff profile: gradient header + label/value rows. */
function StaffDetailsScreen({ staffName, designation, phone, onBack }) {
  const initial = (staffName || 'S').trim().charAt(0).toUpperCase();
  const rows = [
    { label: 'Name', value: staffName || '—' },
    { label: 'Designation', value: designation || '—' },
    { label: 'Phone', value: phone || '—' },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[colors.heroTop, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.detailsHeader}
      >
        <View pointerEvents="none" style={styles.headerGlow} />
        <View style={styles.detailsHeaderTop}>
          <Pressable onPress={onBack} style={styles.detailsBack} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <Ionicons name="person-outline" size={28} color={colors.white} />
          <AppText variant="heading" color={colors.white} style={styles.detailsTitle}>
            Staff details
          </AppText>
        </View>
        <View style={styles.staffCard}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.primary}>
              {initial}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" color={colors.white} style={{ fontWeight: '700' }}>
              {staffName || 'Staff'}
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {designation || 'Staff'}
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {phone || ''}
            </AppText>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <AppText variant="display" color={colors.primary}>
            {initial}
          </AppText>
        </View>
        <AppText variant="title" style={{ marginTop: spacing.md }}>
          {staffName || 'Staff'}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {designation || 'Staff'}
        </AppText>
      </View>

      <View style={styles.detailRowsCard}>
        {rows.map((row, index) => (
          <View
            key={row.label}
            style={[styles.detailRow, index === rows.length - 1 && styles.detailRowLast]}
          >
            <AppText variant="body" color={colors.textSecondary} style={styles.detailLabel}>
              {row.label}
            </AppText>
            <AppText variant="body" style={styles.detailValue}>
              {row.value}
            </AppText>
          </View>
        ))}
        <AppText variant="body" color={colors.textSecondary} style={styles.lockedNote}>
          Official records are managed by the school and cannot be edited here.
        </AppText>
      </View>
    </ScrollView>
  );
}

/** Parent/driver-style More: tall menu rows that fill the space. */
export default function TeacherMoreScreen({
  staffName,
  designation,
  phone,
  canTrip,
  onSwitchToTrip,
  onLogout,
}) {
  const [menu, setMenu] = useState(null);
  const [logoutVisible, setLogoutVisible] = useState(false);

  if (menu === 'server') {
    return <ServerSettingsScreen onBack={() => setMenu(null)} onSaved={() => onLogout?.()} />;
  }

  if (menu === 'details') {
    return (
      <StaffDetailsScreen
        staffName={staffName}
        designation={designation}
        phone={phone}
        onBack={() => setMenu(null)}
      />
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.heroTop, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View pointerEvents="none" style={styles.headerGlow} />
        <View style={styles.headerTop}>
          <Ionicons name="menu-outline" size={30} color={colors.white} />
          <AppText variant="heading" color={colors.white} style={styles.headerTitle}>
            More
          </AppText>
        </View>
        <View style={styles.staffCard}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.primary}>
              {(staffName || 'S').charAt(0)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" color={colors.white} style={{ fontWeight: '700' }}>
              {staffName || 'Staff'}
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {designation || 'Staff'}
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {phone || ''}
            </AppText>
          </View>
          <ModeSwitcher
            currentMode="LEAVE"
            canTrip={canTrip}
            onSelect={(mode) => {
              if (mode === 'TRIP') onSwitchToTrip?.();
            }}
          />
        </View>
      </LinearGradient>

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
            <View
              style={[
                styles.menuIcon,
                item.tone === 'error' ? styles.menuIconError : styles.menuIconDefault,
              ]}
            >
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
  detailsContent: { paddingBottom: spacing.xl, gap: spacing.md },
  header: {
    minHeight: 200,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.hero,
  },
  detailsHeader: {
    minHeight: 220,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.hero,
  },
  headerGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -44,
    top: -100,
    backgroundColor: colors.heroCircle,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  detailsHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerTitle: { fontSize: 30, lineHeight: 36 },
  detailsTitle: { flex: 1, fontSize: 28, lineHeight: 34 },
  detailsBack: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.heroBadge,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 90,
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  profileCard: {
    alignItems: 'center',
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  detailRowsCard: {
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  detailRow: {
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { flex: 1 },
  detailValue: { flex: 1, textAlign: 'right', fontWeight: '700', color: colors.textPrimary },
  lockedNote: { paddingVertical: spacing.md },
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
  menuIconDefault: { backgroundColor: colors.primarySoft },
  menuIconError: { backgroundColor: colors.errorBg },
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
