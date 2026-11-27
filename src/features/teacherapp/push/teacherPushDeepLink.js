/** FCM data.type values from TeacherAppPushService. */
export const TEACHER_PUSH_LATE_REASON = 'LATE_REASON';
export const TEACHER_PUSH_LATE_STATUS = 'LATE_STATUS';
export const TEACHER_PUSH_LEAVE_STATUS = 'LEAVE_STATUS';
export const TEACHER_PUSH_PAYROLL_LOP = 'PAYROLL_LOP';

/**
 * Android channel — must match TeacherAppPushService.ANDROID_CHANNEL_ID.
 * v2: new id so devices recreate the channel with default notification sound
 * (Android keeps old channel sound settings forever).
 */
export const TEACHER_NOTICE_CHANNEL_ID = 'teacher-app-notice-v2';

let pendingDeepLink = null;

/** Queue a Leave-shell screen until Leave navigator mounts. */
export function setPendingTeacherPushDeepLink(target) { // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  pendingDeepLink = target;
}

/** Read and clear queued deep link object or null. */
export function consumePendingTeacherPushDeepLink() {
  const next = pendingDeepLink;
  pendingDeepLink = null;
  return next;
}

/** Map inbox / FCM type → Leave shell screen. */
export function teacherPushScreenFromType(type) {
  const normalized = String(type || '').trim().toUpperCase();
  if (normalized === TEACHER_PUSH_LATE_REASON) return 'lateReason';
  if (
    normalized === TEACHER_PUSH_LATE_STATUS
    || normalized === TEACHER_PUSH_LEAVE_STATUS
    || normalized === TEACHER_PUSH_PAYROLL_LOP
  ) {
    return 'notice';
  }
  return null;
}

/**
 * Map FCM data → Leave navigation + optional ack dialog.
 * Why: actionRequired=true → Mark as read / Remind me later first.
 */
export function teacherPushTargetFromData(data) {
  const type = String(data?.type || '').trim().toUpperCase();
  const screen = teacherPushScreenFromType(type);
  if (!screen) return null;

  const actionRequired =
    String(data?.actionRequired || '').toLowerCase() === 'true'
    || String(data?.actionRequired || '') === '1';

  return {
    screen,
    // Why: API path for read / remind-later
    notificationId: data?.notificationId ? String(data.notificationId) : null,
    refId: data?.refId ? String(data.refId) : null,
    type,
    actionRequired,
    title: data?.title ? String(data.title) : '',
    body: data?.body ? String(data.body) : '',
  };
}

/**
 * Map pending-ack API row → same shape as FCM deep link target.
 * Why: open app without push tap still shows Mark as read / Remind me later.
 */
export function teacherAckTargetFromPendingRow(row) {
  if (!row?.notificationId) return null;
  const type = String(row.type || '').trim().toUpperCase();
  const screen = teacherPushScreenFromType(type);
  if (!screen) return null;
  return {
    screen,
    notificationId: String(row.notificationId),
    refId: row.refId != null ? String(row.refId) : null,
    type,
    actionRequired: true,
    title: row.title ? String(row.title) : '',
    body: row.body ? String(row.body) : '',
  };
}

/** Pull type from expo-notifications content (request.content or notification.request.content). */
export function teacherPushTargetFromNotificationContent(content) {
  const data = content?.data || {};
  // Why: some Android trays put title/body only on content, not data
  const target = teacherPushTargetFromData(data);
  if (!target) return null;
  if (!target.title && content?.title) target.title = String(content.title);
  if (!target.body && content?.body) target.body = String(content.body);
  return target;
}
