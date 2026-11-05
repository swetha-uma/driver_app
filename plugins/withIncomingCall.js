const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

/**
 * Lets the driver alert call turn the screen on and draw over the lock screen,
 * the same permission a phone call uses (matches Parent App withIncomingCall).
 */
function withIncomingCall(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const perms = manifest['uses-permission'] || [];
    const names = new Set(perms.map((entry) => entry.$['android:name']));
    // Why: full-screen intent + wake so a locked phone can show the ring UI like a normal call
    [
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.VIBRATE',
      'android.permission.WAKE_LOCK',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.POST_NOTIFICATIONS',
    ]
      .filter((name) => !names.has(name))
      .forEach((name) => perms.push({ $: { 'android:name': name } }));
    manifest['uses-permission'] = perms;

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    const activity =
      (app.activity || []).find((item) => item.$['android:name'] === '.MainActivity') ||
      (app.activity || [])[0];
    if (activity) {
      // Why: show Answer/Reject over the lock screen and wake the display
      activity.$['android:showWhenLocked'] = 'true';
      activity.$['android:turnScreenOn'] = 'true';
    }

    // Why: also mark the native IncomingAlertCallActivity if the merge already listed it
    (app.activity || [])
      .filter((item) =>
        String(item.$['android:name'] || '').includes('IncomingAlertCallActivity'))
      .forEach((item) => {
        item.$['android:showWhenLocked'] = 'true';
        item.$['android:turnScreenOn'] = 'true';
        item.$['android:excludeFromRecents'] = 'true';
        item.$['android:launchMode'] = 'singleInstance';
        item.$['android:exported'] = 'true';
      });
    return cfg;
  });
}

module.exports = withIncomingCall;
