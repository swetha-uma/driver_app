import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../components/common/AppText';
import { loadDriverAttendanceMonth } from '../../mockData/attendance/attendanceMockData';
import { getDriverProfileForPhone } from '../../mockData/more/moreMockData';
import { colors } from '../../theme/colors';
import { radii } from '../../theme/theme';
import styles from './AttendanceScreen.styles';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const statusStyles = {
  present: styles.dayPresent,
  absent: styles.dayAbsent,
  late: styles.dayLate,
  halfDay: styles.dayHalfDay,
  leave: styles.dayLeave,
};

const LEGEND = [
  { id: 'present', label: 'Present' },
  { id: 'absent', label: 'Absent' },
  { id: 'late', label: 'Late' },
  { id: 'halfDay', label: 'Half day' },
  { id: 'leave', label: 'Leave' },
];

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

function formatMonth(month, year) {
  return `${MONTHS[month]} ${year}`;
}

function getInitial(name) {
  return (name || 'D').trim().charAt(0).toUpperCase();
}

function AttendanceHeader({ driver, onOpenProfile }) {
  return (
    <LinearGradient
      colors={[colors.heroTop, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View pointerEvents="none" style={styles.headerGlow} />
      <View style={styles.headerTopRow}>
        <Ionicons name="calendar-outline" size={28} color={colors.white} />
        <AppText variant="heading" color={colors.white} style={styles.headerTitle}>
          Attendance
        </AppText>
      </View>
      <Pressable
        onPress={onOpenProfile}
        accessibilityRole="button"
        accessibilityLabel={`Open ${driver.name} profile`}
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
      </Pressable>
    </LinearGradient>
  );
}

function MonthSelector({ month, year, onChangeMonth }) {
  return (
    <View style={styles.monthRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        hitSlop={radii.md}
        onPress={() => onChangeMonth(-1)}
        style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}
      >
        <Ionicons name="arrow-back" size={18} color={colors.primary} />
      </Pressable>
      <AppText variant="title" style={styles.monthTitle}>
        {formatMonth(month, year)}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next month"
        hitSlop={radii.md}
        onPress={() => onChangeMonth(1)}
        style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}
      >
        <Ionicons name="arrow-forward" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
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
          <View style={styles.ringClipRight}>
            <View
              style={[
                styles.ringSpinner,
                styles.ringSpinnerRight,
                { transform: [{ rotate: `${rightSweep - 180}deg` }] },
              ]}
            />
          </View>
          <View style={styles.ringClipLeft}>
            <View
              style={[
                styles.ringSpinner,
                styles.ringSpinnerLeft,
                { transform: [{ rotate: `${leftSweep}deg` }] },
              ]}
            />
          </View>
        </>
      ) : null}
      <View style={styles.progressCenter}>
        <AppText variant="title" style={styles.percentage}>
          {value}%
        </AppText>
      </View>
    </View>
  );
}

function SummaryPill({ count, label, variant }) {
  const tone = `${variant.charAt(0).toUpperCase()}${variant.slice(1)}`;
  const textStyle = styles[`pillText${tone}`];
  return (
    <View style={[styles.summaryPill, styles[`pill${tone}`]]}>
      <AppText variant="caption" style={[styles.pillValue, textStyle]}>
        {count}
      </AppText>
      <AppText variant="caption" numberOfLines={1} style={[styles.pillLabel, textStyle]}>
        {label}
      </AppText>
    </View>
  );
}

function SummaryCard({ summary }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <SummaryRing percentage={summary.percentage} />
        <View style={styles.summaryCopy}>
          <AppText variant="title">Monthly attendance</AppText>
          <AppText variant="body" style={styles.summaryCounts}>
            {`${summary.present} present · ${summary.absent} absent`}
          </AppText>
        </View>
      </View>
      <View style={styles.summaryPills}>
        <SummaryPill count={summary.present} label="Present" variant="present" />
        <SummaryPill count={summary.absent} label="Absent" variant="absent" />
        <SummaryPill count={summary.late} label="Late" variant="late" />
        {summary.halfDay > 0 ? (
          <SummaryPill count={summary.halfDay} label="Half day" variant="halfDay" />
        ) : null}
        {summary.leave > 0 ? (
          <SummaryPill count={summary.leave} label="Leave" variant="leave" />
        ) : null}
      </View>
    </View>
  );
}

function AttendanceCalendar({ month, year, records, selectedDate, onSelectDate, legend }) {
  const days = useMemo(() => getCalendarDays(year, month, records), [month, records, year]);

  return (
    <View style={styles.calendarCard}>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((weekday, index) => (
          <AppText key={`${weekday}-${index}`} variant="caption" style={styles.weekday}>
            {weekday}
          </AppText>
        ))}
      </View>
      <View style={styles.daysGrid}>
        {days.map((item, index) => {
          if (!item) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const selected = item.dateKey === selectedDate;
          const statusStyle = item.status ? statusStyles[item.status] : null;

          return (
            <Pressable
              key={item.dateKey}
              accessibilityRole="button"
              accessibilityLabel={`${item.day}${item.status ? `, ${item.status}` : ''}`}
              onPress={() => onSelectDate(item.dateKey)}
              style={({ pressed }) => [
                styles.dayCell,
                styles.day,
                statusStyle,
                selected && styles.daySelected,
                pressed && styles.dayPressed,
              ]}
            >
              <AppText variant="label" style={styles.dayText}>
                {item.day}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legendDivider} />
      <View style={styles.legendWrap}>
        {legend.map((item) => (
          <View key={item.id} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                styles[`legend${item.id.charAt(0).toUpperCase()}${item.id.slice(1)}`],
              ]}
            />
            <AppText variant="caption" style={styles.legendText}>
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Driver attendance — same calendar UI as parent app, mock data. */
export default function AttendanceScreen({ phone, onOpenProfile }) {
  const driver = getDriverProfileForPhone(phone);
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState('');
  const [monthData, setMonthData] = useState(null);

  useEffect(() => {
    setMonthData(loadDriverAttendanceMonth(year, month + 1));
  }, [year, month]);

  const records = {};
  (monthData?.days || []).forEach((day) => {
    records[day.date] = day.status;
  });
  const summary = {
    percentage: monthData?.percentage ?? 0,
    present: monthData?.presentCount ?? 0,
    absent: monthData?.absentCount ?? 0,
    late: monthData?.lateCount ?? 0,
    halfDay: monthData?.halfDayCount ?? 0,
    leave: monthData?.leaveCount ?? 0,
  };

  const changeMonth = (offset) => {
    const nextDate = new Date(year, month + offset, 1);
    setMonth(nextDate.getMonth());
    setYear(nextDate.getFullYear());
    setSelectedDate('');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AttendanceHeader driver={driver} onOpenProfile={onOpenProfile} />
      <MonthSelector month={month} year={year} onChangeMonth={changeMonth} />
      {monthData ? (
        <SummaryCard summary={summary} />
      ) : (
        <AppText variant="body" style={styles.loading}>
          Loading attendance…
        </AppText>
      )}
      <AttendanceCalendar
        month={month}
        year={year}
        records={records}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        legend={LEGEND}
      />
    </ScrollView>
  );
}
