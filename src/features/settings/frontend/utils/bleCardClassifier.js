import {
  BLE_CARD_IBEACON_UUIDS,
  BLE_CARD_NAME_PREFIXES,
  BLE_CARD_SERVICE_UUID_16,
  BLE_MAX_CARD_ID_LENGTH,
} from '../constants/bleCardRules';
import { normalizeBleMacAddress, normalizeBleUuid } from './bleIdentifierHelpers';

// Why: human labels for Reader rows and Gateway capture logs.
const BLE_CARD_TYPE_LABELS = {
  NAME_SERVICE: 'Type A',
  IBEACON: 'Type B',
  UNKNOWN: 'Other BLE',
};

/** Reduce full or short UUID text to a 4-hex 16-bit code when it is a Bluetooth base UUID. */
function extractShortUuid16(uuidText) {
  // Why: compare service markers as 180D regardless of 128-bit expansion.
  const upperUuid = String(uuidText).toUpperCase();
  if (/^[0-9A-F]{4}$/.test(upperUuid)) return upperUuid;
  const match = /^0000([0-9A-F]{4})-0000-1000-8000-00805F9B34FB$/.exec(upperUuid);
  return match ? match[1] : null;
}

/** Find service-data field that carries the Type A card marker UUID. */
function findCardServiceDataField(serviceDataFields) {
  // Why: Type A cards often put a power byte under service data 0x180D.
  return serviceDataFields.find((field) => extractShortUuid16(field.uuid) === BLE_CARD_SERVICE_UUID_16) ?? null;
}

/** True when the advertisement lists or carries the Type A service UUID. */
function advertisementHasCardService(advertisementSnapshot) {
  // Why: either the UUID list or service-data map can prove Type A.
  return (
    advertisementSnapshot.serviceUuids.some(
      (uuidText) => extractShortUuid16(uuidText) === BLE_CARD_SERVICE_UUID_16,
    ) || findCardServiceDataField(advertisementSnapshot.serviceData) !== null
  );
}

/** True when local name starts with a known card prefix (E0 / ET). */
function localNameMatchesCardPrefix(localName) {
  // Why: missing name cannot match a prefix rule.
  if (!localName) return false;
  const upperName = localName.toUpperCase();
  return BLE_CARD_NAME_PREFIXES.some((prefix) => upperName.startsWith(prefix.toUpperCase()));
}

/** Clamp card id length to the backend column size. */
function limitBleCardIdLength(cardId) {
  // Why: prevent 400s from oversized UUID/name strings.
  return cardId.slice(0, BLE_MAX_CARD_ID_LENGTH);
}

/** Classify Apple iBeacon packets into Type B cards when UUID or name matches. */
function classifyIbeaconCard(advertisementSnapshot, localName, macAddress) {
  const ibeacon = advertisementSnapshot.ibeacon;
  const beaconUuid = normalizeBleUuid(ibeacon?.uuid);
  // Why: without a proximity UUID this is not a Type B identity.
  if (!ibeacon || !beaconUuid) return null;
  const isKnownCardUuid = BLE_CARD_IBEACON_UUIDS.includes(beaconUuid.toUpperCase());
  // Why: allow ET-prefixed names even if UUID list grows later.
  if (!isKnownCardUuid && !localNameMatchesCardPrefix(localName)) return null;
  return {
    cardType: 'IBEACON',
    cardId: limitBleCardIdLength(beaconUuid),
    identityComplete: true,
    mac: macAddress,
    beaconUuid,
    major: ibeacon.major,
    minor: ibeacon.minor,
    localName,
    rssi: advertisementSnapshot.rssi,
    rawHex: advertisementSnapshot.rawHex,
    rawPowerByte: ibeacon.rawPowerByte,
    detectedAt: advertisementSnapshot.detectedAt,
  };
}

/** Classify name/service packets into Type A cards. */
function classifyNameServiceCard(advertisementSnapshot, localName, macAddress) {
  // Why: need service marker or name prefix to treat this as an ID card.
  if (!advertisementHasCardService(advertisementSnapshot) && !localNameMatchesCardPrefix(localName)) {
    return null;
  }
  // Why: prefer local name as card id; fall back to MAC until the name arrives.
  const cardId = localName ?? macAddress;
  if (!cardId) return null;
  return {
    cardType: 'NAME_SERVICE',
    cardId: limitBleCardIdLength(cardId),
    identityComplete: localName !== null,
    mac: macAddress,
    beaconUuid: null,
    major: null,
    minor: null,
    localName,
    rssi: advertisementSnapshot.rssi,
    rawHex: advertisementSnapshot.rawHex,
    rawPowerByte: findCardServiceDataField(advertisementSnapshot.serviceData)?.bytes[0] ?? null,
    detectedAt: advertisementSnapshot.detectedAt,
  };
}

/**
 * Production rule: a device is an ID card when ANY rule matches.
 * Type B iBeacon first, then Type A name/service.
 */
export function classifyBleAdvertisementAsCard(advertisementSnapshot) {
  // Why: normalize MAC once for both Type A and Type B paths.
  const macAddress = normalizeBleMacAddress(advertisementSnapshot.mac);
  const localName = advertisementSnapshot.localName?.trim() || null;
  return (
    classifyIbeaconCard(advertisementSnapshot, localName, macAddress) ??
    classifyNameServiceCard(advertisementSnapshot, localName, macAddress)
  );
}

/** Build a debug "unknown" card so unfiltered mode can still POST every BLE device. */
export function buildUnknownBleDebugCard(advertisementSnapshot) {
  const macAddress = normalizeBleMacAddress(advertisementSnapshot.mac);
  // Why: without a MAC the server cannot store a device row.
  if (!macAddress) return null;
  return {
    cardType: 'UNKNOWN',
    cardId: macAddress,
    identityComplete: true,
    mac: macAddress,
    beaconUuid: null,
    major: null,
    minor: null,
    localName: advertisementSnapshot.localName,
    rssi: advertisementSnapshot.rssi,
    rawHex: advertisementSnapshot.rawHex,
    rawPowerByte: null,
    detectedAt: advertisementSnapshot.detectedAt,
  };
}

/** Short label for UI badges (Type A / Type B / Other BLE). */
export function getBleCardTypeLabel(cardType) {
  // Why: Reader and Gateway logs show the friendly type name.
  return BLE_CARD_TYPE_LABELS[cardType] || cardType;
}

/** One-line description for capture log rows. */
export function describeBleCardForLog(classifiedCard) {
  // Why: log title needs type + identity in one short string.
  return `${getBleCardTypeLabel(classifiedCard.cardType)} · ${classifiedCard.cardId}`;
}
