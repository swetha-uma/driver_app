import { useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
import AppButton from '../../../components/common/AppButton';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const PANEL_WIDTH = 300;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toIsoDay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startWeekday);
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    days.push(date);
  }
  return days;
}

function formatShort(date) {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * From/To date-range picker, opened anchored right below itself (not a bottom sheet).
 * First tap picks "From"; the next tap picks "To". Future dates (after today) are disabled,
 * and once "From" is picked, days before it are disabled while choosing "To".
 * `value` is {from, to} as ISO "yyyy-mm-dd" strings or nulls; `onChange` receives the same shape.
 */
export default function CalendarDatePicker({ value, onChange }) {
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const fieldRef = useRef(null);

  const committedFrom = value?.from ? new Date(`${value.from}T00:00:00`) : null;
  const committedTo = value?.to ? new Date(`${value.to}T00:00:00`) : null;

  const [draftFrom, setDraftFrom] = useState(committedFrom);
  const [draftTo, setDraftTo] = useState(committedTo);
  const [viewDate, setViewDate] = useState(committedFrom || new Date());

  const today = startOfDay(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = buildMonthGrid(year, month);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const open = () => {
    setDraftFrom(committedFrom);
    setDraftTo(committedTo);
    setViewDate(committedFrom || new Date());
    fieldRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      const margin = spacing.md;
      // Why: clamp so the panel never overflows past the right (or left) edge of the screen
      const clampedX = Math.min(Math.max(x, margin), screenWidth - PANEL_WIDTH - margin);
      setAnchor({ x: clampedX, y: y + height, width });
      setVisible(true);
    });
  };

  const close = () => setVisible(false);

  const handleDayPress = (date) => {
    if (date > today) return; // Why: future dates are never selectable
    if (!draftFrom || (draftFrom && draftTo)) {
      // Why: nothing picked yet, or a full range was already picked — start a new range
      setDraftFrom(date);
      setDraftTo(null);
      return;
    }
    // Picking "To": days before "From" are disabled
    if (date < draftFrom) return;
    setDraftTo(date);
  };

  const applyRange = () => {
    onChange({
      from: draftFrom ? toIsoDay(draftFrom) : null,
      to: draftTo ? toIsoDay(draftTo) : (draftFrom ? toIsoDay(draftFrom) : null),
    });
    close();
  };

  const clearRange = () => {
    setDraftFrom(null);
    setDraftTo(null);
    onChange({ from: null, to: null });
    close();
  };

  const label = committedFrom
    ? committedTo && !isSameDay(committedFrom, committedTo)
      ? `${formatShort(committedFrom)} – ${formatShort(committedTo)}`
      : formatShort(committedFrom)
    : 'All dates';

  return (
    <>
      <Pressable ref={fieldRef} style={styles.field} onPress={open}>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
        <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>{label}</AppText>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close}>
          {anchor ? (
            <Pressable
              style={[styles.panel, { top: anchor.y, left: anchor.x }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.rangeRow}>
                <View style={[styles.rangeChip, !draftTo && styles.rangeChipActive]}>
                  <AppText variant="caption" color={colors.textSecondary}>From</AppText>
                  <AppText variant="body" style={{ fontWeight: '700' }}>
                    {draftFrom ? formatShort(draftFrom) : 'Select'}
                  </AppText>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
                <View style={[styles.rangeChip, draftFrom && !draftTo && styles.rangeChipActive]}>
                  <AppText variant="caption" color={colors.textSecondary}>To</AppText>
                  <AppText variant="body" style={{ fontWeight: '700' }}>
                    {draftTo ? formatShort(draftTo) : 'Select'}
                  </AppText>
                </View>
              </View>

              <View style={styles.monthRow}>
                <Pressable onPress={() => setViewDate(new Date(year, month - 1, 1))} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={20} color={colors.primary} />
                </Pressable>
                <AppText variant="title" style={{ flex: 1, textAlign: 'center' }}>
                  {MONTH_NAMES[month]} {year}
                </AppText>
                <Pressable
                  onPress={() => !isCurrentMonth && setViewDate(new Date(year, month + 1, 1))}
                  style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]}
                  disabled={isCurrentMonth}
                >
                  <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.border : colors.primary} />
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {WEEKDAYS.map((w, i) => (
                  <AppText key={`${w}-${i}`} variant="caption" color={colors.textSecondary} style={styles.weekCell}>
                    {w}
                  </AppText>
                ))}
              </View>

              {Array.from({ length: 6 }).map((_, week) => (
                <View key={week} style={styles.weekRow}>
                  {days.slice(week * 7, week * 7 + 7).map((date) => {
                    const inMonth = date.getMonth() === month;
                    const isFuture = date > today;
                    const isTooEarly = draftFrom && !draftTo && date < draftFrom;
                    const disabled = isFuture || isTooEarly;
                    const isToday = isSameDay(date, today);
                    const isFromSelected = draftFrom && isSameDay(date, draftFrom);
                    const isToSelected = draftTo && isSameDay(date, draftTo);
                    const inRange = draftFrom && draftTo && date > draftFrom && date < draftTo;
                    return (
                      <Pressable
                        key={date.toISOString()}
                        style={[
                          styles.dayCell,
                          inRange && styles.dayCellInRange,
                          (isFromSelected || isToSelected) && styles.dayCellSelected,
                        ]}
                        disabled={disabled}
                        onPress={() => handleDayPress(date)}
                      >
                        <AppText
                          variant="body"
                          color={
                            disabled
                              ? colors.border
                              : isFromSelected || isToSelected
                                ? colors.white
                                : inMonth
                                  ? colors.textPrimary
                                  : colors.textSecondary
                          }
                          style={isToday && !isFromSelected && !isToSelected ? styles.todayText : null}
                        >
                          {date.getDate()}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              ))}

              <View style={styles.footerRow}>
                <AppButton title="Clear" variant="outline" onPress={clearRange} style={{ flex: 1 }} />
                <AppButton title="Apply" variant="primary" onPress={applyRange} disabled={!draftFrom} style={{ flex: 1 }} />
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  panel: {
    position: 'absolute',
    marginTop: spacing.xs,
    width: PANEL_WIDTH,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadows.hero,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rangeChip: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.canvas,
  },
  rangeChipActive: { backgroundColor: colors.primarySoft },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  navBtnDisabled: { backgroundColor: colors.canvas },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, textAlign: 'center', fontWeight: '700', paddingVertical: spacing.xs },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellInRange: { backgroundColor: colors.primarySoft },
  dayCellSelected: { backgroundColor: colors.primary, borderRadius: radii.pill },
  todayText: { fontWeight: '700', color: colors.primary },
  footerRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
