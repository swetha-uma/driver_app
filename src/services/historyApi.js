import { getApiBase } from '../features/settings/backendUrl';
import { DRIVER_TOKEN_HEADER } from './loginApi';

/**
 * Load completed trips for the rolling 7-day History window.
 * @param {string} token X-Driver-Token from verify-otp
 */
export async function loadDriverCompletedTripHistory(token) {
  // Why: history is private — backend resolves school/employee from Redis
  const response = await fetch(`${getApiBase()}/api/v1/driver-app/history`, {
    method: 'GET',
    headers: {
      [DRIVER_TOKEN_HEADER]: token,
    },
  });
  return readHistoryResponse(response);
}

/** Turn a history API response into data, or throw the server message. */
async function readHistoryResponse(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    // Why: network / HTML error pages should show a clear message
    throw new Error(response.ok ? 'Invalid server response' : 'Could not reach the school server');
  }
  if (!response.ok || body.success === false || body.data == null) {
    // Why: surface backend auth / validation messages to the driver
    throw new Error(body.message || 'Could not load history');
  }
  return body.data;
}
