import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BleInfoCard from '../components/BleInfoCard';
import BlePrimaryButton from '../components/BlePrimaryButton';
import BleScanStatsBar from '../components/BleScanStatsBar';
import { useBleGatewayCapture } from '../hooks/useBleGatewayCapture';
import { isBlePhoneNativeScannerAvailable } from '../services/blePhoneScannerService';
import { bleUiColors, bleUiRadii, bleUiShadows } from '../theme/bleUiColors';

/**
 * Gateway tab: BLE student capture + van GPS — professional driver-theme layout.
 * Why: header lives in ListHeaderComponent so the whole page scrolls on short phones.
 */
export default function BleGatewayCaptureScreen({
  settingsVersion = 0,
  onOpenBleGatewayConfig,
}) {
  const {
    gatewaySettings,
    zoneCardMacAddresses,
    isZoneConfigured,
    activeZoneGatewayMac,
    isGatewayScanning,
    gatewayScanStatusMessage,
    vanGpsPublishStatusMessage,
    offlineCaptureQueueSize,
    successfulCapturePostCount,
    captureDetectionLogs,
    toggleBleGatewayScan,
    flushBleOfflineCaptureQueueNow,
  } = useBleGatewayCapture(settingsVersion);

  const isNativeBleScannerReady = useMemo(() => isBlePhoneNativeScannerAvailable(), []);

  const listHeader = (
    <View>
      <View style={styles.titleRow}>
        <View style={styles.titleColumn}>
          <Text style={styles.title}>Gateway</Text>
          <Text style={styles.subtitle}>Student BLE capture · van live tracking</Text>
        </View>
        <Pressable
          onPress={onOpenBleGatewayConfig}
          hitSlop={10}
          style={styles.settingsButton}
          accessibilityRole="button"
          accessibilityLabel="Gateway settings"
        >
          <Ionicons name="settings-outline" size={20} color={bleUiColors.primary} />
          <Text style={styles.settingsLink}>Settings</Text>
        </Pressable>
      </View>

      <BleInfoCard style={styles.infoCard} accent={isZoneConfigured}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusHeaderTitle}>Connection</Text>
          <View
            style={[
              styles.livePill,
              isGatewayScanning ? styles.livePillOn : styles.livePillOff,
            ]}
          >
            <View
              style={[
                styles.liveDot,
                isGatewayScanning ? styles.liveDotOn : styles.liveDotOff,
              ]}
            />
            <Text
              style={[
                styles.livePillText,
                isGatewayScanning ? styles.livePillTextOn : styles.livePillTextOff,
              ]}
            >
              {isGatewayScanning ? 'Scanning' : 'Idle'}
            </Text>
          </View>
        </View>

        <StatusRow
          icon="link-outline"
          label="API"
          value={`${gatewaySettings?.apiBaseUrl ?? '…'}${gatewaySettings?.capturePath ?? ''}`}
        />
        <StatusRow
          icon="navigate-outline"
          label="Zone"
          value={
            gatewaySettings?.zoneSource === 'zoneCard'
              ? `Zone cards · ${zoneCardMacAddresses.length || 'not set'}${gatewaySettings.zoneMode === 'multi' ? ' (multi)' : ''}`
              : 'This phone is the gateway'
          }
        />
        <StatusRow
          icon="radio-outline"
          label="Active"
          value={
            activeZoneGatewayMac ??
            (isZoneConfigured ? 'Waiting for zone card' : 'Not configured')
          }
        />
        <StatusRow icon="bluetooth-outline" label="BLE" value={gatewayScanStatusMessage} />
        <StatusRow icon="locate-outline" label="GPS" value={vanGpsPublishStatusMessage} />

        {!isZoneConfigured ? (
          <View style={styles.warnBox}>
            <Ionicons name="alert-circle-outline" size={18} color={bleUiColors.danger} />
            <Text style={styles.setupWarn}>
              Open Settings, set the van Gateway MAC and API URL, then Start scan.
            </Text>
          </View>
        ) : null}

        <View style={styles.statRow}>
          <MetricChip label="Posted" value={successfulCapturePostCount} />
          <MetricChip label="Queue" value={offlineCaptureQueueSize} />
          <MetricChip
            label="BLE"
            value={isNativeBleScannerReady ? 'Ready' : 'Missing'}
            tone={isNativeBleScannerReady ? 'ok' : 'warn'}
          />
          <MetricChip
            label="GPS"
            value={isGatewayScanning ? 'On' : 'Off'}
            tone={isGatewayScanning ? 'ok' : 'neutral'}
          />
        </View>
        <BleScanStatsBar active={isGatewayScanning} />
      </BleInfoCard>

      <View style={styles.actions}>
        <BlePrimaryButton
          label={isGatewayScanning ? 'Stop scan' : 'Start scan'}
          variant={isGatewayScanning ? 'danger' : 'primary'}
          onPress={toggleBleGatewayScan}
        />
        <BlePrimaryButton
          label="Flush offline queue"
          variant="ghost"
          onPress={flushBleOfflineCaptureQueueNow}
        />
      </View>

      <Text style={styles.sectionTitle}>Recent captures</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        style={styles.listFlex}
        data={captureDetectionLogs}
        keyExtractor={(logItem) => logItem.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="file-tray-outline" size={28} color={bleUiColors.textFaint} />
            <Text style={styles.empty}>No captures yet</Text>
            <Text style={styles.emptyHint}>Start scan to upload student tag events</Text>
          </View>
        }
        renderItem={({ item: logItem }) => (
          <View style={styles.logRow}>
            <View style={styles.logTop}>
              <Text style={styles.logTitle} numberOfLines={1}>
                {String(logItem.status).toUpperCase()}
              </Text>
              <Text style={styles.logRssi}>RSSI {logItem.rssi}</Text>
            </View>
            {logItem.name ? (
              <Text style={styles.logBody} numberOfLines={1}>
                {logItem.name}
              </Text>
            ) : null}
            {logItem.dmac ? (
              <Text style={styles.logBody} numberOfLines={1}>
                MAC {logItem.dmac}
              </Text>
            ) : null}
            <Text style={styles.logBody} numberOfLines={2}>
              {logItem.message}
            </Text>
            <Text style={styles.logMeta}>{logItem.at}</Text>
          </View>
        )}
      />
    </View>
  );
}

