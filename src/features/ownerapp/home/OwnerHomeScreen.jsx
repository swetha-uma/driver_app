import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../../components/common/AppText';
import SchoolSwitcher from '../components/SchoolSwitcher';
import {
  fetchOwnerAdvanceRequests,
  fetchOwnerLateRequests,
  fetchOwnerLeaveRequests,
  fetchOwnerSchools,
  fetchOwnerScholarshipRequests,
  fetchOwnerSalaryStructures,
  switchOwnerSchool,
} from '../api/ownerApi';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

function greetingNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Why: match the list screens' own normalization (LeaveLateApprovalScreen, SalaryAdvanceApprovalScreen,
// ScholarshipApprovalScreen) — a missing/null status defaults to PENDING there, so it must here too,
// otherwise a row with no status shows as "Pending" in the list but silently drops out of this count.
function countPending(list) {
  return (list || []).filter((item) => String(item.status || 'PENDING').toUpperCase() === 'PENDING').length;
}

// Why: OwnerNavigator unmounts this screen on every tab switch — cache the last-known
// counts/schools per token so coming back to Home shows them instantly instead of a
// spinner, while a fresh fetch still runs quietly in the background.
const homeCache = new Map();

/** Owner Home — greeting + today's pending-approval counts, first tab before Leave/Late. */
export default function OwnerHomeScreen({ ownerToken, ownerName }) {
  const cached = homeCache.get(ownerToken);
  const [counts, setCounts] = useState(
    cached?.counts ?? { leave: 0, late: 0, salary: 0, advance: 0, scholarship: 0 },
  );
  const [loading, setLoading] = useState(!cached);
  const [schools, setSchools] = useState(cached?.schools ?? []);

  const load = useCallback(async () => {
    if (!ownerToken) {
      setLoading(false);
      return;
    }
    // Why: only show the spinner when there is nothing cached yet to display
    if (!homeCache.has(ownerToken)) {
      setLoading(true);
    }
    try {
      const [leaves, lates, advances, structures, scholarships, schoolList] = await Promise.all([
        fetchOwnerLeaveRequests(ownerToken).catch(() => []),
        fetchOwnerLateRequests(ownerToken).catch(() => []),
        fetchOwnerAdvanceRequests(ownerToken).catch(() => []),
        fetchOwnerSalaryStructures(ownerToken).catch(() => []),
        fetchOwnerScholarshipRequests(ownerToken).catch(() => []),
        fetchOwnerSchools(ownerToken).catch(() => []),
      ]);
      const nextCounts = {
        leave: countPending(leaves),
        late: countPending(lates),
        advance: countPending(advances),
        // Why: fetchOwnerSalaryStructures only ever returns pending-approval rows already
        salary: (structures || []).length,
        scholarship: countPending(scholarships),
      };
      const nextSchools = schoolList || [];
      homeCache.set(ownerToken, { counts: nextCounts, schools: nextSchools });
      setCounts(nextCounts);
      setSchools(nextSchools);
    } finally {
      setLoading(false);
    }
  }, [ownerToken]);

  useEffect(() => {
    load();
  }, [load]);

  const currentSchool = schools.find((s) => s.current);

  const handleSwitchSchool = useCallback(
    async (schoolId) => {
      try {
        await switchOwnerSchool(ownerToken, schoolId);
        await load();
      } catch {
        // Why: keep the current school selected if the switch fails
      }
    },
    [ownerToken, load],
  );

  const cards = [
    {
      id: 'leave',
      icon: 'checkbox-outline',
      label: 'Leave pending',
      count: counts.leave,
      color: colors.primary,
    },
    {
      id: 'late',
      icon: 'time-outline',
      label: 'Late pending',
      count: counts.late,
      color: colors.primary,
    },
    {
      id: 'salary',
      icon: 'cash-outline',
      label: 'Salary pending',
      count: counts.salary,
      color: colors.secondary,
    },
    {
      id: 'advance',
      icon: 'wallet-outline',
      label: 'Advance pending',
      count: counts.advance,
      color: colors.secondary,
    },
    {
      id: 'scholarship',
      icon: 'school-outline',
      label: 'Scholarship pending',
      count: counts.scholarship,
      color: colors.leave,
    },
    {
      id: 'financial',
      icon: 'receipt-outline',
      label: 'Financial request pending',
      count: 0,
      color: colors.secondary,
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <LinearGradient
        colors={[colors.heroTop, colors.primary, colors.buttonEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View pointerEvents="none" style={styles.circleLarge} />
        <View pointerEvents="none" style={styles.circleDeep} />
        <View style={styles.headerTop}>
          <Ionicons name="sunny-outline" size={28} color={colors.white} />
          <AppText variant="heading" color={colors.white} style={styles.greeting}>
            {greetingNow()}
          </AppText>
        </View>
        <View style={styles.ownerCard}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.primary}>
              {(ownerName || 'O').trim().charAt(0).toUpperCase()}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" color={colors.white} numberOfLines={1} style={{ fontWeight: '700' }}>
              {ownerName || 'Owner'}
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted} numberOfLines={1}>
              {currentSchool?.schoolName || 'Owner'}
            </AppText>
          </View>
          <SchoolSwitcher schools={schools} onSelect={handleSwitchSchool} />
        </View>
      </LinearGradient>

      <AppText variant="label" style={{ marginHorizontal: spacing.md, marginTop: spacing.sm }}>
        Today&apos;s pending approvals
      </AppText>

      <View style={styles.cardsWrap}>
        {cards.map((card) => (
          <View key={card.id} style={styles.statCard} pointerEvents="none">
            <Ionicons name={card.icon} size={20} color={card.color} />
            <AppText variant="title" style={styles.statValue}>
              {loading ? '—' : card.count}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} style={styles.statLabel}>
              {card.label}
            </AppText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  header: {
    minHeight: 180,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.hero,
  },
  circleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.heroCircle,
    top: -70,
    right: -40,
  },
  circleDeep: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.heroCircleDeep,
    bottom: -36,
    left: -28,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  greeting: { flex: 1, fontSize: 28, lineHeight: 34 },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
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
  cardsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.card,
  },
  statValue: { color: colors.textPrimary, fontWeight: '700' },
  statLabel: { fontSize: 12 },
});
