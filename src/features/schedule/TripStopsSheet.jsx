import { FlatList, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '../../components/common/AppText';
import { colors } from '../../theme/colors';
import styles from './TripStopsSheet.styles';

function StopRow({ stop, index, isDrop }) {
  const accent = isDrop ? colors.secondary : colors.primary;

  return (
    <View style={styles.stopRow}>
      <View style={[styles.stopIndexWrap, isDrop && styles.stopIndexWrapEvening]}>
        <AppText variant="caption" color={accent} style={styles.stopIndex}>
          {index + 1}
        </AppText>
      </View>
      <View style={styles.stopCopy}>
        <AppText variant="subtitle">{stop.name}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          Stop {index + 1} of {stop.totalCount}
        </AppText>
      </View>
      <AppText variant="body" color={colors.textSecondary} style={styles.studentCount}>
        {stop.studentCount}
      </AppText>
    </View>
  );
}

/** Full stop list for a scheduled trip (modal). */
export default function TripStopsSheet({ visible, trip, slotLabel, onClose }) {
  const insets = useSafeAreaInsets();
  if (!trip) return null;

  const isDrop = trip.tripType === 'Drop';
  const accent = isDrop ? colors.secondary : colors.primary;
  const totalCount = trip.stops?.length ?? 0;
  const data = (trip.stops ?? []).map((stop) => ({ ...stop, totalCount }));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close stops list"
              onPress={onClose}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
            </Pressable>
            <View style={styles.headerCopy}>
              <AppText variant="title">{trip.routeName}</AppText>
              <AppText variant="body" color={colors.textSecondary}>
                {slotLabel} · {trip.tripType} · stop order
              </AppText>
            </View>
          </View>
          <View style={styles.headerMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="flag-outline" size={14} color={accent} />
              <AppText variant="caption" color={accent}>
                {totalCount} stops
              </AppText>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="people-outline" size={14} color={accent} />
              <AppText variant="caption" color={accent}>
                {trip.studentCount} students
              </AppText>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={14} color={accent} />
              <AppText variant="caption" color={accent}>
                {trip.scheduledStartTime} – {trip.scheduledEndTime}
              </AppText>
            </View>
          </View>
        </View>

        <FlatList
          data={data}
          keyExtractor={(item, index) => `${trip.id}-${item.name}-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={8}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item, index }) => (
            <StopRow stop={item} index={index} isDrop={isDrop} />
          )}
        />
      </View>
    </Modal>
  );
}
