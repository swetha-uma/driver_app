import { normalizeBleMacAddress } from './bleIdentifierHelpers';

/** Zone card MACs the phone must hear when zoneSource is zoneCard. */
export function resolveBleZoneCardMacAddresses(gatewaySettings) {
  // Why: phone-as-gateway mode never tracks zone cards.
  if (gatewaySettings.zoneSource === 'phone') return [];
  // Why: multi mode uses the full saved list of school-zone / vehicle MACs.
  if (gatewaySettings.zoneMode === 'multi') return gatewaySettings.zoneCardMacs || [];
  // Why: single mode reuses the GMAC field as the one zone card to follow.
  const singleZoneCardMac = normalizeBleMacAddress(gatewaySettings.gmac);
  return singleZoneCardMac ? [singleZoneCardMac] : [];
}

/** Fixed GMAC sent on every upload when this phone is the zone gateway. */
export function resolveBleFixedZoneGatewayMac(gatewaySettings) {
  // Why: zone-card mode derives GMAC from the heard card instead.
  if (gatewaySettings.zoneSource !== 'phone') return null;
  return normalizeBleMacAddress(gatewaySettings.gmac);
}

/** True when Settings has enough zone info to start Gateway scan. */
export function hasBleZoneConfigured(gatewaySettings) {
  // Why: either a fixed phone GMAC or at least one zone-card MAC unlocks Start scan.
  return (
    resolveBleFixedZoneGatewayMac(gatewaySettings) !== null ||
    resolveBleZoneCardMacAddresses(gatewaySettings).length > 0
  );
}
