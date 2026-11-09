import {
  BLE_CAPTURE_TIMEOUT_MS,
  BLE_HEALTH_CHECK_PATH,
  BLE_HEALTH_TIMEOUT_MS,
} from '../constants/bleGatewayDefaults';
import { normalizeBleApiBaseUrl } from '../utils/bleApiUrlHelpers';

// Why: help drivers fix LAN / cleartext / firewall issues when fetch fails.
const NETWORK_FAILURE_HINT =
  'Check: phone on the same Wi-Fi as the server, address starts with http://, server firewall allows port 8080. ' +
  'If Chrome on this phone opens the same address but this app cannot, rebuild the driver APK.';

/** Join API root and path without double slashes. */
function joinBleApiUrl(baseUrl, path) {
  const normalizedBase = normalizeBleApiBaseUrl(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/** fetch with AbortController so hung sockets do not block Gateway forever. */
async function fetchBleApiWithTimeout(url, init, timeoutMs) {
  const abortController = new AbortController();
  const timerId = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: abortController.signal });
  } finally {
    clearTimeout(timerId);
  }
}

/** Human message for timeout vs generic network errors. */
function describeBleNetworkError(error, timeoutMs) {
  if (error instanceof Error && error.name === 'AbortError') {
    return `No answer within ${timeoutMs / 1000}s`;
  }
  return error instanceof Error ? error.message : 'Network error';
}

/** True for transport / 5xx failures that should retry later — never for mapping 4xx. */
export function shouldEnqueueBleCaptureOffline(captureResult) {
  if (captureResult.ok) return false;
  return captureResult.status === 0 || captureResult.status >= 500;
}

/** Prefer server JSON message for 4xx so drivers know GMAC/mapping is wrong. */
function summarizeBleHttpError(status, bodyText) {
  const trimmedBody = String(bodyText || '').trim();
  let serverMessage = '';
  if (trimmedBody.startsWith('{')) {
    try {
      const parsedBody = JSON.parse(trimmedBody);
      serverMessage = (parsedBody.message || parsedBody.error || '').trim();
    } catch {
      serverMessage = '';
    }
  }
  if (status === 404) {
    return serverMessage || 'Not found (check GMAC zone/vehicle or BLE mapping UUID/MAC)';
  }
  if (status === 400) {
    return serverMessage || 'Invalid capture payload';
  }
  if (status === 403) {
    return serverMessage || 'Forbidden (zone/vehicle inactive?)';
  }
  return serverMessage || `HTTP ${status}`;
}

/** POST one capture payload to /api/ble_capture (or the configured path). */
export async function postBleCaptureToSchoolServer(gatewaySettings, capturePayload) {
  const requestUrl = joinBleApiUrl(gatewaySettings.apiBaseUrl, gatewaySettings.capturePath);
  try {
    const response = await fetchBleApiWithTimeout(
      requestUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(capturePayload),
      },
      BLE_CAPTURE_TIMEOUT_MS,
    );
    const responseBody = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        body: responseBody,
        error: summarizeBleHttpError(response.status, responseBody),
      };
    }
    return { ok: true, status: response.status, body: responseBody };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: '',
      error: `${describeBleNetworkError(error, BLE_CAPTURE_TIMEOUT_MS)} · ${requestUrl}`,
    };
  }
}

/** Reachability check for Settings — any HTTP reply means the phone reached the host. */
export async function testBleSchoolServerHealth(apiBaseUrl) {
  const healthUrl = joinBleApiUrl(apiBaseUrl, BLE_HEALTH_CHECK_PATH);
  try {
    const response = await fetchBleApiWithTimeout(
      healthUrl,
      { method: 'GET', headers: { Accept: 'application/json' } },
      BLE_HEALTH_TIMEOUT_MS,
    );
    const responseBody = await response.text();
    const healthStatus = readBleHealthStatusField(responseBody);
    const healthLabel = healthStatus ? ` · health ${healthStatus}` : '';
    return {
      ok: true,
      status: response.status,
      message: `Server reached (HTTP ${response.status}${healthLabel}) · ${healthUrl}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: `Cannot reach ${healthUrl} — ${describeBleNetworkError(error, BLE_HEALTH_TIMEOUT_MS)}. ${NETWORK_FAILURE_HINT}`,
    };
  }
}

/** Parse actuator health JSON status when present. */
function readBleHealthStatusField(responseBody) {
  try {
    const parsedBody = JSON.parse(responseBody);
    return parsedBody.status ?? null;
  } catch {
    return null;
  }
}
