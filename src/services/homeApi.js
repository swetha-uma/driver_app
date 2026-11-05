import { getApiBase } from '../features/settings/backendUrl';
import { DRIVER_TOKEN_HEADER } from './loginApi';

/**
 * Load greeting identity and today's Pickup / Drop cards for this driver token.
 */
export async function loadDriverHome(token) {
  // Why: home is private — backend reads school/employee from Redis via this header
  const response = await fetch(`${getApiBase()}/api/v1/driver-app/home`, {
    method: 'GET',
    headers: {
      [DRIVER_TOKEN_HEADER]: token,
    },
  });
  return read(response);
}

/** Turn a driver-app response into data, or throw the server message. */
async function read(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    // Why: network / HTML error pages should show a clear message
    throw new Error(response.ok ? 'Invalid server response' : 'Could not reach the school server');
  }
  if (!response.ok || body.success === false || body.data == null) {
    throw new Error(body.message || 'Could not load home');
  }
  return body.data;
}
