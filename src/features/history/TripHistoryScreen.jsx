import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../components/common/AppText';
import { loadDriverCompletedTripHistory } from '../../services/historyApi';
import { colors } from '../../theme/colors';
import { formatTripDateLabel } from '../../utils/formatTripDate';
import styles from './TripHistoryScreen.styles';

function statusTone(status) {
  // Why: completed history rows get a green badge
  if (status === 'Completed') {
    return { bg: colors.successBg, text: colors.successText, icon: 'checkmark-circle' };
  }
  // Why: defensive — History API should only send Completed
  if (status === 'In Progress') {
    return { bg: colors.warningBg, text: colors.warningText, icon: 'time' };
  }
  return { bg: colors.infoBg, text: colors.infoText, icon: 'calendar-outline' };
}

/** One completed trip in the week list. */
function HistoryTripCard({ trip }) {
  const tone = statusTone(trip.status);
  // Why: Drop uses a down-arrow icon; Pickup uses up
  const isDrop = trip.tripType === 'Drop';
  // Why: show Today / Yesterday / weekday label from the trip date
  const dateLabel = formatTripDateLabel(trip.tripDate);

  // Why: Phase 1 has no actual times — fall back to scheduled route times
  const timeLabel = trip.actualStartTime
    ? `${trip.actualStartTime}${trip.actualEndTime ? ` – ${trip.actualEndTime}` : ''}`
    : `${trip.scheduledStartTime || '--:--'} – ${trip.scheduledEndTime || '--:--'}`;

  return (
    <View style={styles.tripCard}>
      <View style={styles.tripCardHeader}>
        <View style={styles.typeBadge}>
          <Ionicons
            name={isDrop ? 'arrow-down-circle' : 'arrow-up-circle'}
            size={18}
            color={colors.primary}
          />
          <AppText variant="caption" color={colors.primary} style={styles.typeText}>
            {trip.tripType}
          </AppText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
          <Ionicons name={tone.icon} size={14} color={tone.text} />
          <AppText variant="caption" color={tone.text} style={styles.statusText}>
            {trip.status}
          </AppText>
        </View>
      </View>

      <AppText variant="title" style={styles.routeName}>
        {trip.routeName}
      </AppText>

      <View style={styles.detailRow}>
        <Ionicons name="bus-outline" size={16} color={colors.textSecondary} />
        <AppText variant="body" color={colors.textSecondary} style={styles.detailText}>
          {trip.vehicleName}
        </AppText>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
        <AppText variant="body" color={colors.textSecondary} style={styles.detailText}>
          {dateLabel}
        </AppText>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
        <AppText variant="body" color={colors.textSecondary} style={styles.detailText}>
          {timeLabel}
        </AppText>
      </View>
    </View>
  );
}

/**
 * History tab: completed trips for the last 7 school days (including today).
 * Data from GET /api/v1/driver-app/history.
 */
export default function TripHistoryScreen({ driverToken }) {
  // Why: block the list until the first history JSON arrives
  const [loading, setLoading] = useState(true);
  // Why: show retry UI when the school server rejects the call
  const [error, setError] = useState('');
  // Why: today + week chips from history.totals
  const [totals, setTotals] = useState({
    todayCompleted: 0,
    todayTotal: 0,
    weekCompleted: 0,
  });
  // Why: completed trip cards newest-first from history.trips
  const [trips, setTrips] = useState([]);
  // Why: header subtitle can show the window dates from the server
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  /** Fetch the rolling week of completed trips. */
  const refreshHistory = useCallback(async () => {
    if (!driverToken) {
      // Why: without a token we cannot call the private history API
      setError('Sign in again to load history');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await loadDriverCompletedTripHistory(driverToken);
      setFromDate(data.fromDate || '');
      setToDate(data.toDate || '');
      setTotals({
        todayCompleted: data.totals?.todayCompleted ?? 0,
        todayTotal: data.totals?.todayTotal ?? 0,
        weekCompleted: data.totals?.weekCompleted ?? 0,
      });
      // Why: only keep Completed rows even if the payload is messy
      const completed = (data.trips ?? []).filter((trip) => trip.status === 'Completed');
      setTrips(completed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load history');
      setTrips([]);
      setTotals({ todayCompleted: 0, todayTotal: 0, weekCompleted: 0 });
    } finally {
      setLoading(false);
    }
  }, [driverToken]);

  useEffect(() => {
    // Why: load history as soon as the History tab mounts
    refreshHistory();
  }, [refreshHistory]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={styles.statusText}>
          Loading history...
        </AppText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <AppText variant="subtitle" style={styles.statusTitle}>
          Could not load history
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.statusText}>
          {error}
        </AppText>
        <Pressable onPress={refreshHistory} style={styles.retryButton}>
          <AppText variant="body" color={colors.primary}>
            Try again
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.heroTop, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View pointerEvents="none" style={styles.headerGlow} />
        <View style={styles.headerTopRow}>
          <Ionicons name="time-outline" size={28} color={colors.white} />
          <AppText variant="heading" color={colors.white} style={styles.headerTitle}>
            Trip history
          </AppText>
        </View>
        <AppText variant="body" color={colors.onPrimaryMuted}>
          Completed trips from the last 7 days
          {fromDate && toDate ? ` (${fromDate} → ${toDate})` : ''}.
        </AppText>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <Ionicons name="today-outline" size={20} color={colors.primary} />
          </View>
          <AppText variant="caption" color={colors.textSecondary}>
            Today completed
          </AppText>
          <AppText variant="title" style={styles.statValue}>
            {totals.todayCompleted}/{totals.todayTotal}
          </AppText>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <Ionicons name="trophy-outline" size={20} color={colors.secondary} />
          </View>
          <AppText variant="caption" color={colors.textSecondary}>
            Week completed
          </AppText>
          <AppText variant="title" style={styles.statValue}>
            {totals.weekCompleted}
          </AppText>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle" style={styles.sectionTitle}>
          Recent completed
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {trips.length} trip{trips.length === 1 ? '' : 's'}
        </AppText>
      </View>
      <View style={styles.cardList}>
        {trips.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText variant="body" color={colors.textSecondary}>
              No completed trips in the last 7 days.
            </AppText>
          </View>
        ) : (
          trips.map((trip) => <HistoryTripCard key={trip.id} trip={trip} />)
        )}
      </View>
    </ScrollView>
  );
}
