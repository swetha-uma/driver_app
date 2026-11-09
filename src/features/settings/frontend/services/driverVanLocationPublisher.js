import * as Location from 'expo-location';

import {
  DEFAULT_VAN_GPS_CAPTURE_PATH,
  DEFAULT_VAN_GPS_PUBLISH_INTERVAL_MS,
  VAN_GPS_MIN_MOVE_METERS,
  VAN_GPS_PUBLISH_TIMEOUT_MS,
} from '../constants/bleGatewayDefaults';
import { normalizeBleApiBaseUrl } from '../utils/bleApiUrlHelpers';
import { buildLocalIsoTimestampNow } from '../utils/bleTimeHelpers';
import { isDriverForegroundLocationGranted } from './driverLocationPermission';
import {
  connectDriverVanGpsWebSocket,
  disconnectDriverVanGpsWebSocket,
  isDriverVanGpsWebSocketConnected,
  publishDriverVanGpsOverWebSocket,
} from './driverVanGpsWebSocket';

// Why: one timer for the whole app so Home remounts do not create duplicate GPS loops.
let vanGpsPublishTimerId = null;
// Why: remember the last publish config so we can restart after a settings change.
let activeVanGpsPublishConfig = null;
// Why: UI can show whether GPS publishing is live.
let isVanGpsPublishingActive = false;
// Why: last status string for the Gateway screen chip.
let lastVanGpsPublishStatusMessage = 'GPS idle';
// Why: skip overlapping ticks when GPS read or network is slow (phone hang risk).
let isVanGpsPublishInFlight = false;
// Why: skip tiny GPS jitter so parked vans do not spam the socket.
let lastPublishedLatitude = null;
let lastPublishedLongitude = null;

/** True while the continuous van GPS publisher is running. */
export function isDriverVanGpsPublishingActive() {
  return isVanGpsPublishingActive;
}

/** Latest human status for the Gateway info card. */
export function getDriverVanGpsPublishStatusMessage() {
  return lastVanGpsPublishStatusMessage;
}

/** Join API root and vehicle GPS path (HTTP fallback). */
function buildVanGpsCaptureUrl(apiBaseUrl) {
  const normalizedBase = normalizeBleApiBaseUrl(apiBaseUrl);
  return `${normalizedBase}${DEFAULT_VAN_GPS_CAPTURE_PATH}`;
}

/** Approximate metres between two WGS84 points (enough for 40m gate). */
function distanceMetersBetween(lat1, lon1, lat2, lon2) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}

/** Build the shared JSON body for HTTP and WebSocket ingest. */
function buildVanGpsPayload(publishConfig, latitude, longitude) {
  const localClock = buildLocalIsoTimestampNow();
  return {
    Gateway_ID: String(publishConfig.gatewayId || '').trim() || 'PHONE_LOCAL',
    GMAC: publishConfig.gmac,
    Latitude: latitude,
    Longitude: longitude,
    time: localClock,
    Timestamp: localClock,
  };
}

/** POST one GPS sample via HTTP (fallback when WebSocket is down). */
async function postVanGpsLocationToSchoolServer(publishConfig, payload) {
  const requestUrl = buildVanGpsCaptureUrl(publishConfig.apiBaseUrl);
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), VAN_GPS_PUBLISH_TIMEOUT_MS);
  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`GPS HTTP ${response.status}${errorBody ? ` · ${errorBody.slice(0, 80)}` : ''}`);
    }
    return true;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Read phone GPS once and publish over WebSocket (HTTP fallback). */
