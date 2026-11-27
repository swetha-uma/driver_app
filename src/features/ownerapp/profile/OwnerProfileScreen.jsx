import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../../components/common/AppText';
import { fetchOwnerProfile } from '../api/ownerApi';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

/** Owner's own profile — same "Staff details" layout as the Teacher app's More tab. */
export default function OwnerProfileScreen({ ownerToken, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchOwnerProfile(ownerToken)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerToken]);

  const initial = (profile?.fullName || 'O').trim().charAt(0).toUpperCase();
  const rows = [
    { label: 'Name', value: profile?.fullName || '—' },
    { label: 'Phone', value: profile?.phone || '—' },
    { label: 'Email', value: profile?.email || '—' },
    { label: 'School', value: profile?.schoolName || '—' },
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
            Owner details
          </AppText>
        </View>
        <View style={styles.staffCard}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.primary}>{initial}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" color={colors.white} style={{ fontWeight: '700' }}>
              {profile?.fullName || 'Owner'}
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {profile?.schoolName || 'Owner'}
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {profile?.phone || ''}
            </AppText>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <AppText variant="display" color={colors.primary}>{initial}</AppText>
        </View>
        <AppText variant="title" style={{ marginTop: spacing.md }}>
          {profile?.fullName || 'Owner'}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {profile?.schoolName || 'Owner'}
        </AppText>
      </View>

      <View style={styles.detailRowsCard}>
        {rows.map((row, index) => (
          <View
            key={row.label}
            style={[styles.detailRow, index === rows.length - 1 && styles.detailRowLast]}
          >
            <AppText variant="caption" color={colors.textSecondary}>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  detailsContent: { paddingBottom: spacing.xl, gap: spacing.md },
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
  detailsHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
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
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailValue: { fontWeight: '700', color: colors.textPrimary },
  lockedNote: { paddingVertical: spacing.md },
});
