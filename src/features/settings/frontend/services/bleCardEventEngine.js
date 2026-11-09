/**
 * Tracks per-card presence.
 * ENTER and PRESENT are uploaded; EXIT stays local so server checkout silence still works.
 */
export class BleCardPresenceEventEngine {
  // Why: store one track per cardKey (card + zone) so ENTER/PRESENT timing is independent.
  tracksByCardKey = new Map();

  constructor(presentIntervalMs, exitTimeoutMs) {
    // Why: copy constructor args into mutable fields so Settings can reconfigure live.
    this.presentIntervalMs = presentIntervalMs;
    this.exitTimeoutMs = exitTimeoutMs;
  }

  /** Apply new PRESENT / EXIT windows from Settings without resetting tracks. */
  configurePresenceWindows(presentIntervalMs, exitTimeoutMs) {
    // Why: never allow sub-second PRESENT spam.
    this.presentIntervalMs = Math.max(1000, presentIntervalMs);
    // Why: EXIT silence must be at least as long as PRESENT interval.
    this.exitTimeoutMs = Math.max(this.presentIntervalMs, exitTimeoutMs);
  }

  /** Observe a sighting; returns ENTER, PRESENT, or null while inside the quiet window. */
  observeCardSighting(cardKey, rssi, nowMillis = Date.now()) {
    const previousTrack = this.tracksByCardKey.get(cardKey);
    // Why: keep a short RSSI history for future tuning (not uploaded today).
    const rssiSamples = [...(previousTrack?.rssiSamples ?? []), rssi].slice(-8);
    const isAbsent =
      !previousTrack ||
      previousTrack.exited ||
      nowMillis - previousTrack.lastSeenAt > this.exitTimeoutMs;
    if (isAbsent) {
      // Why: first sighting (or return after silence) is always ENTER.
      this.tracksByCardKey.set(cardKey, {
        lastSeenAt: nowMillis,
        lastUploadAt: nowMillis,
        rssiSamples,
        exited: false,
      });
      return 'ENTER';
    }
    // Why: refresh last-seen so EXIT polling does not fire while packets continue.
    previousTrack.lastSeenAt = nowMillis;
    previousTrack.rssiSamples = rssiSamples;
    previousTrack.exited = false;
    if (nowMillis - previousTrack.lastUploadAt >= this.presentIntervalMs) {
      // Why: still-in-range heartbeat for the server presence TTL.
      previousTrack.lastUploadAt = nowMillis;
      return 'PRESENT';
    }
    // Why: inside the PRESENT window — no upload this packet.
    return null;
  }

  /** Card keys that went quiet; marks them exited so the next sighting is ENTER again. */
  pollSilentCardExits(nowMillis = Date.now()) {
    const exitedCardKeys = [];
    for (const [cardKey, track] of this.tracksByCardKey) {
      if (!track.exited && nowMillis - track.lastSeenAt > this.exitTimeoutMs) {
        track.exited = true;
        exitedCardKeys.push(cardKey);
      }
    }
    return exitedCardKeys;
  }

  /** Clear all tracks when Gateway scan stops or restarts. */
  resetAllCardTracks() {
    this.tracksByCardKey.clear();
  }
}
