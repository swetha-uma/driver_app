import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../../components/common/AppText';
import { fetchTeacherAttendanceMonth } from '../api/teacherApi';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const MONTHS = [ // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const LEGEND = [
  { id: 'present', label: 'Present' },
  { id: 'absent', label: 'Absent' },
  { id: 'late', label: 'Late' },
  { id: 'halfDay', label: 'Half day' },
  { id: 'leave', label: 'Leave' },
  { id: 'holiday', label: 'Holiday' },
];

function formatHolidayDay(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function getCalendarDays(year, month, records) {
  const firstDay = new Date(year, month, 1).getDay();
  const leadingDays = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: leadingDays }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({ day, dateKey, status: records[dateKey] });
  }
  return days;
}

function SummaryRing({ percentage }) {
  const value = Math.max(0, Math.min(100, Number(percentage) || 0));
  const rightSweep = value <= 50 ? (value / 50) * 180 : 180;
  const leftSweep = value <= 50 ? 0 : ((value - 50) / 50) * 180;
  return (
    <View style={styles.progressRing}>
      <View style={styles.progressTrack} />
      {value > 0 ? (
        <>
          {/* Why: spinner colours top+right borders = arc −45°..135°, so rotations carry a 45° offset. */}
          <View style={styles.ringClipRight}>
            <View style={[styles.ringSpinner, styles.ringSpinnerRight, { transform: [{ rotate: `${rightSweep - 135}deg` }] }]} />
          </View>
          {value > 50 ? (
            <View style={styles.ringClipLeft}>
              <View style={[styles.ringSpinner, styles.ringSpinnerLeft, { transform: [{ rotate: `${leftSweep + 45}deg` }] }]} />
            </View>
          ) : null}
        </>
      ) : null}
      <View style={styles.progressCenter}>
        <AppText variant="title">{value}%</AppText>
      </View>
    </View>
  );
}

function SummaryPill({ count, label, tone }) {
  return (
    <View style={[styles.pill, styles[`pill${tone}`]]}>
      <AppText variant="caption" style={[styles.pillValue, styles[`pillText${tone}`]]}>{count}</AppText>
      <AppText variant="caption" numberOfLines={1} style={[styles.pillLabel, styles[`pillText${tone}`]]}>{label}</AppText>
    </View>
  );
}

