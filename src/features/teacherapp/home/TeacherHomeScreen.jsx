import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
import { fetchTeacherHome } from '../api/teacherApi';
import ModeSwitcher from '../components/ModeSwitcher';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

/** Good morning / afternoon / evening from the phone clock. */
function greetingNow() { // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Home hero sized like Attendance header (tall gradient + staff card).
 * Why: greeting card was too short next to Attendance tab.
 */
function TeacherGreetingCard({ name, designation, canTrip, onSwitchMode, onOpenMore }) {
  const initial = (name || 'S').trim().charAt(0).toUpperCase();
  return (
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
      <View style={styles.staffCard}>
        <Pressable onPress={onOpenMore} style={styles.namePress}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.primary}>
              {initial}
            </AppText>
          </View>
          <View style={styles.nameCopy}>
            <AppText variant="subtitle" color={colors.white} numberOfLines={1} style={{ fontWeight: '700' }}>
              {name || 'Staff'}
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {designation || 'Staff'}
            </AppText>
          </View>
        </Pressable>
        <ModeSwitcher currentMode="LEAVE" canTrip={canTrip} onSelect={onSwitchMode} />
      </View>
    </LinearGradient>
  );
}

/** Format API clock (HH:mm:ss / HH:mm) as 12-hour time with AM/PM. */
function formatClock(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return text;
  let hour = Number(match[1]);
  const minute = match[2];
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return text;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${suffix}`;
}

function sessionLabel(raw) {
  const key = String(raw || 'NONE').toUpperCase();
  if (key === 'PRESENT') return { text: 'Present', color: colors.successText, bg: colors.successBg };
  if (key === 'ABSENT') return { text: 'Absent', color: colors.errorText, bg: colors.errorBg };
  if (key === 'ON_LEAVE') return { text: 'Leave', color: colors.leave, bg: colors.leaveBg };
  if (key === 'HALF_DAY') return { text: 'Half day', color: colors.halfDay, bg: colors.halfDayBg };
  if (key === 'LATE') return { text: 'Late', color: colors.warningText, bg: colors.warningBg };
  return { text: 'Not yet taken', color: colors.textSecondary, bg: colors.neutralBg || '#EEF2F7' };
}

function todaySummaryCopy(home) {
  const morning = String(home?.todayMorningStatus || 'NONE').toUpperCase();
  const afternoon = String(home?.todayAfternoonStatus || 'NONE').toUpperCase();
  const overall = String(home?.todayStatus || 'NONE').toUpperCase();
  if (overall === 'LEAVE' || (morning === 'ON_LEAVE' && afternoon === 'ON_LEAVE')) {
    return { title: 'On leave today', hint: 'Full-day approved leave' };
  }
  if (morning === 'ON_LEAVE' && afternoon !== 'ON_LEAVE') {
    return {
      title: 'Half-day leave',
      hint: 'Morning on leave · Afternoon ' + sessionLabel(afternoon).text.toLowerCase(),
    };
  }
  if (afternoon === 'ON_LEAVE' && morning !== 'ON_LEAVE') {
    return {
      title: 'Half-day leave',
      hint: 'Afternoon on leave · Morning ' + sessionLabel(morning).text.toLowerCase(),
    };
  }
  if (morning === 'PRESENT' && afternoon === 'ABSENT') {
    return { title: 'Half day', hint: 'Present in the morning · Absent in the afternoon' };
  }
  if (afternoon === 'PRESENT' && morning === 'ABSENT') {
    return { title: 'Half day', hint: 'Present in the afternoon · Absent in the morning' };
  }
  if (overall === 'LATE' || (morning === 'PRESENT' && home?.lateReasonPending)) {
    return { title: 'Present · Late', hint: 'Arrived late today' };
  }
  if (morning === 'PRESENT' && afternoon === 'PRESENT') {
    return { title: 'Present today', hint: 'Marked present for morning and afternoon' };
  }
  if (morning === 'PRESENT' && (afternoon === 'NONE' || !afternoon)) {
    return { title: 'Present · Morning', hint: 'Afternoon not yet taken' };
  }
  if (afternoon === 'PRESENT' && (morning === 'NONE' || !morning)) {
    return { title: 'Present · Afternoon', hint: 'Morning not yet taken' };
  }
  if (morning === 'ABSENT' && afternoon === 'ABSENT') {
    return { title: 'Absent today', hint: 'Marked absent for both sessions' };
  }
  if (overall === 'ABSENT') {
    return { title: 'Absent today', hint: 'Attendance marked absent' };
  }
  return { title: 'Not yet taken', hint: 'No attendance recorded for today yet' };
}

/** Read-only summary cards — not navigated. */
function StatGrid({ home }) {
  const cards = [
    { id: 'present', label: 'Present this month', value: home?.presentCount ?? 0, icon: 'person' },
    { id: 'late', label: 'Late this month', value: home?.lateCount ?? 0, icon: 'alert-circle' },
    { id: 'approved', label: 'Accepted leave', value: home?.approvedLeaveCount ?? 0, icon: 'checkmark-circle' },
    { id: 'pending', label: 'Leave pending for approval', value: home?.pendingLeaveCount ?? 0, icon: 'time' },
  ];
  return (
    <View style={styles.statGrid}>
      {cards.map((card) => (
        <View key={card.id} style={styles.statCard} pointerEvents="none">
          <Ionicons name={card.icon} size={20} color={colors.primary} />
          <AppText variant="title" style={styles.statValue}>
            {card.value}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.statLabel}>
            {card.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** Map raw API status → icon, colors, and readable label. */
function todayAttendanceTone(rawStatus) {
  const key = String(rawStatus || 'NONE').toUpperCase().replace(/[\s-]/g, '_');
  const map = {
    PRESENT: {
      label: 'Present',
      hint: 'Marked present for today',
      icon: 'checkmark-circle',
      bg: colors.successBg,
      text: colors.successText,
      iconBg: '#C6F0D6',
    },
    ABSENT: {
      label: 'Absent',
      hint: 'Marked absent for today',
      icon: 'close-circle',
      bg: colors.errorBg,
      text: colors.errorText,
      iconBg: '#FFD0D4',
    },
    LATE: {
      label: 'Late',
      hint: 'Arrived late today',
      icon: 'time',
      bg: colors.warningBg,
      text: colors.warningText,
      iconBg: '#FFE4A8',
    },
    HALF_DAY: {
      label: 'Half day',
      hint: 'Half day marked today',
      icon: 'ellipse',
      bg: colors.halfDayBg,
      text: colors.halfDay,
      iconBg: '#FFC090',
    },
    ON_LEAVE: {
      label: 'On leave',
      hint: 'On approved leave today',
      icon: 'calendar',
      bg: colors.leaveBg,
      text: colors.leave,
      iconBg: '#E4D0FF',
    },
    LEAVE: {
      label: 'On leave',
      hint: 'On approved leave today',
      icon: 'calendar',
      bg: colors.leaveBg,
      text: colors.leave,
      iconBg: '#E4D0FF',
    },
  };
  return (
    map[key] || {
      label: 'Not yet taken',
      hint: 'No attendance recorded yet',
      icon: 'help-circle',
      bg: colors.primarySoft,
      text: colors.primaryDark,
      iconBg: colors.white,
    }
  );
}

/** Statuses that show entry/exit clocks on the today card. */
function showsAttendanceTimes(status) {
  const key = String(status || '').toUpperCase().replace(/[\s-]/g, '_');
  return key === 'PRESENT' || key === 'LATE' || key === 'HALF_DAY';
}

function SessionStatusRow({ label, status }) {
  const tone = sessionLabel(status);
  return (
    <View style={styles.sessionRow}>
      <AppText variant="caption" style={styles.sessionLabel}>
        {label}
      </AppText>
      <View style={[styles.sessionBadge, { backgroundColor: tone.bg }]}>
        <AppText variant="caption" style={[styles.sessionBadgeText, { color: tone.color }]}>
          {tone.text}
        </AppText>
      </View>
    </View>
  );
}

/** Today attendance — morning/afternoon split in one card. */
function TodayAttendanceCard({ home, onLateReason }) {
  const tone = todayAttendanceTone(home?.todayStatus);
  const summary = todaySummaryCopy(home);
  const showTimes = showsAttendanceTimes(home?.todayStatus);
  return (
    <View style={[styles.todayCard, { backgroundColor: colors.white }]}>
      <View style={styles.todayTop}>
        <View style={[styles.todayIconWrap, { backgroundColor: tone.iconBg }]}>
          <Ionicons name={tone.icon} size={28} color={tone.text} />
        </View>
        <View style={styles.todayCopy}>
          <AppText variant="caption" color={colors.textSecondary} style={styles.todayEyebrow}>
            Today's attendance
          </AppText>
          <AppText variant="title" style={[styles.todayStatus, { color: colors.textPrimary }]}>
            {summary.title}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.todayHint}>
            {summary.hint}
          </AppText>
        </View>
      </View>

      <View style={styles.sessionStack}>
        <SessionStatusRow label="Morning" status={home?.todayMorningStatus} />
        <SessionStatusRow label="Afternoon" status={home?.todayAfternoonStatus} />
      </View>

      {showTimes ? (
        <View style={styles.todayTimesRow}>
          <View style={styles.todayTimeChip}>
            <Ionicons name="enter-outline" size={14} color={colors.textSecondary} />
            <AppText variant="caption" style={{ color: colors.textPrimary, fontWeight: '700' }}>
              In {formatClock(home?.todayEntryTime) || '—'}
            </AppText>
          </View>
          <View style={styles.todayTimeChip}>
            <Ionicons name="exit-outline" size={14} color={colors.textSecondary} />
            <AppText variant="caption" style={{ color: colors.textPrimary, fontWeight: '700' }}>
              Out {formatClock(home?.todayExitTime) || '—'}
            </AppText>
          </View>
        </View>
      ) : null}
      {home?.todayDate ? (
        <View style={styles.todayDateRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <AppText variant="caption" style={{ color: colors.textSecondary, fontWeight: '600' }}>
            {home.todayDate}
          </AppText>
        </View>
      ) : null}
      {home?.lateReasonPending ? (
        <Pressable style={styles.warn} onPress={onLateReason}>
          <Ionicons name="warning" size={18} color="#92400E" />
          <AppText variant="body" style={styles.warnText}>
            Submit why you were late
          </AppText>
          <Ionicons name="chevron-forward" size={16} color="#92400E" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Staff Home: greeting, stats (no tap), today attendance status. */
export default function TeacherHomeScreen({
  teacherToken,
  canTrip,
  onSwitchToTrip,
  onOpenMore,
  navigation,
}) {
  const [home, setHome] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setHome(await fetchTeacherHome(teacherToken));
    } catch (e) {
      setError(e.message || 'Could not load home');
    }
  }, [teacherToken]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <TeacherGreetingCard
        name={home?.staffName}
        designation={home?.designation}
        canTrip={canTrip}
        onSwitchMode={(mode) => {
          if (mode === 'TRIP') onSwitchToTrip?.();
        }}
        onOpenMore={onOpenMore}
      />
      <StatGrid home={home} />
      <TodayAttendanceCard
        home={home}
        onLateReason={() => navigation.navigate('LateReason')}
      />
      {error ? (
        <AppText variant="body" color={colors.errorText} style={{ paddingHorizontal: spacing.md }}>
          {error}
        </AppText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  // Why: match Attendance header height and margins
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  greeting: { flex: 1, fontSize: 30, lineHeight: 36 },
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
  namePress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  nameCopy: { flex: 1, gap: 2 },
  statGrid: {
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
  todayCard: {
    marginHorizontal: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  todayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  todayIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCopy: { flex: 1, gap: 6 },
  todayEyebrow: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 11 },
  todayBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  todayStatus: { fontWeight: '800', fontSize: 20 },
  todayHint: { opacity: 0.95 },
  sessionStack: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border || '#E5E7EB',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sessionLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  sessionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.pill,
    minWidth: 110,
    alignItems: 'center',
  },
  sessionBadgeText: {
    fontWeight: '700',
    fontSize: 12,
  },
  todayTimesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  todayTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.canvas || '#F5F7FB',
  },
  todayDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.xs,
  },
  warn: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
  },
  warnText: { color: colors.warningText, fontWeight: '600', flex: 1 },
});
