/**
 * @deprecated Use saveTeacherDeviceToken from teacherApi — Trip + Leave share
 * teacher_app_device via POST /api/v1/teacher-app/device-token.
 */
export async function saveDriverDeviceToken() { // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.
  console.warn(
    '[deviceTokenApi] saveDriverDeviceToken is deprecated; use saveTeacherDeviceToken',
  );
}
