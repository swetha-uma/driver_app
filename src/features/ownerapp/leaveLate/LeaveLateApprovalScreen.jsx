import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import AppText from '../../../components/common/AppText';
import OwnerHeader from '../components/OwnerHeader';
import ApprovalCard from '../components/ApprovalCard';
import ApprovalDetail from '../components/ApprovalDetail';
import EmptyState from '../components/EmptyState';
import StatusDropdown from '../components/StatusDropdown';
import CalendarDatePicker from '../components/CalendarDatePicker';
import {
  approveOwnerLateRequest,
  approveOwnerLeaveRequest,
  fetchOwnerLateRequests,
  fetchOwnerLeaveRequests,
  rejectOwnerLateRequest,
  rejectOwnerLeaveRequest,
} from '../api/ownerApi';
import { matchesDateRange, matchesStatusFilter } from '../utils/ownerFilters';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

function formatDay(iso) {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildRows(leaves, lates) {
  const rows = [];
  (leaves || []).forEach((req) => {
    const from = formatDay(req.fromDate);
    const to = formatDay(req.toDate || req.fromDate);
    rows.push({
      id: `leave-${req.id}`,
      kind: 'leave',
      icon: 'document-text',
      title: `${req.staffName || 'Staff'} · ${req.leaveTypeName || 'Leave'}`,
      detailTitle: `${req.leaveTypeName || 'Leave'} request`,
      subtitle: from === to ? from : `${from} → ${to}`,
      reason: req.reason || '',
      decisionNote: req.decisionRemarks || '',
      status: String(req.status || 'PENDING').toUpperCase(),
      dateValue: req.fromDate,
      sourceId: req.id,
      staffInfo: { name: req.staffName, code: req.employeeCode, designation: req.designation },
      statCards: [
        { label: 'Leave taken this month', value: req.approvedThisMonthCount ?? 0 },
        { label: 'Remaining leave', value: req.remainingLeaveBalance ?? '—' },
      ],
      fields: [
        { label: 'Leave type', value: req.leaveTypeName },
        { label: 'From', value: from },
        { label: 'To', value: to },
      ],
    });
  });
  (lates || []).forEach((late) => {
    rows.push({
      id: `late-${late.id}`,
      kind: 'late',
      icon: 'time',
      title: `${late.staffName || 'Staff'} · Late reason`,
      detailTitle: 'Late reason',
      subtitle: formatDay(late.attendanceDate),
      reason: late.reason || '',
      decisionNote: late.decisionRemarks || '',
      status: String(late.status || 'PENDING').toUpperCase(),
      dateValue: late.attendanceDate,
      sourceId: late.id,
      staffInfo: { name: late.staffName, code: late.employeeCode, designation: late.designation },
      statCards: [
        { label: 'Late approved this month', value: late.approvedThisMonthCount ?? 0 },
        { label: 'Pending late requests', value: late.pendingCount ?? 0 },
      ],
      fields: [
        { label: 'Date', value: formatDay(late.attendanceDate) },
      ],
    });
  });
  rows.sort((a, b) => String(b.id).localeCompare(String(a.id)));
  return rows;
}

/** Owner screen — tap a Leave/Late request to see full details and Accept or Reject it. */
export default function LeaveLateApprovalScreen({ ownerToken, ownerName }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ from: null, to: null });
  const load = useCallback(async () => {
    if (!ownerToken) {
      setRows([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError('');
    try {
      const [leaves, lates] = await Promise.all([
        fetchOwnerLeaveRequests(ownerToken).catch(() => []),
        fetchOwnerLateRequests(ownerToken).catch(() => []),
      ]);
      const refreshedRows = buildRows(leaves, lates);
      setRows(refreshedRows);
      return refreshedRows;
    } catch (e) {
      setError(e.message || 'Could not load requests');
      return null;
    } finally {
      setLoading(false);
    }
  }, [ownerToken]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);

  const visible = useMemo(
    () => rows.filter((r) => matchesStatusFilter(r.status, statusFilter) && matchesDateRange(r.dateValue, dateFilter)),
    [rows, statusFilter, dateFilter],
  );

  // Why: once decided, keep showing the final status/reason on this same screen instead of
  // bouncing back to the list — and keep it visible even if a background refresh no longer
  // includes this row (e.g. salary structures drop out of the pending list once decided).
  const [decidedOverride, setDecidedOverride] = useState(null);

  const act = useCallback(
    async (row, action, remarks) => {
      setBusy(true);
      setError('');
      try {
        if (row.kind === 'leave') {
          if (action === 'approve') await approveOwnerLeaveRequest(ownerToken, row.sourceId, remarks);
          else await rejectOwnerLeaveRequest(ownerToken, row.sourceId, remarks);
        } else if (action === 'approve') {
          await approveOwnerLateRequest(ownerToken, row.sourceId, remarks);
        } else {
          await rejectOwnerLateRequest(ownerToken, row.sourceId, remarks);
        }
        const finalStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
        const refreshedRows = await load();
        const refreshedRequest = refreshedRows?.find((item) => item.id === row.id);
        setDecidedOverride({
          ...(refreshedRequest || row),
          status: refreshedRequest?.status || finalStatus,
          decisionNote: refreshedRequest?.decisionNote || '',
        });
      } catch (e) {
        setError(e.message || 'Could not update request');
      } finally {
        setBusy(false);
      }
    },
    [ownerToken, load],
  );

  const displayed = decidedOverride?.id === selectedId ? decidedOverride : selected;

  if (displayed) {
    return (
      <ApprovalDetail
        icon={displayed.icon}
        title={displayed.detailTitle || displayed.title}
        subtitle={displayed.subtitle}
        status={displayed.status}
        staffInfo={displayed.staffInfo}
        statCards={displayed.statCards}
        fields={displayed.fields}
        reason={displayed.reason}
        decisionNote={displayed.decisionNote}
        error={error}
        busy={busy}
        // Why: backend only enforces a 10-char minimum on Leave rejections (RejectLeaveRequestDTO),
        // not Late — catch that client-side so the request never round-trips just to fail validation.
        rejectMinLength={displayed.kind === 'leave' ? 10 : 1}
        onApprove={() => act(displayed, 'approve')}
        onReject={(remarks) => act(displayed, 'reject', remarks)}
        onBack={() => {
          setError('');
          setDecidedOverride(null);
          setSelectedId(null);
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <OwnerHeader icon="checkbox-outline" title="Leave & Late" ownerName={ownerName} subtitle="Owner" />
      <View style={styles.filterRow}>
        <CalendarDatePicker value={dateFilter} onChange={setDateFilter} />
        <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppText variant="body" color={colors.errorText} style={{ textAlign: 'center' }}>
            {error}
          </AppText>
        </View>
      ) : !visible.length ? (
        <ScrollView
          contentContainerStyle={styles.emptyWrap}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        >
          <EmptyState
            icon="checkbox-outline"
            message={
              rows.length
                ? 'No requests match these filters.'
                : 'There are no pending leave or late requests right now.'
            }
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        >
          {visible.map((row) => (
            <ApprovalCard
              key={row.id}
              icon={row.icon}
              title={row.title}
              subtitle={row.subtitle}
              status={row.status}
              onPress={() => {
                setError('');
                setDecidedOverride(null);
                setSelectedId(row.id);
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.md },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flexGrow: 1 },
});
