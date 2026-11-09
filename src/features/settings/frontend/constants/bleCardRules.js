// Why: Type A cards advertise this 16-bit Heart Rate service UUID (0x180D) as their marker.
export const BLE_CARD_SERVICE_UUID_16 = '180D';

// Why: Type B cards use this Apple iBeacon proximity UUID as the attendance identity.
export const BLE_CARD_IBEACON_UUIDS = ['06C02012-10D6-4B76-97D7-E03E68F8EB18'];

// Why: Type A names start with E0… and Type B short names often start with ET.
export const BLE_CARD_NAME_PREFIXES = ['E0', 'ET'];

// Why: backend ble beacon_uuid column is VARCHAR(50) so we truncate before upload.
export const BLE_MAX_CARD_ID_LENGTH = 50;

// Why: wait for a scan-response name before uploading a MAC-only identity for Type A cards.
export const BLE_IDENTITY_WAIT_MS = 2_000;
