import AsyncStorage from '@react-native-async-storage/async-storage';

// Why: keep teacher token + mode flags across app restarts
const KEY = 'teacher_app_session_v1'; // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.

/** Load saved teacher session or null. */
export async function loadTeacherSession() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.teacherToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Save teacher token and mode flags after login. */
export async function saveTeacherSession(session) {
  if (!session?.teacherToken) return;
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

/** Clear teacher session on logout. */
export async function clearTeacherSession() {
  await AsyncStorage.removeItem(KEY);
}
