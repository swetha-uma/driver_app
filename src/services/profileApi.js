import { getApiBase } from '../features/settings/backendUrl';
import { DRIVER_TOKEN_HEADER } from './loginApi';

/**
 * Load staff-backed driver profile for My Profile / Driver details.
 * @param {string} token X-Driver-Token from verify-otp
 */
export async function loadDriverProfile(token) {
  // Why: profile is private — backend resolves employee→staff from Redis session
  const response = await fetch(`${getApiBase()}/api/v1/driver-app/profile`, {
    method: 'GET',
    headers: {
      [DRIVER_TOKEN_HEADER]: token,
    },
  });
  return readProfileResponse(response);
}

/** Turn a profile API response into data, or throw the server message. */
async function readProfileResponse(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    // Why: network / HTML error pages should show a clear message
    throw new Error(response.ok ? 'Invalid server response' : 'Could not reach the school server');
  }
  if (!response.ok || body.success === false || body.data == null) {
    // Why: surface missing staff / session errors to the driver
    throw new Error(body.message || 'Could not load profile');
  }
  return body.data;
}

/**
 * Build the Driver details label/value rows from a profile API payload.
 * Keeps menu UI free of field-mapping noise.
 */
export function buildDriverDetailRowsFromProfile(profile) {
  // Why: empty profile should not crash the details screen
  if (!profile) {
    return [];
  }
  return [
    { label: 'Full name', value: profile.name },
    { label: 'Role', value: profile.role || profile.designation },
    { label: 'Department', value: profile.department },
    { label: 'Phone', value: profile.phoneDisplay || profile.phone },
    { label: 'Email', value: profile.email },
    { label: 'Experience', value: profile.experience },
    { label: 'Employee ID', value: profile.employeeCode },
    { label: 'Joining date', value: profile.joiningDate },
    { label: 'Address', value: profile.address },
    { label: 'Vehicle assigned', value: profile.vehicleAssigned },
  ];
}
