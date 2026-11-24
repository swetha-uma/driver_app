import { useEffect } from 'react';

import { registerStaffFcmToken } from './registerStaffFcmToken';

/**
 * Registers this phone's FCM after login / shell mount.
 * Server reuses the same teacher_app_device row and updates employee_id + phone (Option 1).
 */
export default function TeacherPushRegistrar({ teacherToken }) { // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  useEffect(() => {
    if (!teacherToken) return undefined;
    let cancelled = false;

    (async () => {
      try {
        if (cancelled) return;
        await registerStaffFcmToken(teacherToken);
      } catch (err) {
        console.warn('[TeacherPush] FCM register failed:', err?.message || err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teacherToken]);

  return null;
}
