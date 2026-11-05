import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'driver_app_backend_url';

/** School server used until the driver saves another address. */
export const DEFAULT_API = 'http://192.168.1.8:8080';

let current = DEFAULT_API;

/** Address every driver-app request should use right now. */
export function getApiBase() {
  return current;
}

/** Read the saved address before the first request. */
export async function loadApiBase() {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved) current = saved;
  } catch {
    current = DEFAULT_API;
  }
  return current;
}

/** Keep a full http or https origin, with no trailing slash. */
export function normalizeApiBase(raw) {
  const value = String(raw || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\/.+/i.test(value)) {
    throw new Error('Enter a full URL starting with http:// or https://');
  }
  return value;
}

/** Remember the address on this phone and use it for the next request. */
export async function saveApiBase(raw) {
  const value = normalizeApiBase(raw);
  await AsyncStorage.setItem(KEY, value);
  current = value;
  return value;
}
