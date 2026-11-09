import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../components/common/AppText';
import { buildHomeGreeting } from '../../mockData/home/homeMockData';
import { TRIP_STATUS } from '../../mockData/trip/todayTripMock';
import { syncVehicleGatewayMacFromHome } from '../settings/frontend/storage/syncVehicleGatewayMacFromHome';
import { loadDriverHome } from '../../services/homeApi';
import { endTrip as endTripOnServer, markNextStopDone } from '../../services/tripApi';
import { colors } from '../../theme/colors';
import LiveTripCard from '../trip/LiveTripCard';
import DriverGreetingCard from './DriverGreetingCard';
import TodaySummaryStrip from './TodaySummaryStrip';
import VanProximityGate from './VanProximityGate';
import styles from './HomeScreen.styles';

/** How often Home re-checks nearVan from the school server. */
const HOME_POLL_MS = 3000;

function nowTimeLabel() {
  // Why: local start/end stamps until Phase 2 APIs exist
  const date = new Date();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Build summary chips only for trips that actually exist today. */
function buildSummaryFromCards(pickup, drop) {
  // Why: empty day should not invent fake chips
  if (!pickup && !drop) {
    return { headline: 'No trips scheduled today', chips: [] };
  }
  const chips = [];
  // Why: one chip per direction that exists
  if (pickup) {
    chips.push({ id: 'pickup', label: `Pickup · ${pickup.status}`, status: pickup.status });
  }
  if (drop) {
    chips.push({ id: 'drop', label: `Drop · ${drop.status}`, status: drop.status });
  }
  let headline = `Today: ${pickup ? 1 : 0} Pickup · ${drop ? 1 : 0} Drop`;
  // Why: live status should beat the generic count headline
  if (pickup?.status === TRIP_STATUS.IN_PROGRESS) {
    headline = 'Pickup in progress';
  } else if (drop?.status === TRIP_STATUS.IN_PROGRESS) {
    headline = 'Drop in progress';
  } else if (
    pickup?.status === TRIP_STATUS.COMPLETED
    && drop?.status === TRIP_STATUS.COMPLETED
  ) {
    headline = 'All trips completed today';
  } else if (pickup?.status === TRIP_STATUS.COMPLETED && drop) {
    headline = 'Pickup done · Drop waiting';
  }
  return { headline, chips };
}

/** Local-only start until Phase 2 start API exists. */
function startTrip(trip) {
  // Why: mark the card live without a backend write yet
  return {
    ...trip,
    status: TRIP_STATUS.IN_PROGRESS,
    completedStops: 0,
    actualStartTime: nowTimeLabel(),
    actualEndTime: null,
  };
}

/** Optimistic local complete while the end API response is applied. */
function endTripLocal(trip) {
  // Why: close the card immediately so swipe feels instant before refresh
  return {
    ...trip,
    status: TRIP_STATUS.COMPLETED,
    completedStops: trip.stopCount,
    actualEndTime: nowTimeLabel(),
  };
}

/**
 * Driver home: polls nearVan and reports it to MainNavigator so other tabs stay locked
 * until the van gateway hears this driver's BLE card.
 */
export default function HomeScreen({
  driverToken,
  driverName,
  onOpenProfile,
  onNearVanChange,
}) {
  // Why: block the scroll content until the first home JSON arrives
  const [loading, setLoading] = useState(true);
  // Why: show retry UI when the school server rejects the call
  const [error, setError] = useState('');
  // Why: Pickup card from home.pickup
  const [pickup, setPickup] = useState(null);
  // Why: Drop card from home.drop
  const [drop, setDrop] = useState(null);
  // Why: van identity + proximityStatus from home.allocatedVan
  const [allocatedVan, setAllocatedVan] = useState(null);
  // Why: unlock flag from home.nearVan (Redis sighting after capture)
  const [nearVan, setNearVan] = useState(false);
  // Why: greeting prefers the employee name from the server
  const [resolvedName, setResolvedName] = useState(driverName || 'Driver');
  // Why: disable Mark stop done while the POST is in flight
  const [markingStop, setMarkingStop] = useState(false);
  // Why: disable Swipe to end while the end POST is in flight
  const [endingTrip, setEndingTrip] = useState(false);
  // Why: show server rejection under the trip card without clearing the whole home
  const [markStopError, setMarkStopError] = useState('');

  const { greeting, name } = buildHomeGreeting(resolvedName);

  /**
   * Fetch home from the school server.
   * @param {{ quiet?: boolean }} options quiet=true skips the full-screen loader (poll).
   */
  const refreshHome = useCallback(async ({ quiet = false } = {}) => {
    if (!driverToken) {
      // Why: without a token we cannot call the private home API
      setError('Sign in again to load today\'s trips');
      setLoading(false);
      // Why: navigator must keep tabs locked when session is missing
      onNearVanChange?.(false);
      return;
    }
    if (!quiet) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await loadDriverHome(driverToken);
      // Why: prefer server name so greeting matches the employee record
      if (data.driverName) {
        setResolvedName(data.driverName);
      }
      setPickup(data.pickup ?? null);
      setDrop(data.drop ?? null);
      // Why: gate copy + GMAC / RSSI threshold come from allocatedVan
      setAllocatedVan(data.allocatedVan ?? null);
      // Why: copy admin Vehicle GMAC into BLE Settings so Gateway POSTs match the van
      if (data.allocatedVan?.gatewayMacAddress) {
        syncVehicleGatewayMacFromHome(data.allocatedVan.gatewayMacAddress, {
          gpsMinMoveMeters: data.allocatedVan.gpsMinMoveMeters,
          gpsPublishIntervalMs: data.allocatedVan.gpsPublishIntervalMs,
        }).catch(() => undefined);
      }
      // Why: trip cards + other tabs unlock only when capture marked near van
      const unlocked = Boolean(data.nearVan ?? data.allocatedVan?.nearVan);
      setNearVan(unlocked);
      // Why: MainNavigator disables Schedule/History/Profile from this flag
      onNearVanChange?.(unlocked);
      if (!quiet) {
        setError('');
      }
    } catch (err) {
      if (!quiet) {
        setError(err instanceof Error ? err.message : 'Could not load home');
        setAllocatedVan(null);
        setNearVan(false);
        // Why: the first load failed, so there is no unlock to keep
        onNearVanChange?.(false);
      }
      // Why: a later poll can fail while captures still succeed; do not lock Schedule/History for that
    } finally {
      if (!quiet) {
        setLoading(false);
      }
    }
  }, [driverToken, onNearVanChange]);

  useEffect(() => {
    // Why: first paint loads trips + proximity
    refreshHome({ quiet: false });
  }, [refreshHome]);

  useEffect(() => {
    // Why: van gateway posts continuously — poll until nearVan flips (and keep refreshing TTL)
    if (!driverToken) {
      return undefined;
    }
    const timer = setInterval(() => {
      refreshHome({ quiet: true });
    }, HOME_POLL_MS);
    return () => clearInterval(timer);
  }, [driverToken, refreshHome]);

  const pickupDone = pickup?.status === TRIP_STATUS.COMPLETED;
  const dropDone = drop?.status === TRIP_STATUS.COMPLETED;
  const allDone = Boolean(pickup && drop && pickupDone && dropDone);
  const noTrips = !loading && !error && !pickup && !drop;
  // Why: trips stay hidden until the van gateway reports this driver's card
  const showTripCards = nearVan && !noTrips;

  // Why: rebuild chips from current cards so local start/end still updates the strip
  const liveSummary = buildSummaryFromCards(pickup, drop);

  /**
   * Persist Mark stop done on the school server, then refresh Home so the next stop sticks.
   * Used when live GPS tracking cannot advance the stop for the driver.
   */
  const handleMarkNextStopDone = useCallback(async (trip) => {
    // Why: ignore double-taps and missing cards
    if (!trip?.id || markingStop) {
      return;
    }
    setMarkingStop(true);
    setMarkStopError('');
    try {
      // Why: backend inserts driver_trip_stop_reach for the next unreached stop
      const result = await markNextStopDone(driverToken, trip.id);
      // Why: update the matching card immediately so the UI does not wait for poll
      const applyProgress = (current) => {
        if (!current || String(current.id) !== String(result.tripId)) {
          return current;
        }
        return {
          ...current,
          completedStops: result.completedStops ?? current.completedStops,
        };
      };
      setPickup(applyProgress);
      setDrop(applyProgress);
      // Why: quiet refresh reloads completedStops from DB and keeps nearVan
      await refreshHome({ quiet: true });
    } catch (err) {
      // Why: leave the previous progress visible and show why the tap failed
      setMarkStopError(err instanceof Error ? err.message : 'Could not mark stop done');
    } finally {
      setMarkingStop(false);
    }
  }, [driverToken, markingStop, refreshHome]);

  /**
   * Persist Swipe to end on the school server so the trip is manually COMPLETED now.
   */
  const handleEndTrip = useCallback(async (trip) => {
    // Why: ignore double-swipe and missing cards
    if (!trip?.id || endingTrip) {
      return;
    }
    setEndingTrip(true);
    setMarkStopError('');
    // Why: optimistic UI so the swipe feels done while the POST runs
    const applyEnded = (current) => {
      if (!current || String(current.id) !== String(trip.id)) {
        return current;
      }
      return endTripLocal(current);
    };
    setPickup(applyEnded);
    setDrop(applyEnded);
    try {
      // Why: backend sets trips.trip_status = COMPLETED for this driver
      await endTripOnServer(driverToken, trip.id);
      // Why: quiet refresh reloads Completed from DB (History / Drop unlock)
      await refreshHome({ quiet: true });
    } catch (err) {
      // Why: revert optimistic complete and show why the swipe failed
      setMarkStopError(err instanceof Error ? err.message : 'Could not end the trip');
      await refreshHome({ quiet: true });
    } finally {
      setEndingTrip(false);
    }
  }, [driverToken, endingTrip, refreshHome]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={styles.statusText}>
          Loading today&apos;s trips...
        </AppText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <AppText variant="subtitle" style={styles.statusTitle}>
          Could not load home
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.statusText}>
          {error}
        </AppText>
        <Pressable onPress={() => refreshHome({ quiet: false })} style={styles.retryButton}>
          <AppText variant="body" color={colors.primary}>
            Try again
          </AppText>
        </Pressable>
      </View>
    );
  }

  // Why: while locked, Home only shows the gate + Profile shortcut (no trip cards)
  if (!nearVan) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Why: Profile must stay reachable even out of gateway range */}
        <DriverGreetingCard greeting={greeting} name={name} onOpenProfile={onOpenProfile} />
        {noTrips ? (
          <View style={styles.allDoneCard}>
            <Ionicons name="bus-outline" size={28} color={colors.textSecondary} />
            <AppText variant="subtitle" style={styles.allDoneTitle}>
              No trips today
            </AppText>
            <AppText variant="body" color={colors.textSecondary}>
              When a trip is generated for your route, it will show up here.
            </AppText>
          </View>
        ) : (
          <VanProximityGate allocatedVan={allocatedVan} nearVan={false} />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <DriverGreetingCard greeting={greeting} name={name} onOpenProfile={onOpenProfile} />
      <TodaySummaryStrip summary={liveSummary} />

      {/* Why: gateway copy is only for a real trip. No trip today is not a missing GMAC. */}
      {noTrips ? null : (
        <VanProximityGate allocatedVan={allocatedVan} nearVan={nearVan} />
      )}

      {/* Why: mark-stop errors stay visible without wiping the whole home screen */}
      {markStopError ? (
        <AppText variant="body" color={colors.error} style={styles.statusText}>
          {markStopError}
        </AppText>
      ) : null}

      {noTrips ? (
        <View style={styles.allDoneCard}>
          <Ionicons name="bus-outline" size={28} color={colors.textSecondary} />
          <AppText variant="subtitle" style={styles.allDoneTitle}>
            No trips today
          </AppText>
          <AppText variant="body" color={colors.textSecondary}>
            When a trip is generated for your route, it will show up here.
          </AppText>
        </View>
      ) : null}

      {showTripCards && pickup && !pickupDone ? (
        <LiveTripCard
          trip={pickup}
          onStart={() => setPickup((current) => startTrip(current))}
          // Why: POST COMPLETED so the trip ends manually at swipe time
          onEnd={() => handleEndTrip(pickup)}
          // Why: POST next stop to school server so progress survives home poll
          onAdvanceStop={
            markingStop ? undefined : () => handleMarkNextStopDone(pickup)
          }
        />
      ) : null}

      {showTripCards && pickupDone && drop && !dropDone ? (
        <LiveTripCard
          trip={drop}
          onStart={() => setDrop((current) => startTrip(current))}
          // Why: Drop swipe also persists COMPLETED on the server
          onEnd={() => handleEndTrip(drop)}
          // Why: same mark API as Pickup — progress stored per trip_id
          onAdvanceStop={
            markingStop ? undefined : () => handleMarkNextStopDone(drop)
          }
        />
      ) : null}

      {/* Why: show Drop alone when there is no Pickup trip for today */}
      {showTripCards && !pickup && drop && !dropDone ? (
        <LiveTripCard
          trip={drop}
          onStart={() => setDrop((current) => startTrip(current))}
          onEnd={() => handleEndTrip(drop)}
          // Why: Drop-only days still need GPS fallback mark
          onAdvanceStop={
            markingStop ? undefined : () => handleMarkNextStopDone(drop)
          }
        />
      ) : null}

      {showTripCards && allDone ? (
        <View style={styles.allDoneCard}>
          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          <AppText variant="subtitle" style={styles.allDoneTitle}>
            All trips completed today
          </AppText>
          <AppText variant="body" color={colors.textSecondary}>
            Pickup and Drop are done. See Schedule or History for details.
          </AppText>
        </View>
      ) : null}
    </ScrollView>
  );
}
