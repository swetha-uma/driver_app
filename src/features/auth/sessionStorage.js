import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'driver_app_session_v1';

/**
 * Keep the verified driver session on the phone so OTP is only asked
 * on first login and again after logout.
 */
export async function loadDriverSession() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.phone || !parsed?.verifiedPage?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveDriverSession(phone, verifiedPage) {
  if (!phone || !verifiedPage?.token) return;
  await AsyncStorage.setItem(KEY, JSON.stringify({ phone, verifiedPage }));
}

export async function clearDriverSession() {
  await AsyncStorage.removeItem(KEY);
}
