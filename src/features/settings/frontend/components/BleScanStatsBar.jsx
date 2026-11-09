import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getBlePhoneScanStatsSnapshot } from '../services/blePhoneScannerService';
import { bleUiColors, bleUiRadii } from '../theme/bleUiColors';

const BLE_SCAN_STATS_UI_POLL_MS = 1_000;

/** Live packet / restart counters while scan is active. */
export default function BleScanStatsBar({ active }) {
  const [scanStatsSnapshot, setScanStatsSnapshot] = useState(getBlePhoneScanStatsSnapshot());

  useEffect(() => {
    if (!active) return undefined;
    const pollTimerId = setInterval(() => {
      setScanStatsSnapshot(getBlePhoneScanStatsSnapshot());
    }, BLE_SCAN_STATS_UI_POLL_MS);
    return () => clearInterval(pollTimerId);
  }, [active]);

  if (!active) return null;

  const droppedPacketGap = Math.max(
    0,
    (scanStatsSnapshot.nativeResults || 0) - (scanStatsSnapshot.packets || 0),
  );

  return (
    <View style={styles.row}>
      <StatChip label="Packets" value={scanStatsSnapshot.packets || 0} />
      <StatChip label="Native" value={scanStatsSnapshot.nativeResults || 0} />
      <StatChip label="Restarts" value={scanStatsSnapshot.restarts || 0} />
      {droppedPacketGap > 0 ? (
        <StatChip label="Drop" value={droppedPacketGap} tone="warn" />
      ) : null}
    </View>
  );
}

function StatChip({ label, value, tone }) {
  return (
    <View style={[styles.chip, tone === 'warn' && styles.chipWarn]}>
      <Text style={[styles.chipLabel, tone === 'warn' && styles.chipLabelWarn]}>{label}</Text>
      <Text style={[styles.chipValue, tone === 'warn' && styles.chipValueWarn]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    backgroundColor: bleUiColors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: bleUiRadii.sm,
    minWidth: 72,
  },
  chipWarn: { backgroundColor: bleUiColors.warningBg },
  chipLabel: {
    color: bleUiColors.textMuted,
    fontWeight: '600',
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  chipLabelWarn: { color: bleUiColors.warningText },
  chipValue: {
    color: bleUiColors.primary,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 2,
  },
  chipValueWarn: { color: bleUiColors.warningText },
});
