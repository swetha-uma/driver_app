import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../../components/common/AppButton';
import AppText from '../../components/common/AppText';
import { getNextStop, TRIP_STATUS } from '../../mockData/trip/todayTripMock';
import { colors } from '../../theme/colors';
import SwipeToStart from './SwipeToStart';
import styles from './LiveTripCard.styles';

function statusTone(status) {
  if (status === TRIP_STATUS.IN_PROGRESS) return { bg: colors.warningBg, text: colors.warningText };
  if (status === TRIP_STATUS.COMPLETED) return { bg: colors.successBg, text: colors.successText };
  return { bg: colors.infoBg, text: colors.infoText };
}

/**
 * Pickup or Drop trip card.
 * locked = Drop waiting until Pickup is completed.
 */
export default function LiveTripCard({
  trip,
  onStart,
  onEnd,
  onAdvanceStop,
  locked = false,
  lockedMessage = 'Finish Pickup before starting Drop',
}) {
  const tone = statusTone(trip.status);
  const isScheduled = trip.status === TRIP_STATUS.SCHEDULED;
  const isInProgress = trip.status === TRIP_STATUS.IN_PROGRESS;
  const isCompleted = trip.status === TRIP_STATUS.COMPLETED;
  const nextStop = isInProgress ? getNextStop(trip) : null;
  const doneCount = trip.completedStops ?? 0;
  const allStopsDone = doneCount >= trip.stopCount;

  return (
    <View style={[styles.card, locked && styles.cardLocked]}>
      <View style={styles.headerRow}>
        <View style={styles.typeBadge}>
          <Ionicons
            name={trip.tripType === 'Drop' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
            size={16}
            color={colors.primary}
          />
          <AppText variant="caption" color={colors.primary} style={styles.typeText}>
            Live · {trip.tripType}
          </AppText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
          <AppText variant="caption" color={tone.text} style={styles.statusText}>
            {locked ? 'Waiting' : trip.status}
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

      {trip.actualStartTime ? (
        <AppText variant="caption" color={colors.textSecondary} style={styles.actualLine}>
          Started at {trip.actualStartTime}
          {trip.actualEndTime ? ` · Ended at ${trip.actualEndTime}` : ''}
        </AppText>
      ) : null}

      {locked ? (
        <View style={styles.lockedNote}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          <AppText variant="body" color={colors.textSecondary} style={styles.lockedText}>
            {lockedMessage}
          </AppText>
        </View>
      ) : null}

      {!locked && isInProgress && nextStop ? (
        <View style={styles.nextStopCard}>
          <View style={styles.nextStopHeader}>
            <AppText variant="caption" color={colors.primary} style={styles.nextStopLabel}>
              Next stop
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {doneCount} of {trip.stopCount} stops done
            </AppText>
          </View>
          <AppText variant="subtitle" style={styles.nextStopName}>
            {nextStop.name}
          </AppText>
          <AppText variant="body" color={colors.textSecondary}>
            {nextStop.studentCount} students at this stop
          </AppText>
          {/* Why: GPS fallback — driver advances stop when live tracking fails */}
          {onAdvanceStop && doneCount < trip.stopCount ? (
            <AppButton
              // Why: label matches the Home handler that POSTs mark-next-done
              title="Mark stop done"
              variant="outline"
              // Why: Home wires this to markNextStopDone(driverToken, trip.id)
              onPress={onAdvanceStop}
              style={styles.advanceButton}
            />
          ) : null}
        </View>
      ) : null}

      {!locked && isInProgress && allStopsDone ? (
        <View style={styles.nextStopCard}>
          <AppText variant="body" color={colors.textSecondary}>
            All stops covered. Swipe to end the trip.
          </AppText>
        </View>
      ) : null}

      {!locked && isScheduled ? (
        <View style={styles.actionWrap}>
          <SwipeToStart
            label={`Swipe to start ${trip.tripType.toLowerCase()}`}
            onComplete={onStart}
          />
        </View>
      ) : null}

      {!locked && isInProgress ? (
        <View style={styles.actionWrap}>
          <SwipeToStart
            label={`Swipe to end ${trip.tripType.toLowerCase()}`}
            onComplete={onEnd}
            disabled={!allStopsDone}
            tone="danger"
          />
        </View>
      ) : null}

      {!locked && isCompleted ? (
        <View style={styles.completedNote}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <AppText variant="body" color={colors.successText}>
            {trip.tripType} trip completed
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
