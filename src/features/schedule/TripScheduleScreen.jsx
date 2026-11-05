import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../components/common/AppText';
import { TRIP_STATUS } from '../../mockData/trip/todayTripMock';
import { loadDriverScheduleDay } from '../../services/scheduleApi';
import { colors } from '../../theme/colors';
import { formatTripDateLabel, toIsoDate } from '../../utils/formatTripDate';
import styles from './TripScheduleScreen.styles';
import TripStopsSheet from './TripStopsSheet';

const STOP_PREVIEW_COUNT = 3;

function statusTone(status) {
  // Why: completed trips get a green badge
  if (status === TRIP_STATUS.COMPLETED) {
    return { bg: colors.successBg, text: colors.successText, icon: 'checkmark-circle' };
  }
  // Why: live trips get a warning badge
  if (status === TRIP_STATUS.IN_PROGRESS) {
    return { bg: colors.warningBg, text: colors.warningText, icon: 'time' };
  }
  // Why: scheduled / default trips get an info badge
  return { bg: colors.infoBg, text: colors.infoText, icon: 'calendar-outline' };
}

function ScheduleTripCard({ trip, slotLabel, onViewStops }) {
  const tone = statusTone(trip.status);
  // Why: Drop uses evening accent colors
  const isDrop = trip.tripType === 'Drop';
  const typeColor = isDrop ? colors.secondary : colors.primary;
  // Why: card preview only shows the first few stops
  const previewStops = (trip.stops ?? []).slice(0, STOP_PREVIEW_COUNT);
  const remaining = Math.max(0, (trip.stopCount ?? 0) - previewStops.length);

  return (
    <View
      style={[
        styles.tripCard,
        isDrop ? styles.tripCardEvening : styles.tripCardMorning,
      ]}
    >
      <View style={styles.tripCardHeader}>
        <View style={[styles.typeBadge, isDrop && styles.typeBadgeEvening]}>
          <Ionicons
            name={isDrop ? 'moon-outline' : 'sunny-outline'}
            size={16}
            color={typeColor}
          />
          <AppText variant="caption" color={typeColor} style={styles.typeText}>
            {slotLabel} · {trip.tripType}
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
      <AppText variant="body" color={colors.textSecondary}>
        {trip.vehicleName} · {trip.vehiclePlate}
      </AppText>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            Schedule
          </AppText>
          <AppText variant="body" style={styles.metaValue}>
            {trip.scheduledStartTime} – {trip.scheduledEndTime}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            Stops
          </AppText>
          <AppText variant="body" style={styles.metaValue}>
            {trip.stopCount}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <AppText variant="caption" color={colors.textSecondary}>
            Students
          </AppText>
          <AppText variant="body" style={styles.metaValue}>
            {trip.studentCount}
          </AppText>
        </View>
      </View>

      <View style={styles.stopPreview}>
        <AppText variant="caption" color={colors.textSecondary}>
          First stops
        </AppText>
        {previewStops.map((stop, index) => (
          <View key={`${trip.id}-preview-${stop.name}-${index}`} style={styles.stopRow}>
            <AppText variant="caption" color={typeColor} style={styles.stopIndex}>
              {index + 1}
            </AppText>
            <AppText variant="body" style={styles.stopName} numberOfLines={1}>
              {stop.name}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {stop.studentCount}
            </AppText>
          </View>
        ))}
        {remaining > 0 ? (
          <AppText variant="caption" color={colors.textSecondary} style={styles.moreStops}>
            +{remaining} more stops
          </AppText>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View all ${trip.stopCount} stops`}
        onPress={onViewStops}
        style={({ pressed }) => [styles.viewStopsButton, pressed && styles.viewStopsButtonPressed]}
      >
        <Ionicons name="list-outline" size={18} color={colors.primary} />
        <AppText variant="button" color={colors.primary} style={styles.viewStopsLabel}>
          View all stops ({trip.stopCount})
        </AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

/**
 * Schedule tab: today's Pickup/Drop from GET /api/v1/driver-app/schedule.
 * Full stop list opens in TripStopsSheet.
 */
export default function TripScheduleScreen({ driverToken }) {
  // Why: block the list until the first schedule JSON arrives
  const [loading, setLoading] = useState(true);
  // Why: show retry UI when the school server rejects the call
  const [error, setError] = useState('');
  // Why: calendar day label from the server (yyyy-MM-dd)
  const [scheduleDate, setScheduleDate] = useState(toIsoDate());
  // Why: morning Pickup card from schedule.pickup
  const [pickup, setPickup] = useState(null);
  // Why: evening Drop card from schedule.drop
  const [drop, setDrop] = useState(null);
  // Why: TripStopsSheet needs the selected card + Morning/Evening label
  const [selected, setSelected] = useState(null);

  /** Fetch schedule for today (Phase 1 — no date picker yet). */
  const refreshSchedule = useCallback(async () => {
    if (!driverToken) {
      // Why: without a token we cannot call the private schedule API
      setError('Sign in again to load the schedule');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Why: omit date so backend uses school-timezone today
      const data = await loadDriverScheduleDay(driverToken);
      setScheduleDate(data.date || toIsoDate());
      setPickup(data.pickup ?? null);
      setDrop(data.drop ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load schedule');
      setPickup(null);
      setDrop(null);
    } finally {
      setLoading(false);
    }
  }, [driverToken]);

  useEffect(() => {
    // Why: load schedule as soon as the Schedule tab mounts
    refreshSchedule();
  }, [refreshSchedule]);

  // Why: build the visible list only from trips that exist today
  const trips = [];
  if (pickup) {
    trips.push({ trip: pickup, slotLabel: 'Morning' });
  }
  if (drop) {
    trips.push({ trip: drop, slotLabel: 'Evening' });
  }
  const noTrips = !loading && !error && trips.length === 0;

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={styles.statusText}>
          Loading schedule...
        </AppText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <AppText variant="subtitle" style={styles.statusTitle}>
          Could not load schedule
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.statusText}>
          {error}
        </AppText>
        <Pressable onPress={refreshSchedule} style={styles.retryButton}>
          <AppText variant="body" color={colors.primary}>
            Try again
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <>
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
            <Ionicons name="map-outline" size={28} color={colors.white} />
            <AppText variant="heading" color={colors.white} style={styles.headerTitle}>
              Trip schedule
            </AppText>
          </View>
          <AppText variant="body" color={colors.onPrimaryMuted}>
            {formatTripDateLabel(scheduleDate)} — Pickup then Drop.
          </AppText>
        </LinearGradient>

        <AppText variant="subtitle" style={styles.sectionTitle}>
          Today
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} style={styles.sectionHint}>
          Summary only. Open a trip to see the full stop list.
        </AppText>

        {noTrips ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bus-outline" size={28} color={colors.textSecondary} />
            <AppText variant="subtitle" style={styles.emptyTitle}>
              No trips today
            </AppText>
            <AppText variant="body" color={colors.textSecondary}>
              When a trip is generated for your route, it will show up here.
            </AppText>
          </View>
        ) : null}

        <View style={styles.cardList}>
          {trips.map(({ trip, slotLabel }) => (
            <ScheduleTripCard
              key={trip.id}
              trip={trip}
              slotLabel={slotLabel}
              onViewStops={() => setSelected({ trip, slotLabel })}
            />
          ))}
        </View>
      </ScrollView>

      <TripStopsSheet
        visible={Boolean(selected)}
        trip={selected?.trip}
        slotLabel={selected?.slotLabel}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
