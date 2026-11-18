// Why: default scheme so "192.168.1.10:8080" still becomes a valid fetch URL.
const DEFAULT_HTTP_SCHEME = 'http://'; // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.

/** Clean a typed server root so capture POSTs do not fail with "Network request failed". */
export function normalizeBleApiBaseUrl(rawInput) {
  // Why: trim spaces drivers often paste from chat.
  const trimmedInput = String(rawInput || '').trim();
  // Why: empty means Settings validation should block Save.
  if (!trimmedInput) return '';
  // Why: fetch requires a scheme — add http:// when the driver typed host:port only.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedInput)
    ? trimmedInput
    : `${DEFAULT_HTTP_SCHEME}${trimmedInput}`;
  // Why: strip accidental /api so join with /api/ble_capture does not become /api/api/...
  const withoutApiSuffix = withScheme.replace(/\/api\/?$/i, '');
  // Why: remove trailing slash so URL join is predictable.
  return withoutApiSuffix.replace(/\/+$/, '');
}
