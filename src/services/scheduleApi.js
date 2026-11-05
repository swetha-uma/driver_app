import { getApiBase } from '../features/settings/backendUrl';
import { DRIVER_TOKEN_HEADER } from './loginApi';

/**
 * Load Pickup / Drop schedule cards for one day.
 * @param {string} token X-Driver-Token from verify-otp
 * @param {string} [dateIso] optional yyyy-MM-dd; omit for today
 */
export async function loadDriverScheduleDay(token, dateIso) {
  // Why: schedule is private — backend resolves school/employee from Redis
  const query = dateIso ? `?date=${encodeURIComponent(dateIso)}` : '';
  const response = await fetch(`${getApiBase()}/api/v1/driver-app/schedule${query}`, {
    method: 'GET',
    headers: {
      [DRIVER_TOKEN_HEADER]: token,
    },
  });
  return readScheduleResponse(response);
}

/** Turn a schedule API response into data, or throw the server message. */
async function readScheduleResponse(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    // Why: network / HTML error pages should show a clear message
    throw new Error(response.ok ? 'Invalid server response' : 'Could not reach the school server');
  }
  if (!response.ok || body.success === false || body.data == null) {
    // Why: surface backend validation like bad date format
    throw new Error(body.message || 'Could not load schedule');
  }
  return body.data;
}
