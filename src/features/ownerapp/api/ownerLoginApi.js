import { OTP_LENGTH } from '../../../constants/auth';
import { getApiBase } from '../../settings/backendUrl';

/** Header name owner-app APIs expect after verify-otp. */
export const OWNER_LOGIN_TOKEN_HEADER = 'X-Owner-Token';

/** Ask the server to record a login code for this owner phone. */
export async function sendOwnerLoginCode(phone) {
  const digits = normalizePhone(phone);
  const response = await fetch(`${getApiBase()}/api/v1/owner-app/login/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: digits }),
  });
  const data = await read(response);
  return data.secondsUntilResend ?? 60;
}

/** Check the 4-digit code. A match returns the owner session payload (token, fullName, …). */
export async function verifyOwnerLoginCode(phone, otp) {
  const digits = normalizePhone(phone);
  const code = String(otp ?? '').replace(/\D/g, '').slice(0, OTP_LENGTH);
  if (code.length !== OTP_LENGTH) {
    throw new Error('Enter the 4-digit login code');
  }
  const response = await fetch(`${getApiBase()}/api/v1/owner-app/login/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: digits, otp: code }),
  });
  return read(response);
}

function normalizePhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length !== 10) {
    throw new Error('Enter a valid 10-digit phone number');
  }
  return digits;
}

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
