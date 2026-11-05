import { View } from 'react-native';

import AppText from '../../components/common/AppText';
import { TRIP_STATUS } from '../../mockData/trip/todayTripMock';
import { colors } from '../../theme/colors';
import styles from './TodaySummaryStrip.styles';

function chipTone(status) {
  if (status === TRIP_STATUS.IN_PROGRESS) {
    return { bg: colors.warningBg, text: colors.warningText };
  }
  if (status === TRIP_STATUS.COMPLETED) {
    return { bg: colors.successBg, text: colors.successText };
  }
  return { bg: colors.infoBg, text: colors.infoText };
}

/** Compact today overview under the greeting. */
export default function TodaySummaryStrip({ summary }) {
  return (
    <View style={styles.wrap}>
      <AppText variant="subtitle" style={styles.headline}>
        {summary.headline}
      </AppText>
      <View style={styles.chips}>
        {summary.chips.map((chip) => {
          const tone = chipTone(chip.status);
          return (
            <View key={chip.id} style={[styles.chip, { backgroundColor: tone.bg }]}>
              <AppText variant="caption" color={tone.text} style={styles.chipText}>
                {chip.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}
