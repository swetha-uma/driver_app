import { getApiBase } from '../../settings/backendUrl';

/** Header name owner-app APIs expect. */
export const OWNER_TOKEN_HEADER = 'X-Owner-Token';

/** GET helper with owner token. */
async function ownerGet(path, ownerToken) {
  const response = await fetch(`${getApiBase()}${path}`, {
    headers: { [OWNER_TOKEN_HEADER]: ownerToken },
  });
  return read(response);
}

/** POST JSON helper with owner token. Success must include a data payload. */
async function ownerPost(path, ownerToken, body) {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [OWNER_TOKEN_HEADER]: ownerToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return read(response);
}

/**
 * POST whose success body has data=null (approve/reject return only a message).
 * `read()` treats a null payload as failure, which left the buttons on screen
 * after a decision that the server had already saved.
 */
async function ownerPostOk(path, ownerToken, requestBody) {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: {
      ...(requestBody ? { 'Content-Type': 'application/json' } : {}),
      [OWNER_TOKEN_HEADER]: ownerToken,
    },
    body: requestBody ? JSON.stringify(requestBody) : undefined,
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(response.ok ? 'Invalid server response' : 'Could not reach the school server');
  }
  if (!response.ok || body.success === false) {
    throw new Error(body.message || 'Request failed');
  }
  return body.data;
}

/** Pending + recent leave/late requests waiting for Owner action. */
export function fetchOwnerLeaveRequests(ownerToken) {
  return ownerGet('/api/v1/owner-app/leave/requests', ownerToken);
}

export function approveOwnerLeaveRequest(ownerToken, id, remarks) {
  return ownerPostOk(`/api/v1/owner-app/leave/requests/${id}/approve`, ownerToken, { remarks });
}

export function rejectOwnerLeaveRequest(ownerToken, id, remarks) {
  return ownerPostOk(`/api/v1/owner-app/leave/requests/${id}/reject`, ownerToken, { remarks });
}

export function fetchOwnerLateRequests(ownerToken) {
  return ownerGet('/api/v1/owner-app/late/requests', ownerToken);
}

export function fetchOwnerTodayLate(ownerToken) {
  return ownerGet('/api/v1/owner-app/late/today', ownerToken);
}

export function approveOwnerLateRequest(ownerToken, id, remarks) {
  return ownerPostOk(`/api/v1/owner-app/late/requests/${id}/approve`, ownerToken, { remarks });
}

export function rejectOwnerLateRequest(ownerToken, id, remarks) {
  return ownerPostOk(`/api/v1/owner-app/late/requests/${id}/reject`, ownerToken, { remarks });
}

/** Salary advance requests waiting for approval. */
export function fetchOwnerAdvanceRequests(ownerToken) {
  return ownerGet('/api/v1/owner-app/payroll/advances', ownerToken);
}

export function approveOwnerAdvanceRequest(ownerToken, id) {
  return ownerPostOk(`/api/v1/owner-app/payroll/advances/${id}/approve`, ownerToken);
}

export function rejectOwnerAdvanceRequest(ownerToken, id, remarks) {
  return ownerPostOk(`/api/v1/owner-app/payroll/advances/${id}/reject`, ownerToken, { remarks });
}

/** A staff/teacher's salary create/update requests waiting for owner approval. */
export function fetchOwnerSalaryStructures(ownerToken) {
  return ownerGet('/api/v1/owner-app/payroll/salary-structures', ownerToken);
}

export function fetchOwnerSalaryStructureDetail(ownerToken, id) {
  return ownerGet(`/api/v1/owner-app/payroll/salary-structures/${id}`, ownerToken);
}

export function approveOwnerSalaryStructure(ownerToken, id) {
  return ownerPostOk(`/api/v1/owner-app/payroll/salary-structures/${id}/approve`, ownerToken);
}

export function rejectOwnerSalaryStructure(ownerToken, id, remarks) {
  return ownerPostOk(`/api/v1/owner-app/payroll/salary-structures/${id}/reject`, ownerToken, { remarks });
}

/** Scholarship requests waiting for approval. */
export function fetchOwnerScholarshipRequests(ownerToken) {
  return ownerGet('/api/v1/owner-app/scholarship-requests', ownerToken);
}

export function approveOwnerScholarshipRequest(ownerToken, id) {
  return ownerPostOk(`/api/v1/owner-app/scholarship-requests/${id}/approve`, ownerToken);
}

export function rejectOwnerScholarshipRequest(ownerToken, id, remarks) {
  return ownerPostOk(`/api/v1/owner-app/scholarship-requests/${id}/reject`, ownerToken, { remarks });
}

/** Notices inbox — leave/late/advance/scholarship requests created for Owner to act on. */
export function fetchOwnerNotificationInbox(ownerToken) {
  return ownerGet('/api/v1/owner-app/notifications/inbox', ownerToken);
}

export function fetchOwnerPendingNotificationAcks(ownerToken) {
  return ownerGet('/api/v1/owner-app/notifications/pending-ack', ownerToken);
}

export function markOwnerNotificationRead(ownerToken, notificationId) {
  return ownerPostOk(`/api/v1/owner-app/notifications/${notificationId}/read`, ownerToken);
}

export function saveOwnerDeviceToken(ownerToken, fcmToken, deviceType) {
  return ownerPost('/api/v1/owner-app/device-token', ownerToken, { fcmToken, deviceType });
}

/** Unbind this phone's token on logout so the previous owner/device stops getting pushes. */
export function clearOwnerDeviceToken(ownerToken, fcmToken) {
  return ownerPostOk('/api/v1/owner-app/device-token/clear', ownerToken, { fcmToken });
}

/** Owner's own profile — name, phone, email, current school. */
export function fetchOwnerProfile(ownerToken) {
  return ownerGet('/api/v1/owner-app/profile', ownerToken);
}

/** Every school this Owner account has OWNER access to. */
export function fetchOwnerSchools(ownerToken) {
  return ownerGet('/api/v1/owner-app/schools', ownerToken);
}

/** Switch the active school for this session (same token, new schoolId). */
export function switchOwnerSchool(ownerToken, targetSchoolId) {
  return ownerPost('/api/v1/owner-app/schools/switch', ownerToken, { targetSchoolId });
}

/** Logout owner Redis session. */
export async function logoutOwner(ownerToken) {
  if (!ownerToken) return { loggedOut: true };
  const response = await fetch(`${getApiBase()}/api/v1/owner-app/login/logout`, {
    method: 'POST',
    headers: { [OWNER_TOKEN_HEADER]: ownerToken },
  });
  return read(response);
}

/** Parse API envelope or throw server message. */
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
