import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { bleUiColors, bleUiRadii, bleUiShadows } from '../theme/bleUiColors';
import { formatNearbyDeviceLastSeenLabel } from '../utils/bleNearbyDeviceDisplay';

/** Expandable Scanner list row for one nearby BLE advertiser. */
export default function BleNearbyDeviceRow({ device, expanded, now, onToggle }) {
  const lastSeenLabel = formatNearbyDeviceLastSeenLabel(device.lastSeenAt, now);

  return (
    <Pressable onPress={() => onToggle(device.key)} style={styles.row}>
      <View style={styles.topLine}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={device.cardType ? 'card-outline' : 'bluetooth-outline'}
            size={18}
            color={bleUiColors.primary}
          />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {device.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {device.mac} · {lastSeenLabel}
            {device.intervalMs != null ? ` · ~${device.intervalMs} ms` : ''}
          </Text>
        </View>
        <Text style={styles.rssi}>{device.rssi} dBm</Text>
      </View>
      {expanded ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailLine}>cardType={device.cardType ?? ''}</Text>
          <Text style={styles.detailLine}>cardId={device.cardId ?? ''}</Text>
          <Text style={styles.detailLine}>uuid={device.uuid ?? ''}</Text>
          <Text style={styles.detailLine}>
            major={device.major ?? ''} minor={device.minor ?? ''}
          </Text>
          <Text style={styles.detailLine}>powerByte={device.rawPowerByte ?? ''}</Text>
          <Text style={styles.detailLine}>
            services={(device.serviceUuids || []).join(',') || ''}
          </Text>
          <Text style={styles.detailLine}>serviceData={device.serviceDataSummary ?? ''}</Text>
          <Text style={styles.detailLine}>manufacturer={device.manufacturerHex ?? ''}</Text>
          <Text style={styles.detailLine} numberOfLines={4}>
            raw={device.rawHex ?? ''}
          </Text>
          <Text style={styles.detailLine}>packets={device.packetCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: bleUiColors.bgElevated,
    borderRadius: bleUiRadii.md,
    borderWidth: 1,
    borderColor: bleUiColors.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...bleUiShadows.card,
  },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bleUiColors.primarySoft,
  },
  titleWrap: { flex: 1, minWidth: 0 },
  name: { fontWeight: '700', color: bleUiColors.text, fontSize: 15 },
  rssi: { fontWeight: '700', color: bleUiColors.primary, fontSize: 13 },
  meta: { marginTop: 2, color: bleUiColors.textMuted, fontSize: 12 },
  detailBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: bleUiRadii.sm,
    backgroundColor: bleUiColors.primarySoft,
    gap: 3,
  },
  detailLine: { color: bleUiColors.infoText, fontSize: 12, fontFamily: undefined },
});
