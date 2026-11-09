import { normalizeBleMacAddress } from './bleIdentifierHelpers';
import { buildLocalIsoTimestampFromMillis } from './bleTimeHelpers';

/**
 * Build POST /api/ble_capture body for one card sighting.
 * DMAC is always the radio MAC; UUID carries Type A name or Type B proximity UUID.
 */
export function buildBleCaptureUploadPayload({ gatewayId, gmac, card }) {
  // Why: normalize MAC so ERP matching is case/format insensitive.
  const macAddress = normalizeBleMacAddress(card.mac);
  // Why: when cardId is only the MAC, UUID is redundant with DMAC.
  const matchIdentity =
    card.cardType === 'UNKNOWN' || card.cardId === card.mac ? null : card.cardId;
  // Why: server needs at least one of DMAC or UUID to map the person.
  if (!macAddress && !matchIdentity) return null;

  // Why: use the detection clock so ENTER/PRESENT timestamps match the packet.
  const localClock = buildLocalIsoTimestampFromMillis(card.detectedAt);
  const payload = {
    Gateway_ID: String(gatewayId || '').trim() || 'PHONE_LOCAL',
    GMAC: gmac,
    RSSI: String(card.rssi),
    time: localClock,
    Timestamp: localClock,
    cardType: card.cardType,
    cardId: card.cardId,
    detectedAt: new Date(card.detectedAt).toISOString(),
  };

  // Why: DMAC lets the server match MAC-mapped BLE users.
  if (macAddress) payload.DMAC = macAddress;
  // Why: UUID carries the mapped card identity for name/iBeacon cards.
  if (matchIdentity) payload.UUID = matchIdentity;
  // Why: Local_Name helps debugging when UUID mapping fails.
  if (card.localName) payload.Local_Name = card.localName;
  // Why: Major/Minor are part of Type B iBeacon detail (server may ignore extras).
  if (card.major !== null && card.major !== undefined) payload.Major = card.major;
  if (card.minor !== null && card.minor !== undefined) payload.Minor = card.minor;
  if (card.beaconUuid) payload.beaconUuid = card.beaconUuid;
  if (card.rawHex) payload.rawHex = card.rawHex;
  if (card.rawPowerByte !== null && card.rawPowerByte !== undefined) {
    payload.rawPowerByte = card.rawPowerByte;
  }

  return payload;
}