async function publishOneVanGpsSample() {
  if (!activeVanGpsPublishConfig) return;
  // Why: never stack GPS reads + network when the previous tick is still running.
  if (isVanGpsPublishInFlight) return;
  isVanGpsPublishInFlight = true;
  try {
    const isLocationGranted = await isDriverForegroundLocationGranted();
    if (!isLocationGranted) {
      lastVanGpsPublishStatusMessage = 'GPS blocked — allow Location for this app';
      return;
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const latitude = position?.coords?.latitude;
    const longitude = position?.coords?.longitude;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      lastVanGpsPublishStatusMessage = 'GPS reading unavailable';
      return;
    }

    // Why: skip jitter under ~40m so a parked van does not keep hitting the server.
    if (
      lastPublishedLatitude != null &&
      lastPublishedLongitude != null &&
      distanceMetersBetween(
        lastPublishedLatitude,
        lastPublishedLongitude,
        latitude,
        longitude,
      ) < (activeVanGpsPublishConfig.minMoveMeters || VAN_GPS_MIN_MOVE_METERS)
    ) {
      const minMoveMeters = activeVanGpsPublishConfig.minMoveMeters || VAN_GPS_MIN_MOVE_METERS;
      lastVanGpsPublishStatusMessage = `GPS idle · moved < ${minMoveMeters}m`;
      return;
    }

    const payload = buildVanGpsPayload(activeVanGpsPublishConfig, latitude, longitude);

    // Why: prefer STOMP WebSocket; fall back to HTTP if the socket is down.
    let sentOverWebSocket = false;
    if (isDriverVanGpsWebSocketConnected()) {
      sentOverWebSocket = publishDriverVanGpsOverWebSocket(payload);
    } else {
      try {
        await connectDriverVanGpsWebSocket(activeVanGpsPublishConfig.apiBaseUrl);
        sentOverWebSocket = publishDriverVanGpsOverWebSocket(payload);
      } catch {
        sentOverWebSocket = false;
      }
    }

    if (!sentOverWebSocket) {
      await postVanGpsLocationToSchoolServer(activeVanGpsPublishConfig, payload);
      lastVanGpsPublishStatusMessage = `GPS HTTP · ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    } else {
      lastVanGpsPublishStatusMessage = `GPS WS · ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }

    lastPublishedLatitude = latitude;
    lastPublishedLongitude = longitude;
  } catch (error) {
    lastVanGpsPublishStatusMessage =
      error instanceof Error ? `GPS error · ${error.message}` : 'GPS error';
  } finally {
    isVanGpsPublishInFlight = false;
  }
}

/**
 * Start continuous van GPS publishing (WebSocket first, HTTP fallback).
 * @param {{ apiBaseUrl: string, gmac: string, gatewayId?: string, intervalMs?: number, minMoveMeters?: number }} publishConfig
 */
export async function startDriverVanGpsPublishing(publishConfig) {
  const normalizedGmac = String(publishConfig?.gmac || '').trim();
  if (!normalizedGmac) {
    lastVanGpsPublishStatusMessage = 'GPS idle — set van Gateway MAC first';
    return;
  }
  if (!normalizeBleApiBaseUrl(publishConfig?.apiBaseUrl)) {
    lastVanGpsPublishStatusMessage = 'GPS idle — set API Base URL first';
    return;
  }

  stopDriverVanGpsPublishing();

  const minMoveMeters = Number(publishConfig.minMoveMeters);
  activeVanGpsPublishConfig = {
    apiBaseUrl: publishConfig.apiBaseUrl,
    gmac: normalizedGmac,
    gatewayId: publishConfig.gatewayId || 'PHONE_LOCAL',
    minMoveMeters:
      Number.isFinite(minMoveMeters) && minMoveMeters > 0
        ? minMoveMeters
        : VAN_GPS_MIN_MOVE_METERS,
  };
  isVanGpsPublishingActive = true;
  lastPublishedLatitude = null;
  lastPublishedLongitude = null;
  lastVanGpsPublishStatusMessage = 'GPS connecting…';

  // Why: open the socket once at Start so ticks only send frames.
  try {
    await connectDriverVanGpsWebSocket(activeVanGpsPublishConfig.apiBaseUrl);
    lastVanGpsPublishStatusMessage = 'GPS WebSocket connected';
  } catch {
    lastVanGpsPublishStatusMessage = 'GPS WebSocket unavailable — using HTTP';
  }

  await publishOneVanGpsSample();

  const intervalMs = Math.max(
    5_000,
    Number(publishConfig.intervalMs) || DEFAULT_VAN_GPS_PUBLISH_INTERVAL_MS,
  );
  vanGpsPublishTimerId = setInterval(() => {
    void publishOneVanGpsSample();
  }, intervalMs);
}

/** Stop continuous van GPS publishing (Stop scan / logout). */
export function stopDriverVanGpsPublishing() {
  if (vanGpsPublishTimerId) {
    clearInterval(vanGpsPublishTimerId);
    vanGpsPublishTimerId = null;
  }
  activeVanGpsPublishConfig = null;
  isVanGpsPublishingActive = false;
  isVanGpsPublishInFlight = false;
  lastPublishedLatitude = null;
  lastPublishedLongitude = null;
  lastVanGpsPublishStatusMessage = 'GPS stopped';
  // Why: close the socket so logout does not keep a live tracking channel open.
  void disconnectDriverVanGpsWebSocket();
}