/** Parent-style attendance: percentage ring + calendar. */
export default function TeacherAttendanceScreen({ teacherToken, staffName, designation }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchTeacherAttendanceMonth(teacherToken, year, month + 1));
    } catch {
      setData({
        percentage: 0, presentCount: 0, absentCount: 0, lateCount: 0, halfDayCount: 0, leaveCount: 0, days: [],
      });
    }
  }, [teacherToken, year, month]);

  useEffect(() => { load(); }, [load]);

  const records = useMemo(() => {
    const map = {};
    (data?.days || []).forEach((d) => { map[d.date] = d.status; });
    return map;
  }, [data]);

  const schoolHolidays = useMemo(() => data?.holidays || [], [data]);
  const holidayMap = useMemo(() => {
    const map = {};
    schoolHolidays.forEach((h) => { map[h.date] = h.name; });
    // Why: Sundays count as holiday in the staff calendar
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const weekday = new Date(`${dateKey}T00:00:00`).getDay();
      if (weekday === 0 && !map[dateKey]) {
        map[dateKey] = 'Sunday';
      }
    }
    return map;
  }, [schoolHolidays, year, month]);
  const holidays = useMemo(
    () => Object.keys(holidayMap)
      .sort()
      .map((date) => ({ date, name: holidayMap[date] })),
    [holidayMap],
  );

  const days = useMemo(() => getCalendarDays(year, month, records), [year, month, records]);
  const statusStyles = {
    present: styles.dayPresent,
    absent: styles.dayAbsent,
    late: styles.dayLate,
    halfDay: styles.dayHalfDay,
    leave: styles.dayLeave,
    holiday: styles.dayHoliday,
  };
  const statusTextStyles = {
    present: styles.dayPresentText,
    absent: styles.dayAbsentText,
    late: styles.dayLateText,
    halfDay: styles.dayHalfDayText,
    leave: styles.dayLeaveText,
  };

  function shift(delta) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LinearGradient colors={[colors.heroTop, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="calendar-outline" size={28} color={colors.white} />
          <AppText variant="heading" color={colors.white}>Attendance</AppText>
        </View>
        <View style={styles.staffCard}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.primary}>{(staffName || 'S').charAt(0)}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" color={colors.white}>{staffName || 'Staff'}</AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>{designation || 'Staff'}</AppText>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.monthRow}>
        <Pressable onPress={() => shift(-1)} style={styles.monthBtn}><Ionicons name="arrow-back" size={18} color={colors.primary} /></Pressable>
        <AppText variant="title">{MONTHS[month]} {year}</AppText>
        <Pressable onPress={() => shift(1)} style={styles.monthBtn}><Ionicons name="arrow-forward" size={18} color={colors.primary} /></Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <SummaryRing percentage={data?.percentage ?? 0} />
          <View style={{ flex: 1 }}>
            <AppText variant="title">Monthly attendance</AppText>
            <AppText variant="body" color={colors.textSecondary}>
              {data?.presentCount ?? 0} present
              {data?.halfDayCount ? ` · ${data.halfDayCount} half day` : ''}
              {' · '}{data?.absentCount ?? 0} absent
            </AppText>
          </View>
        </View>
        <View style={styles.pills}>
          <SummaryPill count={data?.presentCount ?? 0} label="Present" tone="Present" />
          <SummaryPill count={data?.halfDayCount ?? 0} label="Half day" tone="HalfDay" />
          <SummaryPill count={data?.absentCount ?? 0} label="Absent" tone="Absent" />
          <SummaryPill count={data?.lateCount ?? 0} label="Late" tone="Late" />
          <SummaryPill count={data?.leaveCount ?? 0} label="Leave" tone="Leave" />
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <AppText key={`${w}-${i}`} variant="caption" style={styles.weekday}>{w}</AppText>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {days.map((item, index) => {
            if (!item) return <View key={`e-${index}`} style={styles.dayCell} />;
            // Why: a school holiday wins over any attendance colour on that date.
            const isHoliday = Boolean(holidayMap[item.dateKey]);
            const statusKey = String(item.status || '').trim();
            return (
              <View key={item.dateKey} style={styles.dayCell}>
                {/* Why: perfect circle marker — cell stays square grid slot */}
                <View
                  style={[
                    styles.dayCircle,
                    isHoliday ? styles.dayHoliday : (statusKey && statusStyles[statusKey]),
                  ]}
                >
                  <AppText
                    variant="label"
                    style={
                      isHoliday
                        ? styles.dayHolidayText
                        : (statusKey && statusTextStyles[statusKey]) || undefined
                    }
                  >
                    {item.day}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.legendWrap}>
          {LEGEND.map((item) => (
            <View key={item.id} style={styles.legendItem}>
              <View style={[styles.legendDot, statusStyles[item.id]]} />
              <AppText variant="caption">{item.label}</AppText>
            </View>
          ))}
        </View>
        {holidays.length > 0 ? (
          <View style={styles.holidayList}>
            <AppText variant="caption" style={styles.holidayListTitle}>Holidays this month</AppText>
            {holidays.map((h) => (
              <View key={h.date} style={styles.holidayRow}>
                <Ionicons name="sunny-outline" size={14} color={colors.holiday} />
                <AppText variant="caption" style={styles.holidayRowText}>
                  {formatHolidayDay(h.date)} · {h.name}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingBottom: spacing.lg, gap: spacing.md },
  header: {
    marginHorizontal: spacing.md, marginTop: spacing.md, padding: spacing.md,
    borderRadius: radii.xl, overflow: 'hidden', ...shadows.hero,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  staffCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md,
    padding: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.heroBadge,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white,
  },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  monthBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.md, backgroundColor: colors.primarySoft,
  },
  summaryCard: { marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radii.xl, backgroundColor: colors.white, ...shadows.card },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressRing: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { ...StyleSheet.absoluteFillObject, borderWidth: 10, borderRadius: 52, borderColor: colors.primarySoft },
  ringClipRight: { position: 'absolute', top: 0, right: 0, width: 52, height: 104, overflow: 'hidden' },
  ringClipLeft: { position: 'absolute', top: 0, left: 0, width: 52, height: 104, overflow: 'hidden' },
  ringSpinner: {
    position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 10,
    borderColor: 'transparent', borderTopColor: colors.success, borderRightColor: colors.success,
  },
  ringSpinnerRight: { left: -52 },
  ringSpinnerLeft: { left: 0 },
  progressCenter: {
    position: 'absolute', top: 13, left: 13, width: 78, height: 78,
    alignItems: 'center', justifyContent: 'center', borderRadius: 39, backgroundColor: colors.white,
  },
  pills: { flexDirection: 'row', gap: spacing.xs ?? 6, marginTop: spacing.md },
  pill: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.lg },
  pillValue: { fontWeight: '700' },
  pillLabel: { textAlign: 'center' },
  pillPresent: { backgroundColor: colors.successBg },
  pillAbsent: { backgroundColor: colors.errorBg },
  pillLate: { backgroundColor: colors.warningBg },
  pillLeave: { backgroundColor: colors.leaveBg },
  pillHalfDay: { backgroundColor: colors.halfDayBg },
  pillTextHalfDay: { color: colors.halfDay },
  pillTextPresent: { color: colors.successText },
  pillTextAbsent: { color: colors.errorText },
  pillTextLate: { color: colors.warningText },
  pillTextLeave: { color: colors.leave },
  calendarCard: { marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radii.xl, backgroundColor: colors.white, ...shadows.card },
  weekRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekday: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontWeight: '700' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPresent: { backgroundColor: colors.successBg, borderWidth: 1.5, borderColor: colors.success },
  dayAbsent: { backgroundColor: colors.errorBg },
  dayLate: { backgroundColor: colors.warningBg },
  dayHalfDay: { backgroundColor: colors.halfDayBg },
  dayLeave: { backgroundColor: colors.leaveBg },
  dayPresentText: { color: colors.successText, fontWeight: '700' },
  dayAbsentText: { color: colors.errorText, fontWeight: '700' },
  dayLateText: { color: colors.warningText, fontWeight: '700' },
  dayHalfDayText: { color: colors.halfDay, fontWeight: '700' },
  dayLeaveText: { color: colors.leave, fontWeight: '700' },
  dayHoliday: {
    backgroundColor: colors.holidayBg,
    borderWidth: 1.5,
    borderColor: colors.holiday,
    borderRadius: 999,
    overflow: 'hidden',
  },
  dayHolidayText: { color: colors.holiday, fontWeight: '700' },
  holidayList: {
    marginTop: spacing.md, padding: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.holidayBg, gap: 6,
  },
  holidayListTitle: { color: colors.holiday, fontWeight: '700' },
  holidayRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  holidayRowText: { color: colors.textPrimary },
  legendWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
