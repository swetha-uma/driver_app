import { normalizeBleMacAddress } from '../utils/bleIdentifierHelpers';
import { loadBleGatewaySettings, saveBleGatewaySettings } from './bleGatewaySettingsStorage';

/**
 * Copy allocated van gateway MAC and GPS rules from Home into BLE Settings.
 * Why: admin sets these on the vehicle row; the phone must use the same GMAC and publish rules.
 * @param {string} allocatedVanGatewayMac
 * @param {{ gpsMinMoveMeters?: number, gpsPublishIntervalMs?: number }} [gpsSettings]
 */
export async function syncVehicleGatewayMacFromHome(allocatedVanGatewayMac, gpsSettings) {
  const normalizedMac = normalizeBleMacAddress(allocatedVanGatewayMac);
  if (!normalizedMac) return null;

  const currentSettings = await loadBleGatewaySettings();
  const gpsMinMoveMeters = Number(gpsSettings?.gpsMinMoveMeters);
  const gpsPublishIntervalMs = Number(gpsSettings?.gpsPublishIntervalMs);
  const nextMinMove =
    Number.isFinite(gpsMinMoveMeters) && gpsMinMoveMeters > 0
      ? gpsMinMoveMeters
      : currentSettings.gpsMinMoveMeters;
  const nextInterval =
    Number.isFinite(gpsPublishIntervalMs) && gpsPublishIntervalMs >= 3000
      ? gpsPublishIntervalMs
      : currentSettings.gpsPublishIntervalMs;

  const macUnchanged = normalizeBleMacAddress(currentSettings.gmac) === normalizedMac;
  const gpsUnchanged =
    currentSettings.gpsMinMoveMeters === nextMinMove &&
    currentSettings.gpsPublishIntervalMs === nextInterval;
  if (macUnchanged && gpsUnchanged) {
    return normalizedMac;
  }

  await saveBleGatewaySettings({
    ...currentSettings,
    zoneSource: 'phone',
    gmac: normalizedMac,
    gpsMinMoveMeters: nextMinMove,
    gpsPublishIntervalMs: nextInterval,
  });
  return normalizedMac;
}
