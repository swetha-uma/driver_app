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
  approveOwnerScholarshipRequest,
  fetchOwnerScholarshipRequests,
  rejectOwnerScholarshipRequest,
} from '../api/ownerApi';
import { matchesDateRange, matchesStatusFilter } from '../utils/ownerFilters';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

function formatMoney(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatHistoryDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildRows(requests) {
  return (requests || [])
    .map((req) => ({
      id: `scholarship-${req.id}`,
      icon: 'school',
      title: `${req.studentName || 'Student'} · ${req.schemeName || 'Scholarship'}`,
      detailTitle: `${req.schemeName || 'Scholarship'} request`,
      subtitle: `${req.className ? req.className + ' · ' : ''}${formatMoney(req.discountAmount)}`,
      reason: req.reason || '',
      decisionNote: req.decisionRemarks || '',
      status: String(req.status || 'PENDING').toUpperCase(),
      dateValue: req.createdAt,
      sourceId: req.id,
      staffInfo: { name: req.studentName, code: req.className },
      statCards: [
        { label: 'Already applied scholarships', value: (req.otherRequestsForStudent || []).length },
      ],
      otherRequests: req.otherRequestsForStudent || [],
      fields: [
        { label: 'Scheme', value: req.schemeName },
        { label: 'Discount amount', value: formatMoney(req.discountAmount) },
      ],
    }))
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

/** Owner screen — tap a scholarship / fee-discount request to see details and decide. */
export default function ScholarshipApprovalScreen({ ownerToken, ownerName, pushTarget, onPushTargetHandled }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ from: null, to: null });

  // Why: `silent` is used for the background refresh right after Approve/Reject — it must
  // update `rows` without flashing the full-screen spinner over the list.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!ownerToken) {
      setRows([]);
      setLoading(false);
      return [];
    }
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const requests = await fetchOwnerScholarshipRequests(ownerToken).catch(() => []);
      const refreshedRows = buildRows(requests);
      setRows(refreshedRows);
      return refreshedRows;
    } catch (e) {
      if (!silent) setError(e.message || 'Could not load requests');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ownerToken]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading || !pushTarget || pushTarget.tab !== 'scholarship') return;
    const match = rows.find((row) => row.id === `scholarship-${pushTarget.requestId}`);
    if (match) {
      setStatusFilter('all');
      setDateFilter({ from: null, to: null });
      setSelectedId(match.id);
      setError('');
      setDecidedOverride(null);
    }
    onPushTargetHandled?.();
  }, [loading, rows, pushTarget, onPushTargetHandled]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);

  const visible = useMemo(
    () => rows.filter((r) => matchesStatusFilter(r.status, statusFilter) && matchesDateRange(r.dateValue, dateFilter)),
    [rows, statusFilter, dateFilter],
  );

  // Why: once decided, keep showing the final status/reason on this same screen instead of
  // bouncing back to the list.
  const [decidedOverride, setDecidedOverride] = useState(null);
  const displayed = decidedOverride?.id === selectedId ? decidedOverride : selected;

  const act = useCallback(
    async (row, action, remarks) => {
      // Why: a fast double-tap on Approve/Reject must not fire the request twice
      if (busy) return;
      setBusy(true);
      setError('');
      const finalStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
      try {
        if (action === 'approve') await approveOwnerScholarshipRequest(ownerToken, row.sourceId);
        else await rejectOwnerScholarshipRequest(ownerToken, row.sourceId, remarks);
        // Why: reflect the new status immediately — don't make the user wait for the
        // background refetch round-trip just to see the button state change.
        setDecidedOverride({
          ...row,
          status: finalStatus,
          decisionNote: action === 'reject' ? remarks : row.decisionNote,
        });
        const refreshedRows = await load({ silent: true });
        const refreshedRequest = refreshedRows?.find((item) => item.id === row.id);
        if (refreshedRequest) {
          // Why: the action we just performed is authoritative — never let a possibly-stale
          // refetch downgrade the status back to PENDING. Only pull supplementary fields
          // (like the decision note) from the fresh data.
          setDecidedOverride({
            ...refreshedRequest,
            status: finalStatus,
            decisionNote: refreshedRequest.decisionNote || (action === 'reject' ? remarks : row.decisionNote) || '',
          });
        }
      } catch (e) {
        setError(e.message || 'Could not update request');
      } finally {
        setBusy(false);
      }
    },
    [ownerToken, load, busy],
  );

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
        onApprove={() => act(displayed, 'approve')}
        onReject={(remarks) => act(displayed, 'reject', remarks)}
        onBack={() => {
          setError('');
          setDecidedOverride(null);
          setSelectedId(null);
        }}
      >
        {displayed.otherRequests.length ? (
          <View style={styles.historyCard}>
            <AppText variant="label">Already applied for this student</AppText>
            {displayed.otherRequests.map((item, idx) => (
              <View key={idx} style={[styles.historyRow, idx === displayed.otherRequests.length - 1 && styles.historyRowLast]}>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" style={{ fontWeight: '700' }}>{item.schemeName || 'Scholarship'}</AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {[item.termScope, formatHistoryDate(item.createdAt)].filter(Boolean).join(' · ')}
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="body" style={{ fontWeight: '700' }}>{formatMoney(item.discountAmount)}</AppText>
                  <AppText variant="caption" color={colors.textSecondary}>{item.status}</AppText>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ApprovalDetail>
    );
  }

  return (
    <View style={styles.screen}>
      <OwnerHeader icon="school-outline" title="Scholarship" ownerName={ownerName} subtitle="Owner" />
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
            icon="school-outline"
            message={
              rows.length
                ? 'No requests match these filters.'
                : 'There are no pending scholarship requests right now.'
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
  historyCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyRowLast: { borderBottomWidth: 0 },
});
