import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BLE_IDENTITY_WAIT_MS } from '../constants/bleCardRules';
import {
  BLE_ZONE_HOLD_MS,
  BLE_ZONE_SWITCH_MARGIN_DB,
  DEFAULT_BLE_EXIT_TIMEOUT_MS,
  DEFAULT_BLE_PRESENT_INTERVAL_MS,
  DEFAULT_VAN_GPS_PUBLISH_INTERVAL_MS,
  VAN_GPS_MIN_MOVE_METERS,
} from '../constants/bleGatewayDefaults';
import {
  postBleCaptureToSchoolServer,
  shouldEnqueueBleCaptureOffline,
} from '../services/bleCaptureUploadApi';
import { BleCardPresenceEventEngine } from '../services/bleCardEventEngine';
import {
  enqueueBleCaptureForOfflineRetry,
  flushBleOfflineCaptureQueue,
  getBleOfflineCaptureQueueSize,
} from '../services/bleOfflineCaptureQueue';
import {
  getBlePhoneScanOwnerRole,
  isBlePhoneScanActive,
  startBlePhoneScan,
  stopBlePhoneScan,
} from '../services/blePhoneScannerService';
import {
  getDriverVanGpsPublishStatusMessage,
  isDriverVanGpsPublishingActive,
  startDriverVanGpsPublishing,
  stopDriverVanGpsPublishing,
} from '../services/driverVanLocationPublisher';
import { BleZoneCardTracker } from '../services/bleZoneCardTracker';
import { loadBleGatewaySettings } from '../storage/bleGatewaySettingsStorage';
import { buildBleCaptureUploadPayload } from '../utils/bleCapturePayloadBuilder';
import {
  buildUnknownBleDebugCard,
  describeBleCardForLog,
} from '../utils/bleCardClassifier';
import { buildLocalIsoTimestampNow } from '../utils/bleTimeHelpers';
import {
  hasBleZoneConfigured,
  resolveBleFixedZoneGatewayMac,
  resolveBleZoneCardMacAddresses,
} from '../utils/bleZoneCardHelpers';

// Why: keep the on-screen capture log short so FlatList stays fast.
const BLE_GATEWAY_MAX_LOG_ROWS = 100;
// Why: poll EXIT / active zone / GPS status once per second while Gateway scan is running.
const BLE_GATEWAY_EXIT_POLL_INTERVAL_MS = 1_000;

/** Choose the classified card to upload, or a debug unknown card when allowed. */
function pickBleCardForUpload(scannedBeacon, isUnfilteredDebugMode) {
  // Why: production path prefers a card that matched Type A / Type B rules.
  if (scannedBeacon.card) return scannedBeacon.card;
  // Why: normal mode never uploads unclassified BLE noise.
  if (!isUnfilteredDebugMode) return null;
  // Why: debug mode wraps any MAC so the server can reject unmapped identities.
  return buildUnknownBleDebugCard({
    mac: scannedBeacon.dmac,
    localName: scannedBeacon.localName,
    rssi: scannedBeacon.rssi,
    rawHex: scannedBeacon.rawHex,
    detectedAt: scannedBeacon.seenAt,
  });
}

/**
 * Gateway scan session for the driver phone.
 * BLE → /api/ble_capture (students). GPS → /api/ble_vehicle_data_capture (live tracking). Separate.
 */
