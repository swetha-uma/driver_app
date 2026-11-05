const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Why: base-config true allows HTTP to any host (LAN IPs like 192.168.1.12)
const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">192.168.1.2</domain>
    <domain includeSubdomains="true">192.168.1.8</domain>
    <domain includeSubdomains="true">192.168.1.12</domain>
  </domain-config>
</network-security-config>
`;

/**
 * Allows HTTP (cleartext) to local / QA APIs on Android release APKs.
 * Must run after other Android plugins so the manifest flags are not overwritten.
 */
function withCleartextTraffic(config) {
  // Why: Expo app config flag — applied during prebuild into the manifest
  config.android = {
    ...(config.android || {}),
    usesCleartextTraffic: true,
  };

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'network_security_config.xml'),
        NETWORK_SECURITY_CONFIG,
        'utf8',
      );
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$ = app.$ || {};
    // Why: without these, Android 9+ blocks http://192.168.x.x
    app.$['android:usesCleartextTraffic'] = 'true';
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });

  return config;
}

module.exports = withCleartextTraffic;
