import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
import OwnerHeader from '../components/OwnerHeader';
import FilterTabs from '../components/FilterTabs';
import EmptyState from '../components/EmptyState';
import { fetchOwnerNotificationInbox, markOwnerNotificationRead } from '../api/ownerApi';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'leave', label: 'Leave/Late' },
  { id: 'salary', label: 'Salary' },
  { id: 'scholarship', label: 'Scholarship' },
  { id: 'unread', label: 'Unread' },
];

const TYPE_ICON = {
  LEAVE_REQUEST_SUBMITTED: 'document-text',
  LATE_REQUEST_SUBMITTED: 'time',
  ADVANCE_REQUEST_SUBMITTED: 'wallet',
  SALARY_RUN_READY: 'cash',
  SCHOLARSHIP_REQUEST_SUBMITTED: 'school',
};

function filterFor(type) {
  const t = String(type || '').toUpperCase();
  if (t.includes('LEAVE') || t.includes('LATE')) return 'leave';
  if (t.includes('SALARY') || t.includes('ADVANCE')) return 'salary';
  if (t.includes('SCHOLARSHIP')) return 'scholarship';
  return 'all';
}

function timeAgo(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Owner's Notices hub — every leave/late/advance/scholarship request raised for Owner to act on.
 * Only request-creation events land here; Owner's own approve/reject never creates a notice.
 */
export default function OwnerNoticesScreen({ ownerToken, ownerName }) {
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!ownerToken) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const inbox = await fetchOwnerNotificationInbox(ownerToken).catch(() => []);
      const list = (Array.isArray(inbox) ? inbox : []).map((row) => ({
        id: row.notificationId,
        icon: TYPE_ICON[String(row.type || '').toUpperCase()] || 'notifications',
        title: row.title || 'Notification',
        body: row.body || '',
        filter: filterFor(row.type),
        read: String(row.status || '').toUpperCase() === 'READ',
        createdAt: row.createdAt,
      }));
      list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      setRows(list);
    } catch (e) {
      setError(e.message || 'Could not load notices');
    } finally {
      setLoading(false);
    }
  }, [ownerToken]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback(
    async (row) => {
      if (row.read) return;
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, read: true } : r)));
      try {
        await markOwnerNotificationRead(ownerToken, row.id);
      } catch {
        // Why: keep it marked read locally even if the server call is slow/offline
      }
    },
    [ownerToken],
  );

  const visible = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'unread') return rows.filter((r) => !r.read);
    return rows.filter((r) => r.filter === filter);
  }, [filter, rows]);

  return (
    <View style={styles.screen}>
      <OwnerHeader icon="notifications-outline" title="Notices" ownerName={ownerName} subtitle="Owner" />
      <FilterTabs options={FILTERS} value={filter} onChange={setFilter} />

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
            icon="notifications-outline"
            message={
              filter === 'unread'
                ? 'You have no unread notices.'
                : 'You have no notices right now.'
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
            <Pressable key={row.id} style={styles.card} onPress={() => markRead(row)}>
              <View style={styles.iconWrap}>
                <Ionicons name={row.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body" style={{ fontWeight: row.read ? '400' : '700' }}>
                  {row.title}
                </AppText>
                {row.body ? (
                  <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
                    {row.body}
                  </AppText>
                ) : null}
                <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {timeAgo(row.createdAt)}
                </AppText>
              </View>
              {!row.read ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    ...shadows.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondary,
  },
});