export function useBleGatewayCapture(settingsVersion) {
  // Why: hold the latest saved Gateway settings for the status card.
  const [gatewaySettings, setGatewaySettings] = useState(null);
  // Why: true while gateway-owned BLE scan is active (survives leaving the Devices screen).
  const [isGatewayScanning, setIsGatewayScanning] = useState(
    () => isBlePhoneScanActive() && getBlePhoneScanOwnerRole() === 'gateway',
  );
  // Why: short status line shown under the Gateway info card.
  const [gatewayScanStatusMessage, setGatewayScanStatusMessage] = useState('Idle');
  // Why: separate GPS status so drivers see live-tracking posts without mixing BLE logs.
  const [vanGpsPublishStatusMessage, setVanGpsPublishStatusMessage] = useState(
    getDriverVanGpsPublishStatusMessage(),
  );
  // Why: show how many captures are waiting for flush.
  const [offlineCaptureQueueSize, setOfflineCaptureQueueSize] = useState(0);
  // Why: count successful BLE HTTP posts in this session.
  const [successfulCapturePostCount, setSuccessfulCapturePostCount] = useState(0);
  // Why: recent capture log rows for the Gateway screen list.
  const [captureDetectionLogs, setCaptureDetectionLogs] = useState([]);
  // Why: show which zone-card MAC is currently active in zoneCard mode.
  const [trackedZoneCardMac, setTrackedZoneCardMac] = useState(null);

  // Why: presence engine lives across packets without resetting React state.
  const cardPresenceEngineRef = useRef(
    new BleCardPresenceEventEngine(DEFAULT_BLE_PRESENT_INTERVAL_MS, DEFAULT_BLE_EXIT_TIMEOUT_MS),
  );
  // Why: zone tracker picks the strongest zone card when following beacons.
  const zoneCardTrackerRef = useRef(new BleZoneCardTracker(BLE_ZONE_HOLD_MS, BLE_ZONE_SWITCH_MARGIN_DB));
  // Why: packet handler reads latest settings without stale closures.
  const gatewaySettingsRef = useRef(null);
  // Why: fixed phone GMAC is resolved once per settings load.
  const fixedZoneGatewayMacRef = useRef(null);
  // Why: keep a stable beacon handler ref for re-attach after Home → Devices return.
  const handleScannedBeaconForGatewayRef = useRef(null);

  // Why: derive zone-card MAC list for the status card.
  const zoneCardMacAddresses = useMemo(
    () => (gatewaySettings ? resolveBleZoneCardMacAddresses(gatewaySettings) : []),
    [gatewaySettings],
  );
  // Why: fixed MAC when this phone is the gateway itself.
  const fixedZoneGatewayMac = useMemo(
    () => (gatewaySettings ? resolveBleFixedZoneGatewayMac(gatewaySettings) : null),
    [gatewaySettings],
  );
  // Why: Start scan is blocked until zone is configured.
  const isZoneConfigured = gatewaySettings ? hasBleZoneConfigured(gatewaySettings) : false;

  /** Reload settings from AsyncStorage and reconfigure engines. */
  const refreshGatewaySettingsFromStorage = useCallback(async () => {
    // Why: always read disk so Save on the config screen is picked up.
    const nextGatewaySettings = await loadBleGatewaySettings();
    // Why: update React state for the status card.
    setGatewaySettings(nextGatewaySettings);
    // Why: packet path uses the ref so it never sees a stale settings object.
    gatewaySettingsRef.current = nextGatewaySettings;
    // Why: cache fixed GMAC for O(1) lookup on every advertisement.
    fixedZoneGatewayMacRef.current = resolveBleFixedZoneGatewayMac(nextGatewaySettings);
    // Why: apply PRESENT/EXIT windows from Settings without remounting.
    cardPresenceEngineRef.current.configurePresenceWindows(
      nextGatewaySettings.presentIntervalMs,
      nextGatewaySettings.exitTimeoutMs,
    );
    // Why: tell the zone tracker which MACs count as zone cards.
    zoneCardTrackerRef.current.setTrackedZoneCardMacAddresses(
      resolveBleZoneCardMacAddresses(nextGatewaySettings),
    );
    // Why: refresh queue badge after settings load / flush.
    setOfflineCaptureQueueSize(await getBleOfflineCaptureQueueSize());
  }, []);

  useEffect(() => {
    // Why: load settings on mount and whenever Save bumps settingsVersion.
    refreshGatewaySettingsFromStorage();
  }, [refreshGatewaySettingsFromStorage, settingsVersion]);

  /** Push one log row to the top of the capture list. */
  const pushCaptureDetectionLog = useCallback((logItemWithoutId) => {
    // Why: each row needs a unique key for FlatList.
    const logRow = {
      ...logItemWithoutId,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    // Why: newest first, capped so memory stays bounded.
    setCaptureDetectionLogs((previousLogs) =>
      [logRow, ...previousLogs].slice(0, BLE_GATEWAY_MAX_LOG_ROWS),
    );
  }, []);

  /** POST one ENTER/PRESENT student/staff capture (no lat/long). */
  const uploadBleCardCapture = useCallback(
    async (classifiedCard, eventKind, zoneGatewayMac) => {
      // Why: ignore packets if settings were cleared mid-scan.
      const currentGatewaySettings = gatewaySettingsRef.current;
      if (!currentGatewaySettings) return;

      // Why: BLE student detection body has no Latitude/Longitude by design.
      const capturePayload = buildBleCaptureUploadPayload({
        gatewayId: currentGatewaySettings.gatewayId,
        gmac: zoneGatewayMac,
        card: classifiedCard,
      });
      // Why: skip when neither DMAC nor UUID can be sent.
      if (!capturePayload) return;

      // Why: shared fields for sent / queued / error log rows.
      const logBaseFields = {
        at: capturePayload.time,
        cardId: classifiedCard.cardId,
        dmac: classifiedCard.mac ?? undefined,
        name: describeBleCardForLog(classifiedCard),
        rssi: classifiedCard.rssi,
      };

      // Why: POST immediately when Wi-Fi reaches the school server.
      const uploadResult = await postBleCaptureToSchoolServer(
        currentGatewaySettings,
        capturePayload,
      );
      if (uploadResult.ok) {
        // Why: bump the Posted chip on success.
        setSuccessfulCapturePostCount((count) => count + 1);
        pushCaptureDetectionLog({
          ...logBaseFields,
          status: 'sent',
          message: `${eventKind} · HTTP ${uploadResult.status}`,
        });
        return;
      }

      // Why: only queue transport/5xx — never retry bad GMAC/mapping 4xx forever.
      if (shouldEnqueueBleCaptureOffline(uploadResult)) {
        await enqueueBleCaptureForOfflineRetry(capturePayload);
        setOfflineCaptureQueueSize(await getBleOfflineCaptureQueueSize());
        pushCaptureDetectionLog({
          ...logBaseFields,
          status: 'queued',
          message: uploadResult.error,
        });
        return;
      }

      // Why: show permanent mapping errors so the driver can fix Settings.
      pushCaptureDetectionLog({
        ...logBaseFields,
        status: 'error',
        message: uploadResult.error,
      });
    },
    [pushCaptureDetectionLog],
  );

  /** Handle one merged beacon from the native scanner. */
  const handleScannedBeaconForGateway = useCallback(
    (scannedBeacon) => {
      // Why: ignore packets when settings are missing or RSSI is too weak.
      const currentGatewaySettings = gatewaySettingsRef.current;
      if (!currentGatewaySettings || scannedBeacon.rssi < currentGatewaySettings.minRssi) return;

      // Why: zone cards update the active GMAC and are never uploaded as people.
      const zoneCardTracker = zoneCardTrackerRef.current;
      if (zoneCardTracker.isConfiguredZoneCardMac(scannedBeacon.dmac)) {
        zoneCardTracker.observeZoneCardAdvertisement(
          scannedBeacon.dmac,
          scannedBeacon.rssi,
          scannedBeacon.seenAt,
        );
        setTrackedZoneCardMac(zoneCardTracker.resolveActiveZoneCardMac(scannedBeacon.seenAt));
        return;
      }

      // Why: phone mode uses fixed GMAC; zone-card mode uses the tracked zone MAC.
      const zoneGatewayMac =
        fixedZoneGatewayMacRef.current ??
        zoneCardTracker.resolveActiveZoneCardMac(scannedBeacon.seenAt);
      // Why: do not upload person cards until a zone is known.
      if (!zoneGatewayMac) return;

      // Why: pick Type A/B card or debug unknown when enabled.
      const classifiedCard = pickBleCardForUpload(
        scannedBeacon,
        currentGatewaySettings.unfilteredDebugMode,
      );
      if (!classifiedCard) return;

      // Why: wait briefly for Type A scan-response name before MAC-only upload.
      const isWaitingForCardName =
        !classifiedCard.identityComplete &&
        scannedBeacon.seenAt - scannedBeacon.firstSeenAt < BLE_IDENTITY_WAIT_MS;
      if (isWaitingForCardName) return;

      // Why: ENTER/PRESENT keyed by card@zone so moving zones re-ENTER correctly.
      const eventKind = cardPresenceEngineRef.current.observeCardSighting(
        `${classifiedCard.mac ?? classifiedCard.cardId}@${zoneGatewayMac}`,
        classifiedCard.rssi,
        scannedBeacon.seenAt,
      );
      // Why: null means inside the PRESENT quiet window — no upload this packet.
      if (eventKind) void uploadBleCardCapture(classifiedCard, eventKind, zoneGatewayMac);
    },
    [uploadBleCardCapture],
  );

  // Why: keep ref current so remount re-attach uses the latest handler.
  handleScannedBeaconForGatewayRef.current = handleScannedBeaconForGateway;

  useEffect(() => {
    // Why: when returning from Home, re-attach JS callbacks without restarting native scan.
    if (!(isBlePhoneScanActive() && getBlePhoneScanOwnerRole() === 'gateway')) return undefined;
    setIsGatewayScanning(true);
    void startBlePhoneScan(
      {
        onBeacon: (beacon) => handleScannedBeaconForGatewayRef.current?.(beacon),
        onError: (errorMessage) => {
          setGatewayScanStatusMessage(errorMessage);
          setIsGatewayScanning(false);
          // Why: BLE died — stop GPS too so live tracking does not claim a dead gateway.
          stopDriverVanGpsPublishing();
          setVanGpsPublishStatusMessage(getDriverVanGpsPublishStatusMessage());
        },
        onStatus: setGatewayScanStatusMessage,
      },
      'gateway',
    );
    // Why: DO NOT stop BLE/GPS on unmount — Back to Home must keep both running.
    return undefined;
  }, []);

  useEffect(() => {
    // Why: EXIT polling only runs while Gateway scan is active.
    if (!isGatewayScanning) return undefined;
    const exitPollTimerId = setInterval(() => {
      // Why: refresh sticky zone MAC for the status card.
      setTrackedZoneCardMac(zoneCardTrackerRef.current.resolveActiveZoneCardMac());
      // Why: refresh GPS status chip from the publisher singleton.
      setVanGpsPublishStatusMessage(getDriverVanGpsPublishStatusMessage());
      // Why: local EXIT notes help drivers understand silence checkout.
      for (const exitedCardKey of cardPresenceEngineRef.current.pollSilentCardExits()) {
        pushCaptureDetectionLog({
          at: buildLocalIsoTimestampNow(),
          name: exitedCardKey,
          rssi: -100,
          status: 'skipped',
          message: 'Left range. Kept on the phone only; the server checks out on silence.',
        });
      }
    }, BLE_GATEWAY_EXIT_POLL_INTERVAL_MS);
    // Why: clear the interval when scan stops or the hook unmounts.
    return () => clearInterval(exitPollTimerId);
  }, [isGatewayScanning, pushCaptureDetectionLog]);

  /** Start continuous GPS publishing for van live tracking (separate from BLE). */
  const startVanGpsAlongsideGatewayScan = useCallback(async (currentGatewaySettings) => {
    // Why: GPS uses the same van GMAC admin assigned on the Vehicle form.
    const vanGmac =
      resolveBleFixedZoneGatewayMac(currentGatewaySettings) ||
      String(currentGatewaySettings.gmac || '').trim();
    await startDriverVanGpsPublishing({
      apiBaseUrl: currentGatewaySettings.apiBaseUrl,
      gmac: vanGmac,
      gatewayId: currentGatewaySettings.gatewayId,
      intervalMs:
        currentGatewaySettings.gpsPublishIntervalMs || DEFAULT_VAN_GPS_PUBLISH_INTERVAL_MS,
      minMoveMeters:
        currentGatewaySettings.gpsMinMoveMeters || VAN_GPS_MIN_MOVE_METERS,
    });
    setVanGpsPublishStatusMessage(getDriverVanGpsPublishStatusMessage());
  }, []);

  /** Start or stop Gateway BLE + van GPS from the Start/Stop button. */
  const toggleBleGatewayScan = useCallback(async () => {
    // Why: second tap stops only when Gateway currently owns the scan.
    if (isBlePhoneScanActive() && getBlePhoneScanOwnerRole() === 'gateway') {
      // Why: Stop is the only place we kill BLE after Home navigation was allowed to keep it.
      stopBlePhoneScan('gateway');
      // Why: GPS is independent of student BLE but shares the same Start/Stop UX.
      stopDriverVanGpsPublishing();
      setIsGatewayScanning(false);
      setGatewayScanStatusMessage('Stopped');
      setVanGpsPublishStatusMessage(getDriverVanGpsPublishStatusMessage());
      return;
    }

    // Why: reload Settings so GMAC/API changes apply before start.
    await refreshGatewaySettingsFromStorage();
    const currentGatewaySettings = gatewaySettingsRef.current;
    if (!currentGatewaySettings || !hasBleZoneConfigured(currentGatewaySettings)) {
      setGatewayScanStatusMessage(
        currentGatewaySettings?.zoneSource === 'zoneCard'
          ? 'Set the zone card MAC in BLE Settings first'
          : 'Set the gateway MAC in BLE Settings first',
      );
      return;
    }
    if (!String(currentGatewaySettings.apiBaseUrl || '').trim()) {
      setGatewayScanStatusMessage('Set API Base URL in BLE Settings first');
      return;
    }

    // Why: clear presence/zone memory so a new session starts clean.
    cardPresenceEngineRef.current.resetAllCardTracks();
    zoneCardTrackerRef.current.resetZoneTracking();
    setTrackedZoneCardMac(null);

    // Why: start native BLE scan owned by the gateway role (background service on).
    await startBlePhoneScan(
      {
        onBeacon: (beacon) => handleScannedBeaconForGatewayRef.current?.(beacon),
        onError: (errorMessage) => {
          setGatewayScanStatusMessage(errorMessage);
          setIsGatewayScanning(false);
          stopDriverVanGpsPublishing();
          setVanGpsPublishStatusMessage(getDriverVanGpsPublishStatusMessage());
        },
        onStatus: setGatewayScanStatusMessage,
      },
      'gateway',
    );
    // Why: confirm ownership before flipping the scanning flag true.
    const scanningNow = isBlePhoneScanActive() && getBlePhoneScanOwnerRole() === 'gateway';
    setIsGatewayScanning(scanningNow);
    // Why: start GPS only after BLE started successfully — still a separate HTTP pipeline.
    if (scanningNow) {
      await startVanGpsAlongsideGatewayScan(currentGatewaySettings);
    }
  }, [refreshGatewaySettingsFromStorage, startVanGpsAlongsideGatewayScan]);

  /** Replay the offline BLE queue against the current API settings. */
  const flushBleOfflineCaptureQueueNow = useCallback(async () => {
    // Why: use live settings, or reload if the ref is empty.
    const currentGatewaySettings =
      gatewaySettingsRef.current ?? (await loadBleGatewaySettings());
    const flushResult = await flushBleOfflineCaptureQueue(currentGatewaySettings);
    setOfflineCaptureQueueSize(flushResult.remaining);
    setGatewayScanStatusMessage(
      `Flushed ${flushResult.sent}, remaining ${flushResult.remaining}`,
    );
  }, []);

  // Why: screen reads this object for status, logs, and actions.
  return {
    gatewaySettings,
    zoneCardMacAddresses,
    isZoneConfigured,
    activeZoneGatewayMac: fixedZoneGatewayMac ?? trackedZoneCardMac,
    isGatewayScanning,
    gatewayScanStatusMessage,
    isVanGpsPublishing: isDriverVanGpsPublishingActive(),
    vanGpsPublishStatusMessage,
    offlineCaptureQueueSize,
    successfulCapturePostCount,
    captureDetectionLogs,
    toggleBleGatewayScan,
    flushBleOfflineCaptureQueueNow,
  };
}
