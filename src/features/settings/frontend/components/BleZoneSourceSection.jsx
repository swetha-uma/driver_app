import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { bleUiColors } from '../theme/bleUiColors';

/** Zone source toggles — phone GMAC vs zone ID card(s). */
export default function BleZoneSourceSection({
  zoneSource,
  zoneMode,
  gmac,
  zoneCardText,
  inputStyle,
  onZoneSourceChange,
  onZoneModeChange,
  onGmacChange,
  onZoneCardTextChange,
}) {
  const isZoneFromZoneCard = zoneSource === 'zoneCard';
  const followsSeveralZoneCards = isZoneFromZoneCard && zoneMode === 'multi';

  return (
    <View>
      <View style={styles.row}>
        <Text style={[styles.label, styles.switchLabel]}>Zone comes from a zone ID card</Text>
        <Switch
          value={isZoneFromZoneCard}
          onValueChange={(isEnabled) => onZoneSourceChange(isEnabled ? 'zoneCard' : 'phone')}
          trackColor={{ false: bleUiColors.borderStrong, true: bleUiColors.primary }}
          thumbColor={bleUiColors.bgElevated}
        />
      </View>
      <Text style={styles.fieldHint}>
        {isZoneFromZoneCard
          ? 'Uploads start only while the phone hears a zone card. That card is sent as GMAC.'
          : 'This phone is the zone gateway. The MAC below is sent as GMAC and uploads start without a zone card.'}
      </Text>

      {isZoneFromZoneCard ? (
        <View style={styles.row}>
          <Text style={[styles.label, styles.switchLabel]}>Follow several zone cards</Text>
          <Switch
            value={zoneMode === 'multi'}
            onValueChange={(isEnabled) => onZoneModeChange(isEnabled ? 'multi' : 'single')}
            trackColor={{ false: bleUiColors.borderStrong, true: bleUiColors.primary }}
            thumbColor={bleUiColors.bgElevated}
          />
        </View>
      ) : null}

      {followsSeveralZoneCards ? (
        <>
          <Text style={styles.label}>Zone card MACs (one per line)</Text>
          <TextInput
            style={[inputStyle, styles.multilineInput]}
            autoCapitalize="characters"
            autoCorrect={false}
            multiline
            value={zoneCardText}
            onChangeText={onZoneCardTextChange}
            placeholder={'0C:DC:7E:51:58:40\n0C:DC:7E:51:58:41'}
            placeholderTextColor={bleUiColors.textFaint}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>
            {isZoneFromZoneCard ? 'Zone card MAC (GMAC)' : 'Gateway MAC (GMAC)'}
          </Text>
          <TextInput
            style={inputStyle}
            autoCapitalize="characters"
            value={gmac}
            onChangeText={onGmacChange}
            placeholder="0C:DC:7E:51:58:40"
            placeholderTextColor={bleUiColors.textFaint}
          />
        </>
      )}
      <Text style={styles.fieldHint}>
        Must match school_zones.gateway_mac_address or vehicles.gateway_mac_address exactly
        (ACTIVE).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  label: { fontWeight: '600', color: bleUiColors.textSecondary, marginTop: 8, fontSize: 13 },
  switchLabel: { flex: 1, marginTop: 0 },
  fieldHint: { color: bleUiColors.textMuted, marginTop: 4, fontSize: 12, lineHeight: 18 },
  multilineInput: { minHeight: 110, textAlignVertical: 'top' },
});
