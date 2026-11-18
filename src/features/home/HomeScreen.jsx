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
const HOME_POLL_MS = 3000; // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.

function nowTimeLabel() {
  // Why: local start/end stamps until Phase 2 APIs exist
  const date = new Date();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Build summary chips for today's pickup/drop (scheduled or live). */
function buildSummaryFromCards(pickup, drop) {
  // Why: empty day should not invent fake chips
  if (!pickup && !drop) {
    return { headline: 'No trip scheduled today', chips: [] };
  }
  const chips = [];
  if (pickup) {
    chips.push({ id: 'pickup', label: `Pickup · ${pickup.status}`, status: pickup.status });
  }
  if (drop) {
    chips.push({ id: 'drop', label: `Drop · ${drop.status}`, status: drop.status });
  }
  if (pickup?.status === TRIP_STATUS.IN_PROGRESS) {
    return { headline: 'Pickup is live', chips };
  }
  if (drop?.status === TRIP_STATUS.IN_PROGRESS) {
    return { headline: 'Drop is live', chips };
  }
  if (pickup?.status === TRIP_STATUS.SCHEDULED || drop?.status === TRIP_STATUS.SCHEDULED) {
    return { headline: 'Today\'s trips', chips };
  }
  return { headline: 'Today\'s trips', chips };
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
 * Driver home: always shows today's pickup/drop schedule.
 * nearVan is informational only — it no longer hides trip cards.
 */
export default function HomeScreen({
  driverToken,
  driverName,
  onOpenProfile,
  canLeave,
  onSwitchToLeave,
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
  // Why: optional proximity banner (does not gate trip cards)
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
      // Why: proximity banner + GMAC / RSSI threshold come from allocatedVan
      setAllocatedVan(data.allocatedVan ?? null);
      // Why: copy admin Vehicle GMAC into BLE Settings so Gateway POSTs match the van
      if (data.allocatedVan?.gatewayMacAddress) {
        syncVehicleGatewayMacFromHome(data.allocatedVan.gatewayMacAddress, {
          gpsMinMoveMeters: data.allocatedVan.gpsMinMoveMeters,
          gpsPublishIntervalMs: data.allocatedVan.gpsPublishIntervalMs,
        }).catch(() => undefined);
      }
      setNearVan(Boolean(data.nearVan ?? data.allocatedVan?.nearVan));
      if (!quiet) {
        setError('');
      }
    } catch (err) {
      if (!quiet) {
        setError(err instanceof Error ? err.message : 'Could not load home');
        setAllocatedVan(null);
        setNearVan(false);
      }
    } finally {
      if (!quiet) {
        setLoading(false);
      }
    }
  }, [driverToken]);

  useEffect(() => {
    // Why: first paint loads today's trips
    refreshHome({ quiet: false });
  }, [refreshHome]);

  useEffect(() => {
    // Why: keep trip status + optional nearVan banner fresh while Home is open
    if (!driverToken) {
      return undefined;
    }
    const timer = setInterval(() => {
      refreshHome({ quiet: true });
    }, HOME_POLL_MS);
    return () => clearInterval(timer);
  }, [driverToken, refreshHome]);

  // Why: Drop stays locked until Pickup is finished
  const pickupDone = !pickup || pickup.status === TRIP_STATUS.COMPLETED;
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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <DriverGreetingCard
        greeting={greeting}
        name={name}
        onOpenProfile={onOpenProfile}
        canLeave={canLeave}
        onSwitchMode={(mode) => {
          if (mode === 'LEAVE') onSwitchToLeave?.();
        }}
      />
      <TodaySummaryStrip summary={liveSummary} />

      {/* Why: proximity is info only — trips stay visible either way */}
      {allocatedVan ? (
        <VanProximityGate allocatedVan={allocatedVan} nearVan={nearVan} />
      ) : null}

      {markStopError ? (
        <AppText variant="body" color={colors.error} style={styles.statusText}>
          {markStopError}
        </AppText>
      ) : null}

      {pickup ? (
        <LiveTripCard
          trip={pickup}
          onStart={() => setPickup((current) => startTrip(current))}
          onEnd={() => handleEndTrip(pickup)}
          onAdvanceStop={
            markingStop ? undefined : () => handleMarkNextStopDone(pickup)
          }
        />
      ) : null}

      {drop ? (
        <LiveTripCard
          trip={drop}
          onStart={() => setDrop((current) => startTrip(current))}
          onEnd={() => handleEndTrip(drop)}
          onAdvanceStop={
            markingStop ? undefined : () => handleMarkNextStopDone(drop)
          }
          locked={!pickupDone}
        />
      ) : null}

      {!pickup && !drop ? (
        <View style={styles.allDoneCard}>
          <Ionicons name="bus-outline" size={28} color={colors.textSecondary} />
          <AppText variant="subtitle" style={styles.allDoneTitle}>
            No trip scheduled today
          </AppText>
          <AppText variant="body" color={colors.textSecondary}>
            When you have a pickup or drop today, it will show here.
          </AppText>
        </View>
      ) : null}
    </ScrollView>
  );
}
