import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../../components/common/AppText';
import { fetchTeacherLatePending, fetchTeacherLeaveRequests } from '../api/teacherApi';
import { formatLateDuration } from '../utils/formatLateDuration';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'late', label: 'Late reason' },
  { id: 'approved', label: 'Approved' },
  { id: 'request', label: 'Leave request' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
];

const STATUS_TONE = {
  APPROVED: { bg: colors.successBg, text: colors.successText, label: 'Approved' },
  PENDING: { bg: colors.warningBg, text: colors.warningText, label: 'Pending' },
  REJECTED: { bg: colors.errorBg, text: colors.errorText, label: 'Rejected' },
  SUBMITTED: { bg: colors.infoBg, text: colors.infoText, label: 'Submitted' },
  CANCELLED: { bg: colors.neutralBg, text: colors.neutralText, label: 'Cancelled' },
};

function formatDay(iso) { // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function leaveFilter(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'APPROVED') return 'approved';
  if (s === 'REJECTED') return 'rejected';
  if (s === 'CANCELLED') return 'cancelled';
  return 'request';
}

function leaveTitle(item) {
  const name = item.leaveTypeName || 'Leave';
  const s = String(item.status || '').toUpperCase();
  if (s === 'APPROVED') return `${name} approved`;
  if (s === 'REJECTED') return `${name} rejected`;
  if (s === 'CANCELLED') return `${name} cancelled`;
  return `${name} request`;
}

function leaveSubtitle(item) {
  const from = formatDay(item.fromDate);
  const to = formatDay(item.toDate || item.fromDate);
  const range = from === to ? from : `${from} → ${to}`;
  if (item.halfDay) {
    const session = String(item.halfDaySession || 'MORNING').toLowerCase();
    return `${range} · Half day ${session}`;
  }
  const days = item.totalDays != null ? ` · ${item.totalDays} day${Number(item.totalDays) === 1 ? '' : 's'}` : '';
  return `${range}${days}`;
}

function noticeSortKey(item) {
  // Prefer created/approved timestamps, then leave/attendance date, then id.
  const stamp = item.sortAt || item.date || '';
  const idPart = String(item.leaveId || item.id || '');
  return `${stamp}|${idPart}`;
}

