import { OTP_LENGTH } from '../constants/auth';
import { getApiBase } from '../features/settings/backendUrl';

/** Header name the backend expects after verify-otp. */
export const DRIVER_TOKEN_HEADER = 'X-Driver-Token';

/**
 * Ask the server to record a login code for this driver phone.
 * @returns {Promise<number>} seconds until resend is allowed
 */
export async function sendDriverLoginCode(phone) {
  const digits = normalizePhone(phone);
  const response = await fetch(`${getApiBase()}/api/v1/driver-app/login/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: digits }),
  });
  const data = await read(response);
  return data.secondsUntilResend ?? 60;
}

/**
 * Check the 4-digit code. A match returns the session payload (token, driverName, …).
 */
export async function verifyDriverLoginCode(phone, otp) {
  const digits = normalizePhone(phone);
  const code = String(otp ?? '').replace(/\D/g, '').slice(0, OTP_LENGTH);
  if (code.length !== OTP_LENGTH) {
    throw new Error('Enter the 4-digit login code');
  }
  const response = await fetch(`${getApiBase()}/api/v1/driver-app/login/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: digits, otp: code }),
  });
  return read(response);
}

/**
 * Drop the Redis session for this driver token on the server.
 * Safe to call when the token is missing (no network call).
 */
export async function logoutDriver(token) {
  if (!token) {
    return { loggedOut: true };
  }
  const response = await fetch(`${getApiBase()}/api/v1/driver-app/login/logout`, {
    method: 'POST',
    headers: { [DRIVER_TOKEN_HEADER]: token },
  });
  return read(response);
}

/** Keep only the 10-digit mobile number the backend validates. */
function normalizePhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length !== 10) {
    throw new Error('Enter a valid 10-digit phone number');
  }
  return digits;
}

/** Turn a driver-app response into data, or throw the server message. */
async function read(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(response.ok ? 'Invalid server response' : 'Could not reach the school server');
  }
  if (!response.ok || body.success === false || body.data == null) {
    throw new Error(body.message || 'Request failed');
  }
  return body.data;
}
