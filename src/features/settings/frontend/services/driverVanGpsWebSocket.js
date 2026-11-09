import { Client } from '@stomp/stompjs';

import {
  VAN_GPS_STOMP_DESTINATION,
  VAN_GPS_WS_PATH,
} from '../constants/bleGatewayDefaults';
import { normalizeBleApiBaseUrl } from '../utils/bleApiUrlHelpers';

// Why: one STOMP client for the whole app so Start/Stop does not leak sockets.
let stompClient = null;
// Why: remember which API host this socket belongs to so a URL change forces reconnect.
let connectedApiBaseUrl = '';
// Why: separate flag so UI can show connected even before stompClient.connected flips.
let isSocketConnected = false;

/** Build ws(s)://host/ws/websocket — same live-tracking WebSocket the web app uses. */
export function buildDriverVanGpsWebSocketUrl(apiBaseUrl) {
  // Why: strip trailing /api and normalize host:port the driver typed in Settings.
  const normalizedBase = normalizeBleApiBaseUrl(apiBaseUrl);
  // Why: empty base means Settings has no server URL yet.
  if (!normalizedBase) return '';
  // Why: STOMP needs a WebSocket URL; http→ws and https→wss.
  const wsBase = normalizedBase.replace(/^http/i, 'ws');
  // Why: /ws/websocket is the raw socket under SockJS /ws (web live tracking endpoint).
  return `${wsBase}${VAN_GPS_WS_PATH}`;
}

/** True when the van GPS STOMP client is connected. */
export function isDriverVanGpsWebSocketConnected() {
  // Why: both flags must be true so we do not publish into a half-open socket.
  return Boolean(stompClient?.connected && isSocketConnected);
}

/**
 * Open (or reuse) a STOMP connection for van GPS publish.
 * Why: one persistent socket on /ws replaces repeated HTTP POSTs for live tracking.
 */
export async function connectDriverVanGpsWebSocket(apiBaseUrl) {
  // Why: normalize once so reconnect compares the same host string.
  const normalizedBase = normalizeBleApiBaseUrl(apiBaseUrl);
  // Why: build the shared live-tracking WebSocket URL for this phone.
  const wsUrl = buildDriverVanGpsWebSocketUrl(normalizedBase);
  // Why: refuse to connect when API Base URL was never set.
  if (!wsUrl) {
    throw new Error('API Base URL is missing for van GPS WebSocket');
  }

  // Why: reuse the live socket when the same school server is already connected.
  if (stompClient?.connected && connectedApiBaseUrl === normalizedBase) {
    return true;
  }

  // Why: close any previous socket before opening a new host.
  await disconnectDriverVanGpsWebSocket();

  // Why: track host so the next Start can skip reconnect when unchanged.
  connectedApiBaseUrl = normalizedBase;
  // Why: clear until onConnect proves the broker handshake finished.
  isSocketConnected = false;

  await new Promise((resolve, reject) => {
    // Why: prevent double resolve/reject if timeout and onConnect race.
    let settled = false;
    // Why: fail fast so Start scan can fall back to HTTP instead of hanging.
    const connectTimeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Van GPS WebSocket connect timed out'));
    }, 10_000);

    const client = new Client({
      // Why: React Native uses built-in WebSocket against /ws/websocket (no SockJS).
      webSocketFactory: () => new WebSocket(wsUrl),
      // Why: auto-retry if the school Wi-Fi drops mid-trip.
      reconnectDelay: 5_000,
      // Why: detect dead sockets without waiting for the next GPS tick.
      heartbeatIncoming: 10_000,
      // Why: keep the broker from closing an idle driver connection.
      heartbeatOutgoing: 10_000,
      // Why: some RN WebSocket stacks omit the STOMP null terminator.
      appendMissingNULLonIncoming: true,
      onConnect: () => {
        // Why: mark ready so publishDriverVanGpsOverWebSocket can send frames.
        isSocketConnected = true;
        if (settled) return;
        settled = true;
        clearTimeout(connectTimeoutId);
        resolve(true);
      },
      onDisconnect: () => {
        // Why: next GPS tick should try HTTP or reconnect.
        isSocketConnected = false;
      },
      onStompError: (frame) => {
        // Why: broker rejected the session — surface a clear error to Start scan.
        isSocketConnected = false;
        if (settled) return;
        settled = true;
        clearTimeout(connectTimeoutId);
        reject(new Error(frame?.headers?.message || 'Van GPS STOMP error'));
      },
      onWebSocketError: () => {
        // Why: TCP/WS failure — Start scan falls back to HTTP capture.
        isSocketConnected = false;
        if (settled) return;
        settled = true;
        clearTimeout(connectTimeoutId);
        reject(new Error('Van GPS WebSocket error'));
      },
    });

    // Why: keep the singleton so Stop / logout can deactivate the same client.
    stompClient = client;
    // Why: begin the STOMP CONNECT handshake on /ws.
    client.activate();
  });

  return true;
}

/** Close the van GPS STOMP connection (Stop scan / logout). */
export async function disconnectDriverVanGpsWebSocket() {
  // Why: snapshot then null so concurrent publish cannot use a dying client.
  const client = stompClient;
  stompClient = null;
  connectedApiBaseUrl = '';
  isSocketConnected = false;
  // Why: nothing to close when Start never connected.
  if (!client) return;
  try {
    // Why: clean STOMP DISCONNECT so the broker drops the session.
    await client.deactivate();
  } catch {
    // Why: teardown must never block Stop / logout.
  }
}

/**
 * Publish one GPS sample over STOMP to /app/van/gps.
 * @returns {boolean} true when the frame was sent on a live socket
 */
export function publishDriverVanGpsOverWebSocket(payload) {
  // Why: do not pretend success when the socket is down (caller uses HTTP).
  if (!stompClient?.connected) return false;
  try {
    stompClient.publish({
      // Why: same MessageMapping the server uses for vehicle GPS ingest.
      destination: VAN_GPS_STOMP_DESTINATION,
      // Why: body matches POST /api/ble_vehicle_data_capture JSON.
      body: JSON.stringify(payload),
      // Why: tell Spring the payload is JSON for @Payload binding.
      headers: { 'content-type': 'application/json' },
    });
    return true;
  } catch {
    // Why: publish threw — caller should fall back to HTTP.
    return false;
  }
}
