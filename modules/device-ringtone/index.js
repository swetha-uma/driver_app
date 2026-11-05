import { requireNativeModule } from 'expo-modules-core';

let Native = null;
try {
  // Why: native module exists only after a rebuild that includes this local package
  Native = requireNativeModule('DeviceRingtone');
} catch {
  Native = null;
}

/** Start the device phone ringtone on a loop. No-op until a native rebuild includes this module. */
export async function startDeviceRingtone() {
  try {
    if (!Native?.start) return;
    // Why: Native start is AsyncFunction — wait so vibration can follow after audio starts
    await Promise.resolve(Native.start());
  } catch {
    // Why: missing native module or unreadable ringtone URI must not crash the call UI
  }
}

/** Stop the looping ringtone. Safe to call when nothing is playing. */
export function stopDeviceRingtone() {
  try {
    Native?.stop?.();
  } catch {
    // Why: already stopped / module missing
  }
}
