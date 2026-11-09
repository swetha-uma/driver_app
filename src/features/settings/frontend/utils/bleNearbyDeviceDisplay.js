import { getBleCardTypeLabel } from './bleCardClassifier';

// Why: smooth interval display so Reader rows do not jitter every packet.
const INTERVAL_SMOOTHING_WEIGHT = 0.3;

/** Build the title shown on a Reader list row. */
function buildNearbyDeviceDisplayName(scannedBeacon) {
  const localName = scannedBeacon.localName?.trim();
  if (scannedBeacon.card) {
    return `${localName ?? scannedBeacon.card.cardId} (${getBleCardTypeLabel(scannedBeacon.card.cardType)})`;
  }
  if (localName) return scannedBeacon.isIBeacon ? `${localName} (iBeacon)` : localName;
  if (scannedBeacon.isIBeacon) return 'iBeacon (unnamed)';
  return `BLE ${scannedBeacon.dmac.slice(-8)}`;
}

/** Exponential-smooth advertisement interval for the Reader UI. */
function smoothAdvertisementIntervalMs(previousIntervalMs, latestIntervalMs) {
  if (previousIntervalMs === null || previousIntervalMs === undefined) return latestIntervalMs;
  return Math.round(
    previousIntervalMs * (1 - INTERVAL_SMOOTHING_WEIGHT) +
      latestIntervalMs * INTERVAL_SMOOTHING_WEIGHT,
  );
}

/** Merge a scanned beacon into the Reader list model for one MAC. */
export function mapScannedBeaconToNearbyDeviceRow(scannedBeacon, existingNearbyDevice) {
  const latestIntervalMs = existingNearbyDevice
    ? scannedBeacon.seenAt - existingNearbyDevice.lastSeenAt
    : null;

  return {
    key: scannedBeacon.dmac,
    mac: scannedBeacon.dmac,
    localName: scannedBeacon.localName,
    name: buildNearbyDeviceDisplayName(scannedBeacon),
    rssi: scannedBeacon.rssi,
    lastSeenAt: scannedBeacon.seenAt,
    intervalMs:
      latestIntervalMs === null
        ? null
        : smoothAdvertisementIntervalMs(existingNearbyDevice?.intervalMs ?? null, latestIntervalMs),
    uuid: scannedBeacon.uuid,
    major: scannedBeacon.major,
    minor: scannedBeacon.minor,
    rawPowerByte: scannedBeacon.rawPowerByte,
    companyId: scannedBeacon.companyId,
    isIBeacon: scannedBeacon.isIBeacon,
    serviceUuids: scannedBeacon.serviceUuids,
    manufacturerHex: scannedBeacon.manufacturerHex,
    rawHex: scannedBeacon.rawHex,
    serviceDataSummary: scannedBeacon.serviceDataSummary,
    isConnectable: scannedBeacon.isConnectable,
    packetCount: scannedBeacon.packetCount,
    cardType: scannedBeacon.card?.cardType ?? null,
    cardId: scannedBeacon.card?.cardId ?? null,
  };
}

/** Format "last seen" relative text for Reader rows. */
export function formatNearbyDeviceLastSeenLabel(lastSeenAt, nowMillis = Date.now()) {
  const deltaMs = Math.max(0, nowMillis - lastSeenAt);
  if (deltaMs < 1000) return 'just now';
  if (deltaMs < 60_000) return `${Math.floor(deltaMs / 1000)}s ago`;
  return `${Math.floor(deltaMs / 60_000)}m ago`;
}
