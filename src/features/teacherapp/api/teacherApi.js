import { getApiBase } from '../../settings/backendUrl';

/** Header name teacher-app APIs expect. */
export const TEACHER_TOKEN_HEADER = 'X-Teacher-Token';

/** GET helper with teacher token. */
async function teacherGet(path, teacherToken) { // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  const response = await fetch(`${getApiBase()}${path}`, {
    headers: { [TEACHER_TOKEN_HEADER]: teacherToken },
  });
  return read(response);
}

/** POST JSON helper with teacher token. */
async function teacherPost(path, teacherToken, body) {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [TEACHER_TOKEN_HEADER]: teacherToken,
    },
    body: JSON.stringify(body),
  });
  return read(response);
}

/** PUT JSON helper with teacher token. */
async function teacherPut(path, teacherToken, body) {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      [TEACHER_TOKEN_HEADER]: teacherToken,
    },
    body: JSON.stringify(body),
  });
  return read(response);
}

/** Save Trip or Leave preferred mode. */
export function saveTeacherMode(teacherToken, mode) {
  return teacherPut('/api/v1/teacher-app/mode', teacherToken, { mode });
}

/** Staff home today status. */
export function fetchTeacherHome(teacherToken) {
  return teacherGet('/api/v1/teacher-app/home', teacherToken);
}

/** Month attendance calendar. */
export function fetchTeacherAttendanceMonth(teacherToken, year, month) {
  return teacherGet(`/api/v1/teacher-app/attendance/month?year=${year}&month=${month}`, teacherToken);
}

/** Active leave types. */
export function fetchTeacherLeaveTypes(teacherToken) {
  return teacherGet('/api/v1/teacher-app/leave/types', teacherToken);
}

/** Leave balances for request screen. */
export function fetchTeacherLeaveBalances(teacherToken) {
  return teacherGet('/api/v1/teacher-app/leave/balances', teacherToken);
}

/** My leave requests. */
export function fetchTeacherLeaveRequests(teacherToken) {
  return teacherGet('/api/v1/teacher-app/leave/requests', teacherToken);
}

/** One leave request detail. */
export function fetchTeacherLeaveRequest(teacherToken, id) {
  return teacherGet(`/api/v1/teacher-app/leave/requests/${id}`, teacherToken);
}

/** Submit leave request (future dates). */
export function createTeacherLeaveRequest(teacherToken, body) {
  return teacherPost('/api/v1/teacher-app/leave/requests', teacherToken, body);
}

/** Pending late reason for today. */
export function fetchTeacherLatePending(teacherToken) {
  return teacherGet('/api/v1/teacher-app/late/pending', teacherToken);
}

/** Submit late reason (locks after submit). */
export function submitTeacherLateReason(teacherToken, body) {
  return teacherPost('/api/v1/teacher-app/late/submit', teacherToken, body);
}

/** Register FCM token for push. */
export function saveTeacherDeviceToken(teacherToken, fcmToken, deviceType) {
  return teacherPost('/api/v1/teacher-app/device-token', teacherToken, { fcmToken, deviceType });
}

/** Unbind this phone's FCM on logout so the next staff does not get old pushes. */
export function clearTeacherDeviceToken(teacherToken, fcmToken) {
  return teacherPostOk('/api/v1/teacher-app/device-token/clear', teacherToken, { fcmToken });
}

/** PENDING action-required inbox rows for in-app ack dialog (no FCM tap needed). */
export function fetchTeacherPendingNotificationAcks(teacherToken) {
  return teacherGet('/api/v1/teacher-app/notifications/pending-ack', teacherToken);
}

/** Mark inbox notification as read — stop further reminders. */
export function markTeacherNotificationRead(teacherToken, notificationId) {
  // Why: void API — allow null data envelope
  return teacherPostOk(`/api/v1/teacher-app/notifications/${notificationId}/read`, teacherToken);
}

/** Snooze notification using teacher_app_device interval. */
export function remindTeacherNotificationLater(teacherToken, notificationId) {
  // Why: void API — allow null data envelope
  return teacherPostOk(
    `/api/v1/teacher-app/notifications/${notificationId}/remind-later`,
    teacherToken,
  );
}

/** POST with no body; success may have data=null. */
async function teacherPostOk(path, teacherToken) {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: { [TEACHER_TOKEN_HEADER]: teacherToken },
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

/** Logout teacher Redis session. */
export async function logoutTeacher(teacherToken) {
  if (!teacherToken) return { loggedOut: true };
  const response = await fetch(`${getApiBase()}/api/v1/teacher-app/login/logout`, {
    method: 'POST',
    headers: { [TEACHER_TOKEN_HEADER]: teacherToken },
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
