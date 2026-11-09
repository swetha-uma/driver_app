/**
 * Tracks which zone card the phone is currently inside.
 * Strongest recently heard zone card wins; switches only with a clear RSSI margin.
 */
export class BleZoneCardTracker {
  // Why: remember last RSSI/time per configured zone-card MAC.
  sightingsByMac = new Map();

  // Why: only configured zone MACs can become the active GMAC.
  zoneCardMacSet = new Set();

  // Why: sticky active zone until a stronger card wins or hold time expires.
  activeZoneMac = null;

  constructor(holdMs, switchMarginDb) {
    // Why: hold/switch come from defaults so multi-zone vans do not flicker.
    this.holdMs = holdMs;
    this.switchMarginDb = switchMarginDb;
  }

  /** Replace the set of zone-card MACs from Settings. */
  setTrackedZoneCardMacAddresses(zoneCardMacAddresses) {
    this.zoneCardMacSet = new Set(zoneCardMacAddresses);
    // Why: drop sightings for MACs the driver removed from Settings.
    for (const macAddress of this.sightingsByMac.keys()) {
      if (!this.zoneCardMacSet.has(macAddress)) this.sightingsByMac.delete(macAddress);
    }
    if (this.activeZoneMac && !this.zoneCardMacSet.has(this.activeZoneMac)) {
      this.activeZoneMac = null;
    }
  }

  /** True when this MAC is configured as a zone/gateway card (not a person card). */
  isConfiguredZoneCardMac(macAddress) {
    return this.zoneCardMacSet.has(macAddress);
  }

  /** Record a zone-card advertisement for later resolve. */
  observeZoneCardAdvertisement(macAddress, rssi, nowMillis = Date.now()) {
    if (!this.zoneCardMacSet.has(macAddress)) return;
    this.sightingsByMac.set(macAddress, { rssi, lastSeenAt: nowMillis });
  }

  /** Return the active zone-card MAC, or null when none were heard within hold time. */
  resolveActiveZoneCardMac(nowMillis = Date.now()) {
    let strongestMac = null;
    let strongestRssi = -Infinity;
    for (const [macAddress, sighting] of this.sightingsByMac) {
      if (nowMillis - sighting.lastSeenAt > this.holdMs) {
        // Why: drop stale zone cards so GMAC does not stick forever after walking away.
        this.sightingsByMac.delete(macAddress);
      } else if (sighting.rssi > strongestRssi) {
        strongestMac = macAddress;
        strongestRssi = sighting.rssi;
      }
    }

    const activeSighting = this.activeZoneMac
      ? this.sightingsByMac.get(this.activeZoneMac)
      : undefined;
    // Why: switch only when another zone is clearly stronger (margin) or active went quiet.
    if (!activeSighting || strongestRssi >= activeSighting.rssi + this.switchMarginDb) {
      this.activeZoneMac = strongestMac;
    }
    return this.activeZoneMac;
  }

  /** Clear zone memory when Gateway scan restarts. */
  resetZoneTracking() {
    this.sightingsByMac.clear();
    this.activeZoneMac = null;
  }
}