/** Build notice rows from this staff member's leave + late APIs only. */
function buildNoticeItems(leaveRequests, latePending) {
  const items = [];

  if (latePending?.pending) {
    items.push({
      id: `late-pending-${latePending.attendanceDate || 'today'}`,
      kind: 'late',
      filter: 'late',
      title: 'Late reason pending',
      subtitle: latePending.entryTime
        ? `Entered ${latePending.entryTime}${
            formatLateDuration(latePending.lateMinutes)
              ? ` · Late by ${formatLateDuration(latePending.lateMinutes)}`
              : ''
          }`
        : 'Please submit why you were late',
      body: '',
      status: 'PENDING',
      date: latePending.attendanceDate || '',
      sortAt: latePending.attendanceDate || new Date().toISOString(),
      openLate: true,
    });
  } else if (latePending?.existingReason && latePending?.attendanceDate) {
    items.push({
      id: `late-done-${latePending.attendanceDate}`,
      kind: 'late',
      filter: 'late',
      title: `Late reason — ${formatDay(latePending.attendanceDate)}`,
      subtitle: latePending.entryTime
        ? `Entered ${latePending.entryTime}${
            formatLateDuration(latePending.lateMinutes)
              ? ` · Late by ${formatLateDuration(latePending.lateMinutes)}`
              : ''
          }`
        : 'Submitted',
      body: latePending.existingReason,
      status: 'SUBMITTED',
      date: latePending.attendanceDate,
      sortAt: latePending.attendanceDate,
      openLate: false,
    });
  }

  (leaveRequests || []).forEach((req) => {
    items.push({
      id: `leave-${req.id}`,
      kind: 'leave',
      leaveId: req.id,
      filter: leaveFilter(req.status),
      title: leaveTitle(req),
      subtitle: leaveSubtitle(req),
      body: [
        req.reason,
        req.approverRemarks
          ? `${String(req.status).toUpperCase() === 'CANCELLED' ? 'Cancel reason' : 'Remark'}: ${req.approverRemarks}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      status: String(req.status || 'PENDING').toUpperCase(),
      date: req.fromDate || '',
      // Why: Notice must list newest activity first (approve/create), not leave-from date alone.
      sortAt: req.approvedAt || req.createdAt || req.fromDate || '',
      openLate: false,
    });
  });

  items.sort((a, b) => noticeSortKey(b).localeCompare(noticeSortKey(a)));
  return items;
}

/** Parent Notices-style detail for one leave/late item. */
function LeaveMessageDetail({ item, staffName, designation, onBack, onOpenLate }) {
  const tone = STATUS_TONE[item.status] || STATUS_TONE.PENDING;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[colors.heroTop, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} style={styles.backWhite}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Ionicons name="notifications-outline" size={26} color={colors.white} />
          <AppText variant="heading" color={colors.white}>
            Notice
          </AppText>
        </View>
        <View style={styles.staffCard}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.primary}>
              {(staffName || 'S').charAt(0)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" color={colors.white}>
              {staffName || 'Staff'}
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {designation || 'Staff'}
            </AppText>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.detailCard}>
        <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
          <AppText variant="caption" style={{ color: tone.text, fontWeight: '700' }}>
            {tone.label}
          </AppText>
        </View>
        <AppText variant="heading" style={styles.detailTitle}>
          {item.title}
        </AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {item.subtitle}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
          {item.date}
        </AppText>
        <View style={styles.messageBox}>
          <AppText variant="subtitle" style={styles.messageText}>
            {item.body || (item.openLate ? 'Tap below to submit your late reason.' : 'No description added.')}
          </AppText>
        </View>
        {item.openLate ? (
          <Pressable style={styles.lateCta} onPress={onOpenLate}>
            <AppText variant="button" color={colors.white}>
              Submit late reason
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** Notice hub — live leave requests + late reason for this staff only. */
export default function MyLeavesScreen({ teacherToken, staffName, designation, navigation }) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!teacherToken) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [leaves, late] = await Promise.all([
        fetchTeacherLeaveRequests(teacherToken).catch(() => []),
        fetchTeacherLatePending(teacherToken).catch(() => null),
      ]);
      setItems(buildNoticeItems(Array.isArray(leaves) ? leaves : [], late));
    } catch (e) {
      setError(e.message || 'Could not load notices');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [teacherToken]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.filter === filter);
  }, [filter, items]);

  if (selected) {
    return (
      <LeaveMessageDetail
        item={selected}
        staffName={staffName}
        designation={designation}
        onBack={() => setSelected(null)}
        onOpenLate={() => {
          setSelected(null);
          navigation.navigate('LateReason');
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[colors.heroTop, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Ionicons name="notifications-outline" size={28} color={colors.white} />
          <AppText variant="heading" color={colors.white} style={{ flex: 1 }}>
            Notice
          </AppText>
        </View>
        <View style={styles.staffCard}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.primary}>
              {(staffName || 'S').charAt(0)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" color={colors.white}>
              {staffName || 'Staff'}
            </AppText>
            <AppText variant="caption" color={colors.onPrimaryMuted}>
              {designation || 'Staff'}
            </AppText>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={[styles.filter, active && styles.filterActive]}
              >
                <AppText
                  variant="body"
                  color={active ? colors.white : colors.textPrimary}
                  style={styles.filterText}
                >
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        >
          {error ? (
            <AppText variant="body" color={colors.errorText} style={{ textAlign: 'center' }}>
              {error}
            </AppText>
          ) : null}
          {rows.map((item) => (
            <Pressable
              key={item.id}
              style={styles.card}
              onPress={() => {
                if (item.openLate) {
                  navigation.navigate('LateReason');
                  return;
                }
                if (item.kind === 'leave' && item.leaveId) {
                  navigation.navigate('LeaveDetail', { id: item.leaveId });
                  return;
                }
                setSelected(item);
              }}
            >
              <View style={styles.cardIcon}>
                <Ionicons
                  name={
                    item.filter === 'late'
                      ? 'time'
                      : item.filter === 'approved'
                        ? 'checkmark-circle'
                        : item.filter === 'rejected'
                          ? 'close-circle'
                          : item.filter === 'cancelled'
                            ? 'ban'
                            : 'document-text'
                  }
                  size={22}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {item.title}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {item.subtitle}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
          {!rows.length && !error ? (
            <AppText
              variant="body"
              color={colors.textSecondary}
              style={{ textAlign: 'center', marginTop: 40 }}
            >
              No notices for you yet
            </AppText>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  detailContent: { paddingBottom: spacing.xl, gap: spacing.md },
  header: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.hero,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backWhite: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.heroBadge,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  filterWrap: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  filters: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: { fontWeight: '600' },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    ...shadows.card,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  detailCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    ...shadows.card,
    gap: spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  detailTitle: { color: colors.textPrimary },
  messageBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.canvas,
  },
  messageText: { color: colors.textPrimary, lineHeight: 22 },
  lateCta: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
});
