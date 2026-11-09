import { parseBleAdvertisementHexDump } from '../utils/bleAdvertisementParser';
import { classifyBleAdvertisementAsCard } from '../utils/bleCardClassifier';
import { normalizeBleMacAddress } from '../utils/bleIdentifierHelpers';

// Why: drop devices not heard for 5 minutes so memory stays bounded on long trips.
const STALE_DEVICE_AFTER_MS = 5 * 60_000;
// Why: prune only every N packets to avoid Map walks on every advertisement.
const PRUNE_EVERY_PACKETS = 300;
// Why: native sometimes omits RSSI — use a weak default so filters still apply.
const UNKNOWN_RSSI = -100;

/** Format company id from the first two manufacturer bytes. */
function formatManufacturerCompanyId(manufacturerBytes) {
  if (!manufacturerBytes || manufacturerBytes.length < 2) return null;
  const companyId = manufacturerBytes[0] | (manufacturerBytes[1] << 8);
  return `0x${companyId.toString(16).toUpperCase().padStart(4, '0')}`;
}

/** Merge unique service UUID strings from previous and current packets. */
function mergeUniqueServiceUuids(previousUuids, incomingUuids) {
  return [...new Set([...(previousUuids ?? []), ...incomingUuids])];
}

/** Merge service-data fields by UUID so later packets overwrite earlier ones. */
function mergeServiceDataFields(previousFields, incomingFields) {
  const fieldsByUuid = new Map();
  for (const field of previousFields ?? []) fieldsByUuid.set(field.uuid, field);
  for (const field of incomingFields) fieldsByUuid.set(field.uuid, field);
  return [...fieldsByUuid.values()];
}

/** Clean null bytes from BLE names. */
function cleanAdvertisedLocalName(rawName) {
  const cleanedName = rawName?.replace(/\0/g, '').trim();
  return cleanedName ? cleanedName : null;
}

/** Build the ScannedBeacon shape Gateway and Reader both consume. */
function buildScannedBeaconFromDeviceState(deviceState) {
  const classifiedCard = classifyBleAdvertisementAsCard({
    mac: deviceState.mac,
    localName: deviceState.localName,
    rssi: deviceState.rssi,
    ibeacon: deviceState.ibeacon,
    serviceUuids: deviceState.serviceUuids,
    serviceData: deviceState.serviceData,
    rawHex: deviceState.rawHex,
    detectedAt: deviceState.lastSeenAt,
  });

  const serviceDataSummary =
    deviceState.serviceData.length > 0
      ? deviceState.serviceData
          .map((field) => `${field.uuid.slice(4, 8)}: ${field.hex}`)
          .join(' | ')
      : null;

  return {
    dmac: deviceState.mac,
    localName: deviceState.localName,
    rssi: deviceState.rssi,
    uuid: deviceState.ibeacon?.uuid ?? null,
    major: deviceState.ibeacon?.major ?? null,
    minor: deviceState.ibeacon?.minor ?? null,
    rawPowerByte: classifiedCard?.rawPowerByte ?? deviceState.ibeacon?.rawPowerByte ?? null,
    companyId: formatManufacturerCompanyId(deviceState.manufacturerBytes),
    isIBeacon: deviceState.ibeacon !== null,
    serviceUuids: deviceState.serviceUuids,
    manufacturerHex: deviceState.manufacturerHex,
    rawHex: deviceState.rawHex,
    serviceDataSummary,
    isConnectable: deviceState.isConnectable,
    firstSeenAt: deviceState.firstSeenAt,
    seenAt: deviceState.lastSeenAt,
    packetCount: deviceState.packetCount,
    card: classifiedCard,
  };
}

/**
 * Merges advertisement + scan-response packets per MAC so classification
 * uses the complete picture, not whichever packet arrived last.
 */
export class BleAdvertisementPacketAggregator {
  // Why: one DeviceState per MAC across the scan session.
  devicesByMac = new Map();

  // Why: count packets since last prune.
  packetsSincePrune = 0;

  /** Clear all device state when a new scan session starts. */
  resetAggregatedDevices() {
    this.devicesByMac.clear();
    this.packetsSincePrune = 0;
  }

  /** Ingest one native advertisement event; returns a ScannedBeacon or null. */
  ingestNativeAdvertisement(nativeAdvertisement, nowMillis = Date.now()) {
    const macAddress = normalizeBleMacAddress(nativeAdvertisement.mac);
    // Why: ignore packets without a usable MAC.
    if (!macAddress) return null;

    const parsedAdvertisement = parseBleAdvertisementHexDump(nativeAdvertisement.rawHex);
    const previousState = this.devicesByMac.get(macAddress);

    const nextState = {
      mac: macAddress,
      firstSeenAt: previousState?.firstSeenAt ?? nowMillis,
      lastSeenAt: nowMillis,
      packetCount: (previousState?.packetCount ?? 0) + 1,
      rssi: nativeAdvertisement.rssi ?? UNKNOWN_RSSI,
      localName:
        cleanAdvertisedLocalName(nativeAdvertisement.name) ??
        parsedAdvertisement.localName ??
        previousState?.localName ??
        null,
      manufacturerBytes:
        parsedAdvertisement.manufacturerBytes ?? previousState?.manufacturerBytes ?? null,
      manufacturerHex:
        parsedAdvertisement.manufacturerHex ?? previousState?.manufacturerHex ?? null,
      ibeacon: parsedAdvertisement.ibeacon ?? previousState?.ibeacon ?? null,
      serviceUuids: mergeUniqueServiceUuids(
        previousState?.serviceUuids,
        parsedAdvertisement.serviceUuids,
      ),
      serviceData: mergeServiceDataFields(
        previousState?.serviceData,
        parsedAdvertisement.serviceData,
      ),
      rawHex: nativeAdvertisement.rawHex ?? previousState?.rawHex ?? null,
      isConnectable:
        nativeAdvertisement.isConnectable ?? previousState?.isConnectable ?? null,
    };

    this.devicesByMac.set(macAddress, nextState);
    this.pruneStaleDevices(nowMillis);
    return buildScannedBeaconFromDeviceState(nextState);
  }

  /** Remove MACs not heard recently so long Gateway sessions stay light. */
  pruneStaleDevices(nowMillis) {
    this.packetsSincePrune += 1;
    if (this.packetsSincePrune < PRUNE_EVERY_PACKETS) return;
    this.packetsSincePrune = 0;
    for (const [macAddress, deviceState] of this.devicesByMac) {
      if (nowMillis - deviceState.lastSeenAt > STALE_DEVICE_AFTER_MS) {
        this.devicesByMac.delete(macAddress);
      }
    }
  }
}
