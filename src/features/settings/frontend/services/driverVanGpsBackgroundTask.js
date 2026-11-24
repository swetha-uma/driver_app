import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import {
  DEFAULT_VAN_GPS_CAPTURE_PATH,
  VAN_GPS_MIN_MOVE_METERS,
} from '../constants/bleGatewayDefaults';
import { normalizeBleApiBaseUrl } from '../utils/bleApiUrlHelpers';
import { buildLocalIsoTimestampNow } from '../utils/bleTimeHelpers';

/** Background location task — keeps van lat/long publishing when the phone is locked. */
export const DRIVER_VAN_GPS_BACKGROUND_TASK = 'DRIVER_VAN_GPS_BACKGROUND_TASK'; // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.

const VAN_GPS_BG_CONFIG_KEY = 'driver_app_van_gps_bg_config_v1';

let lastBgLatitude = null;
let lastBgLongitude = null;

/** Persist publish config so the headless task can HTTP-post after JS timers die. */
export async function saveVanGpsBackgroundConfig(publishConfig) {
  const payload = {
    apiBaseUrl: publishConfig?.apiBaseUrl || '',
    gmac: String(publishConfig?.gmac || '').trim(),
    gatewayId: publishConfig?.gatewayId || 'PHONE_LOCAL',
    minMoveMeters: Number(publishConfig?.minMoveMeters) || VAN_GPS_MIN_MOVE_METERS,
  };
  await AsyncStorage.setItem(VAN_GPS_BG_CONFIG_KEY, JSON.stringify(payload));
}

export async function clearVanGpsBackgroundConfig() {
  try {
    await AsyncStorage.removeItem(VAN_GPS_BG_CONFIG_KEY);
  } catch {
    // Why: stop must still succeed
  }
  lastBgLatitude = null;
  lastBgLongitude = null;
}

async function loadVanGpsBackgroundConfig() {
  try {
    const raw = await AsyncStorage.getItem(VAN_GPS_BG_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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

async function postVanGpsHttp(config, latitude, longitude) {
  const base = normalizeBleApiBaseUrl(config.apiBaseUrl);
  if (!base || !config.gmac) return false;
  const localClock = buildLocalIsoTimestampNow();
  const body = {
    Gateway_ID: String(config.gatewayId || '').trim() || 'PHONE_LOCAL',
    GMAC: config.gmac,
    Latitude: latitude,
    Longitude: longitude,
    time: localClock,
    Timestamp: localClock,
  };
  const response = await fetch(`${base}${DEFAULT_VAN_GPS_CAPTURE_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  return response.ok;
}

// Why: must be defined at import time so lock-screen / background wakes can publish GPS
TaskManager.defineTask(DRIVER_VAN_GPS_BACKGROUND_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = data?.locations;
  if (!Array.isArray(locations) || !locations.length) return;
  const config = await loadVanGpsBackgroundConfig();
  if (!config?.gmac) return;
  const latest = locations[locations.length - 1];
  const latitude = latest?.coords?.latitude;
  const longitude = latest?.coords?.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
  const minMove = Number(config.minMoveMeters) || VAN_GPS_MIN_MOVE_METERS;
  if (
    lastBgLatitude != null &&
    lastBgLongitude != null &&
    distanceMetersBetween(lastBgLatitude, lastBgLongitude, latitude, longitude) < minMove
  ) {
    return;
  }
  try {
    const ok = await postVanGpsHttp(config, latitude, longitude);
    if (ok) {
      lastBgLatitude = latitude;
      lastBgLongitude = longitude;
    }
  } catch {
    // Why: background tick failures must not crash the task
  }
});

/** Start Android/iOS background location updates with a foreground notification. */
export async function startVanGpsBackgroundUpdates(intervalMs) {
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_VAN_GPS_BACKGROUND_TASK).catch(
    () => false,
  );
  if (started) {
    await Location.stopLocationUpdatesAsync(DRIVER_VAN_GPS_BACKGROUND_TASK).catch(() => undefined);
  }
  const timeInterval = Math.max(5_000, Number(intervalMs) || 15_000);
  await Location.startLocationUpdatesAsync(DRIVER_VAN_GPS_BACKGROUND_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval,
    distanceInterval: 2,
    deferredUpdatesInterval: timeInterval,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Van live tracking',
      notificationBody: 'Sharing van location with the school while Gateway is on.',
      notificationColor: '#0A2A8C',
    },
    pausesUpdatesAutomatically: false,
  });
}

export async function stopVanGpsBackgroundUpdates() {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_VAN_GPS_BACKGROUND_TASK);
    if (started) {
      await Location.stopLocationUpdatesAsync(DRIVER_VAN_GPS_BACKGROUND_TASK);
    }
  } catch {
    // Why: stop must be best-effort
  }
  await clearVanGpsBackgroundConfig();
}
