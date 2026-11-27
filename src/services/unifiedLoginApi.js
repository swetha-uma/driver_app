import { sendDriverLoginCode, verifyDriverLoginCode } from './loginApi';
import {
  sendOwnerLoginCode,
  verifyOwnerLoginCode,
} from '../features/ownerapp/api/ownerLoginApi';

/**
 * One login screen, two roles. We don't know in advance whether the phone number
 * belongs to an Owner (users table) or a Teacher/Driver (payroll employee table),
 * so we try Owner first and fall back to the Driver/Teacher flow otherwise.
 */
export async function sendLoginCode(phone) {
  try {
    const seconds = await sendOwnerLoginCode(phone);
    return { secondsUntilResend: seconds, mode: 'owner' };
  } catch {
    // Why: not an owner phone — fall back to the existing driver/teacher login
    const seconds = await sendDriverLoginCode(phone);
    return { secondsUntilResend: seconds, mode: 'driver' };
  }
}

/** Verify using whichever mode `sendLoginCode` resolved. */
export async function verifyLoginCode(phone, otp, mode) {
  if (mode === 'owner') {
    const owner = await verifyOwnerLoginCode(phone, otp);
    return {
      role: 'OWNER',
      ownerToken: owner.token,
      driverName: owner.fullName,
      phone: owner.phone,
      canTrip: false,
      canLeave: false,
    };
  }
  return verifyDriverLoginCode(phone, otp);
}

/** Resend uses the same mode the screen started with. */
export function resendLoginCode(phone, mode) {
  return mode === 'owner' ? sendOwnerLoginCode(phone) : sendDriverLoginCode(phone);
}