function StatusRow({ icon, label, value }) {
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusIconWrap}>
        <Ionicons name={icon} size={16} color={bleUiColors.primary} />
      </View>
      <View style={styles.statusTextWrap}>
        <Text style={styles.statusLabel}>{label}</Text>
        <Text style={styles.statusValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function MetricChip({ label, value, tone = 'neutral' }) {
  const toneStyle =
    tone === 'ok' ? styles.metricOk : tone === 'warn' ? styles.metricWarn : styles.metricNeutral;
  const valueStyle =
    tone === 'ok'
      ? styles.metricValueOk
      : tone === 'warn'
        ? styles.metricValueWarn
        : styles.metricValueNeutral;
  return (
    <View style={[styles.metricChip, toneStyle]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: bleUiColors.bg, paddingHorizontal: 16, paddingTop: 14 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleColumn: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: bleUiColors.text,
    letterSpacing: -0.3,
  },
  subtitle: { marginTop: 2, fontSize: 13, color: bleUiColors.textMuted, fontWeight: '500' },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: bleUiRadii.pill,
    backgroundColor: bleUiColors.bgElevated,
    borderWidth: 1,
    borderColor: bleUiColors.border,
    ...bleUiShadows.card,
  },
  settingsLink: { fontSize: 13, fontWeight: '700', color: bleUiColors.primary },
  infoCard: { marginTop: 14 },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: bleUiColors.text,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: bleUiRadii.pill,
  },
  livePillOn: { backgroundColor: bleUiColors.successBg },
  livePillOff: { backgroundColor: bleUiColors.primarySoft },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveDotOn: { backgroundColor: bleUiColors.success },
  liveDotOff: { backgroundColor: bleUiColors.textFaint },
  livePillText: { fontSize: 12, fontWeight: '700' },
  livePillTextOn: { color: bleUiColors.successText },
  livePillTextOff: { color: bleUiColors.textMuted },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bleUiColors.primarySoft,
    marginTop: 1,
  },
  statusTextWrap: { flex: 1, minWidth: 0 },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: bleUiColors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusValue: {
    marginTop: 2,
    color: bleUiColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
    padding: 10,
    borderRadius: bleUiRadii.md,
    backgroundColor: bleUiColors.dangerBg,
  },
  setupWarn: {
    flex: 1,
    color: bleUiColors.dangerText,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  metricChip: {
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: bleUiRadii.sm,
  },
  metricNeutral: { backgroundColor: bleUiColors.primarySoft },
  metricOk: { backgroundColor: bleUiColors.successBg },
  metricWarn: { backgroundColor: bleUiColors.dangerBg },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: bleUiColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: { marginTop: 2, fontSize: 14, fontWeight: '700' },
  metricValueNeutral: { color: bleUiColors.primary },
  metricValueOk: { color: bleUiColors.successText },
  metricValueWarn: { color: bleUiColors.dangerText },
  actions: { marginTop: 14, gap: 10 },
  sectionTitle: {
    fontWeight: '700',
    color: bleUiColors.text,
    fontSize: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  listFlex: { flex: 1, minHeight: 0 },
  listContent: { paddingBottom: 36, flexGrow: 1 },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
    backgroundColor: bleUiColors.bgElevated,
    borderRadius: bleUiRadii.lg,
    borderWidth: 1,
    borderColor: bleUiColors.border,
  },
  empty: { color: bleUiColors.text, fontWeight: '700', fontSize: 15 },
  emptyHint: { color: bleUiColors.textMuted, fontSize: 13 },
  logRow: {
    backgroundColor: bleUiColors.bgElevated,
    borderWidth: 1,
    borderColor: bleUiColors.border,
    borderRadius: bleUiRadii.md,
    padding: 14,
    marginBottom: 10,
    ...bleUiShadows.card,
  },
  logTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  logTitle: { fontWeight: '700', color: bleUiColors.text, fontSize: 14 },
  logRssi: { fontWeight: '700', color: bleUiColors.primary, fontSize: 12 },
  logBody: { color: bleUiColors.textSecondary, marginTop: 3, fontSize: 13, lineHeight: 18 },
  logMeta: { color: bleUiColors.textFaint, marginTop: 6, fontSize: 11 },
});
