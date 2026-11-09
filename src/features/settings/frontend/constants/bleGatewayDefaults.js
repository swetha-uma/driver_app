// Why: default capture URL points at local school ERP until the driver saves another host.
export const DEFAULT_BLE_CAPTURE_PATH = '/api/ble_capture';

// Why: van live-tracking GPS uses the existing vehicle telemetry endpoint (separate from BLE).
export const DEFAULT_VAN_GPS_CAPTURE_PATH = '/api/ble_vehicle_data_capture';

// Why: STOMP destination on the school server for driver-phone GPS (WebSocket ingest).
export const VAN_GPS_STOMP_DESTINATION = '/app/van/gps';

// Why: same live-tracking /ws endpoint as the web app; SockJS raw socket path for React Native.
export const VAN_GPS_WS_PATH = '/ws/websocket';

// Why: fallback only — each vehicle row overrides this (gps_publish_interval_ms).
export const DEFAULT_VAN_GPS_PUBLISH_INTERVAL_MS = 15_000;

// Why: fallback only — each vehicle row overrides this (gps_min_move_meters).
export const VAN_GPS_MIN_MOVE_METERS = 2;

// Why: weak packets below this RSSI are ignored so far-away noise does not create false captures.
export const DEFAULT_BLE_MIN_RSSI = -90;

// Why: while a card stays nearby we re-post PRESENT on this interval so the server keeps presence fresh.
export const DEFAULT_BLE_PRESENT_INTERVAL_MS = 10_000;

// Why: after this much silence the phone treats the next sighting as ENTER again (EXIT is local only).
export const DEFAULT_BLE_EXIT_TIMEOUT_MS = 30_000;

// Why: Reader mode lists every nearby advertiser by default, matching nRF Connect behaviour.
export const DEFAULT_BLE_READER_LIST_MODE = 'all';

// Why: production uploads only classified ID cards unless the driver turns debug mode on.
export const DEFAULT_BLE_UNFILTERED_DEBUG_MODE = false;

// Why: driver phone starts in Gateway role (upload captures); Reader is optional debug.
export const DEFAULT_BLE_PHONE_ROLE = 'gateway';

// Why: driver phone is the van gateway itself unless the driver chooses to follow zone ID cards.
export const DEFAULT_BLE_ZONE_SOURCE = 'phone';

// Why: with zone cards, one phone follows one zone MAC unless multi-zone is enabled.
export const DEFAULT_BLE_ZONE_MODE = 'single';

// Why: a zone card still counts as the active zone for this long after its last advertisement.
export const BLE_ZONE_HOLD_MS = 15_000;

// Why: another zone card must beat the active one by this many dB before we switch zones.
export const BLE_ZONE_SWITCH_MARGIN_DB = 6;

// Why: Settings "Test API" hits the public health endpoint that does not need a login token.
export const BLE_HEALTH_CHECK_PATH = '/actuator/health';

// Why: give up on a stuck capture POST so the UI does not hang forever on bad Wi-Fi.
export const BLE_CAPTURE_TIMEOUT_MS = 10_000;

// Why: GPS publish should fail fast so the next interval can retry.
export const VAN_GPS_PUBLISH_TIMEOUT_MS = 8_000;

// Why: health checks should fail fast so the driver can fix the server URL quickly.
export const BLE_HEALTH_TIMEOUT_MS = 8_000;

// Why: cap offline retries so AsyncStorage cannot grow without limit when the server is down.
export const BLE_MAX_OFFLINE_QUEUE = 500;

// Why: keep BLE gateway settings under their own key so Server URL settings stay independent.
export const BLE_GATEWAY_SETTINGS_STORAGE_KEY = 'driver_app_ble_gateway_settings_v1';

// Why: keep failed capture payloads under their own key so settings and queue never overwrite each other.
export const BLE_OFFLINE_QUEUE_STORAGE_KEY = 'driver_app_ble_gateway_offline_queue_v1';
