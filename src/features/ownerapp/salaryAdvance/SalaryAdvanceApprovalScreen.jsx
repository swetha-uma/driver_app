import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import AppText from '../../../components/common/AppText';
import OwnerHeader from '../components/OwnerHeader';
import ApprovalCard from '../components/ApprovalCard';
import ApprovalDetail from '../components/ApprovalDetail';
import EmptyState from '../components/EmptyState';
import StatusDropdown from '../components/StatusDropdown';
import CalendarDatePicker from '../components/CalendarDatePicker';
import StaffSalaryList from '../components/StaffSalaryList';
import {
  approveOwnerAdvanceRequest,
  approveOwnerSalaryStructure,
  fetchOwnerAdvanceRequests,
  fetchOwnerSalaryStructureDetail,
  fetchOwnerSalaryStructures,
  rejectOwnerSalaryStructure,
} from '../api/ownerApi';
import { matchesDateRange, matchesStatusFilter } from '../utils/ownerFilters';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

function formatMoney(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatDay(iso) {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildRows(advances, structures) {
  const rows = [];
  (advances || []).forEach((adv) => {
    rows.push({
      id: `advance-${adv.id}`,
      kind: 'advance',
      icon: 'wallet',
      title: `${adv.staffName || 'Staff'} · Advance`,
      detailTitle: 'Salary advance request',
      subtitle: formatMoney(adv.amount),
      reason: adv.reason || '',
      status: String(adv.status || 'PENDING').toUpperCase(),
      dateValue: adv.requestDate,
      sourceId: adv.id,
      staffInfo: { name: adv.staffName, code: adv.employeeCode, designation: adv.designation },
      fields: [
        { label: 'Amount', value: formatMoney(adv.amount) },
      ],
    });
  });
  (structures || []).forEach((s) => {
    rows.push({
      id: `salary-${s.id}`,
      kind: 'salary',
      icon: 'cash',
      title: `${s.employeeName || 'Staff'} · Salary set`,
      detailTitle: 'Salary approval',
      subtitle: `Effective ${formatDay(s.effectiveFrom)}`,
      reason: '',
      // Why: this list only ever contains PENDING_APPROVAL rows (owner-app calls listPending) — normalize
      // to PENDING so the shared ApprovalCard/ApprovalDetail status handling shows Approve/Reject.
      status: 'PENDING',
      dateValue: s.effectiveFrom,
      sourceId: s.id,
      staffInfo: { name: s.employeeName, code: s.employeeCode, designation: s.designation },
      fields: [
        { label: 'Effective from', value: formatDay(s.effectiveFrom) },
      ],
    });
  });
  rows.sort((a, b) => String(b.id).localeCompare(String(a.id)));
  return rows;
}

/** Owner screen — Salary (a staff/teacher's salary set or updated) and Salary Advance approvals. */
export default function SalaryAdvanceApprovalScreen({ ownerToken, ownerName }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [structureDetail, setStructureDetail] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);
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
      const [advances, structures] = await Promise.all([
        fetchOwnerAdvanceRequests(ownerToken).catch(() => []),
        fetchOwnerSalaryStructures(ownerToken).catch(() => []),
      ]);
      const refreshedRows = buildRows(advances, structures);
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

  // Why: once decided, keep showing the final status on this same screen instead of bouncing
  // back to the list — and keep it visible even if a background refresh drops this row from
  // the pending list (salary structures only ever list PENDING_APPROVAL rows).
  const [decidedOverride, setDecidedOverride] = useState(null);
  const displayed = decidedOverride?.id === selectedId ? decidedOverride : selected;

  useEffect(() => {
    if (!displayed || displayed.kind !== 'salary') {
      setStructureDetail(null);
      return;
    }
    let cancelled = false;
    setStructureLoading(true);
    fetchOwnerSalaryStructureDetail(ownerToken, displayed.sourceId)
      .then((detail) => {
        if (!cancelled) setStructureDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setStructureDetail(null);
      })
      .finally(() => {
        if (!cancelled) setStructureLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [displayed, ownerToken]);

  const act = useCallback(
    async (row, action, remarks) => {
      setBusy(true);
      setError('');
      try {
        if (row.kind === 'advance' && action === 'approve') {
          await approveOwnerAdvanceRequest(ownerToken, row.sourceId);
        } else if (row.kind === 'salary') {
          if (action === 'approve') await approveOwnerSalaryStructure(ownerToken, row.sourceId);
          else await rejectOwnerSalaryStructure(ownerToken, row.sourceId, remarks);
        }
        const finalStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
        const refreshedRows = await load();
        const refreshedRequest = refreshedRows?.find((item) => item.id === row.id);
        setDecidedOverride({
          ...(refreshedRequest || row),
          status: refreshedRequest?.status || finalStatus,
        });
      } catch (e) {
        setError(e.message || 'Could not update request');
      } finally {
        setBusy(false);
      }
    },
    [ownerToken, load],
  );

  if (displayed) {
    const decisionNote = displayed.kind === 'salary' && displayed.status === 'REJECTED'
      ? structureDetail?.remarks
      : undefined;
    return (
      <ApprovalDetail
        icon={displayed.icon}
        title={displayed.detailTitle || displayed.title}
        subtitle={displayed.subtitle}
        status={displayed.status}
        staffInfo={displayed.staffInfo}
        fields={displayed.fields}
        reason={displayed.reason}
        decisionNote={decisionNote}
        error={error}
        busy={busy}
        onApprove={() => act(displayed, 'approve')}
        onReject={displayed.kind === 'salary' ? (remarks) => act(displayed, 'reject', remarks) : undefined}
        onBack={() => {
          setError('');
          setDecidedOverride(null);
          setSelectedId(null);
        }}
      >
        {displayed.kind === 'salary' ? (
          <>
            {!structureLoading && structureDetail?.beforeLines?.length ? (
              <StaffSalaryList
                title="Current salary (before this change)"
                lines={structureDetail.beforeLines}
                totalGross={structureDetail.beforeTotalGross}
              />
            ) : null}
            <StaffSalaryList
              title="Requested salary"
              lines={structureDetail?.lines}
              totalGross={structureDetail?.totalGross}
              loading={structureLoading}
            />
          </>
        ) : null}
      </ApprovalDetail>
    );
  }

  return (
    <View style={styles.screen}>
      <OwnerHeader icon="cash-outline" title="Salary & Advance" ownerName={ownerName} subtitle="Owner" />
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
            icon="cash-outline"
            message={
              rows.length
                ? 'No requests match these filters.'
                : 'There are no pending salary or advance requests right now.'
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
