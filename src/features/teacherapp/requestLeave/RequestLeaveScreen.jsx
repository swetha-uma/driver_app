import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
import {
  createTeacherLeaveRequest,
  fetchTeacherLeaveBalances,
  fetchTeacherLeaveTypes,
} from '../api/teacherApi';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const FALLBACK_TYPES = [
  { id: 'casual', name: 'Casual leave' },
  { id: 'earned', name: 'Earned Leave' },
  { id: 'sick', name: 'Sick Leave' },
];

function pad2(n) { // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  return String(n).padStart(2, '0');
}

function toIso(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseIso(value) {
  if (!value) return null;
  const [y, m, day] = value.split('-').map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

function monthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

/** Month grid calendar — Expo-safe, no native date picker module. */
function DateCalendarModal({ visible, title, value, minDate, onClose, onSelect }) {
  const selected = parseIso(value) || minDate || startOfToday();
  const [cursor, setCursor] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

  useEffect(() => {
    if (!visible) return;
    const base = parseIso(value) || minDate || startOfToday();
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [visible, value, minDate]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < firstDow; i += 1) out.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) out.push(new Date(year, month, day));
    return out;
  }, [cursor]);

  const minTs = (minDate || startOfToday()).getTime();
  const selectedIso = value || '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.calBackdrop}>
        <View style={styles.calCard}>
          <View style={styles.calHeader}>
            <AppText variant="title">{title}</AppText>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.calNav}>
            <Pressable
              onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              style={styles.calNavBtn}
            >
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </Pressable>
            <AppText variant="subtitle">{monthLabel(cursor.getFullYear(), cursor.getMonth())}</AppText>
            <Pressable
              onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              style={styles.calNavBtn}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.calWeekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <AppText key={`${d}-${i}`} variant="caption" color={colors.textSecondary} style={styles.calWeekDay}>
                {d}
              </AppText>
            ))}
          </View>
          <View style={styles.calGrid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={styles.calCell} />;
              const iso = toIso(day);
              const disabled = day.getTime() < minTs;
              const active = iso === selectedIso;
              return (
                <Pressable
                  key={iso}
                  disabled={disabled}
                  onPress={() => {
                    onSelect(iso);
                    onClose();
                  }}
                  style={[styles.calCell, disabled && styles.calCellOff]}
                >
                  {/* Why: fixed circle inside cell — % width + borderRadius looked square */}
                  <View style={[styles.calDayCircle, active && styles.calDayCircleOn]}>
                    <AppText
                      variant="body"
                      color={active ? colors.white : disabled ? colors.textMuted : colors.textPrimary}
                      style={{ fontWeight: active ? '700' : '500', textAlign: 'center' }}
                    >
                      {day.getDate()}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Request leave — chip types, calendar dates, Full/Half day options, theme submit. */
export default function RequestLeaveScreen({ teacherToken, navigation }) {
  const today = useMemo(() => startOfToday(), []);
  const todayIso = useMemo(() => toIso(today), [today]);

  const [types, setTypes] = useState(FALLBACK_TYPES);
  const [balances, setBalances] = useState([]);
  const [leaveTypeId, setLeaveTypeId] = useState(FALLBACK_TYPES[0].id);
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);
  const [dayMode, setDayMode] = useState('FULL'); // FULL | HALF
  const [halfDaySession, setHalfDaySession] = useState('MORNING');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(null); // 'from' | 'to' | null
  const [keyboardPad, setKeyboardPad] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, b] = await Promise.all([
          fetchTeacherLeaveTypes(teacherToken),
          fetchTeacherLeaveBalances(teacherToken),
        ]);
        if (t?.length) {
          setTypes(t);
          setLeaveTypeId(t[0].id);
        }
        setBalances(b || []);
      } catch (e) {
        setError(e.message || 'Could not load leave types');
      }
    })();
  }, [teacherToken]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e) => {
      const height = e?.endCoordinates?.height || 0;
      // Why: keep description + submit above the keyboard (Android still clips slightly without this).
      setKeyboardPad(Math.max(0, height - (Platform.OS === 'ios' ? 12 : 0)));
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 60);
    };
    const onHide = () => setKeyboardPad(0);
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function focusReasonField() {
    setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 80);
  }

  async function submit() {
    if (!fromDate || !toDate) {
      setError('Please pick from and to dates');
      return;
    }
    if (toDate < fromDate) {
      setError('To date must be on or after from date');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createTeacherLeaveRequest(teacherToken, {
        leaveTypeId,
        fromDate,
        toDate: dayMode === 'HALF' ? fromDate : toDate || fromDate,
        halfDay: dayMode === 'HALF',
        halfDaySession: dayMode === 'HALF' ? halfDaySession : null,
        reason,
      });
      navigation.navigate('MyLeaves');
    } catch (e) {
      setError(e.message || 'Could not submit leave');
    } finally {
      setSaving(false);
    }
  }

  const fromMin = today;
  const toMin = parseIso(fromDate) || today;

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl * 2 + keyboardPad }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <AppText variant="heading" style={styles.title}>
        Request leave
      </AppText>

      <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
        Leave type
      </AppText>
      <View style={styles.row}>
        {types.map((t) => {
          const on = leaveTypeId === t.id;
          return (
            <Pressable
              key={t.id}
              style={[styles.typeChip, on && styles.typeChipOn]}
              onPress={() => setLeaveTypeId(t.id)}
            >
              <AppText variant="body" color={on ? colors.white : colors.textPrimary} style={styles.chipText}>
                {t.name}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {balances.length ? (
        <>
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            Balances
          </AppText>
          {balances.map((b) => (
            <AppText key={b.leaveTypeId} variant="body" color={colors.textPrimary}>
              {b.leaveTypeName}: {String(b.closing)}
            </AppText>
          ))}
        </>
      ) : null}

      <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
        From date (today only before school starts)
      </AppText>
      <Pressable style={styles.dateField} onPress={() => setPicker('from')}>
        <AppText variant="body" color={colors.textPrimary}>
          {fromDate || 'Pick date'}
        </AppText>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
      </Pressable>

      {dayMode === 'FULL' ? (
        <>
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            To date
          </AppText>
          <Pressable style={styles.dateField} onPress={() => setPicker('to')}>
            <AppText variant="body" color={colors.textPrimary}>
              {toDate || 'Pick date'}
            </AppText>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </Pressable>
        </>
      ) : null}

      <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
        Day option
      </AppText>
      <View style={styles.row}>
        {[
          { id: 'FULL', label: 'Full day' },
          { id: 'HALF', label: 'Half day' },
        ].map((opt) => {
          const on = dayMode === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.optionChip, on && styles.optionChipOn]}
              onPress={() => {
                setDayMode(opt.id);
                if (opt.id === 'HALF') setToDate(fromDate);
              }}
            >
              <AppText variant="body" color={on ? colors.white : colors.textPrimary} style={styles.chipText}>
                {opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {dayMode === 'HALF' ? (
        <>
          <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
            Half day session
          </AppText>
          <View style={styles.row}>
            {[
              { id: 'MORNING', label: 'Morning' },
              { id: 'AFTERNOON', label: 'Afternoon' },
            ].map((s) => {
              const on = halfDaySession === s.id;
              return (
                <Pressable
                  key={s.id}
                  style={[styles.optionChip, on && styles.optionChipOn]}
                  onPress={() => setHalfDaySession(s.id)}
                >
                  <AppText variant="body" color={on ? colors.white : colors.textPrimary} style={styles.chipText}>
                    {s.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
        Description for management
      </AppText>
      <TextInput
        style={[styles.input, styles.area]}
        value={reason}
        onChangeText={setReason}
        multiline
        placeholder="Why you need leave"
        placeholderTextColor={colors.textMuted}
        textAlignVertical="top"
        onFocus={focusReasonField}
      />

      {error ? (
        <AppText variant="body" color={colors.errorText}>
          {error}
        </AppText>
      ) : null}

      <Pressable
        style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
        disabled={saving}
        onPress={submit}
      >
        <AppText variant="button" color={colors.white} style={styles.submitText}>
          {saving ? 'Submitting…' : 'Submit leave'}
        </AppText>
      </Pressable>

      <DateCalendarModal
        visible={picker === 'from'}
        title="From date"
        value={fromDate}
        minDate={fromMin}
        onClose={() => setPicker(null)}
        onSelect={(iso) => {
          setFromDate(iso);
          if (!toDate || toDate < iso || dayMode === 'HALF') setToDate(iso);
        }}
      />
      <DateCalendarModal
        visible={picker === 'to'}
        title="To date"
        value={toDate}
        minDate={toMin}
        onClose={() => setPicker(null)}
        onSelect={setToDate}
      />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  title: { color: colors.textPrimary, marginBottom: spacing.xs },
  label: { marginTop: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 110,
    alignItems: 'center',
  },
  optionChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontWeight: '600' },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    color: colors.textPrimary,
    fontSize: 15,
  },
  area: { minHeight: 100, textAlignVertical: 'top' },
  submitBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.md,
    alignItems: 'center',
    ...shadows.card,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { fontWeight: '700', letterSpacing: 0.3 },
  calBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,27,61,0.45)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  calCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    ...shadows.card,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  calNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  calWeekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  calWeekDay: { width: `${100 / 7}%`, textAlign: 'center', fontWeight: '600' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayCircleOn: {
    backgroundColor: colors.primary,
  },
  calCellOff: { opacity: 0.35 },
});
