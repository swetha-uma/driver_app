import { convertBytesToHexDump, convertBytesToUtf8Text, convertHexDumpToBytes } from './bleByteHelpers';
import { parseIbeaconFromAdvertisementBytes } from './bleIbeaconParser';

// Why: BLE AD type codes used in advertising and scan-response PDUs.
const AD_TYPE_INCOMPLETE_UUID16 = 0x02;
const AD_TYPE_COMPLETE_UUID16 = 0x03;
const AD_TYPE_INCOMPLETE_UUID128 = 0x06;
const AD_TYPE_COMPLETE_UUID128 = 0x07;
const AD_TYPE_SHORT_LOCAL_NAME = 0x08;
const AD_TYPE_COMPLETE_LOCAL_NAME = 0x09;
const AD_TYPE_TX_POWER = 0x0a;
const AD_TYPE_SERVICE_DATA_UUID16 = 0x16;
const AD_TYPE_SERVICE_DATA_UUID32 = 0x20;
const AD_TYPE_SERVICE_DATA_UUID128 = 0x21;
const AD_TYPE_MANUFACTURER = 0xff;

/** Format a little-endian 16-bit UUID into Bluetooth base UUID form. */
function formatUuid16LittleEndian(dataBytes, offset) {
  // Why: AD stores 16-bit UUIDs little-endian; ERP/classifier want 0000XXXX-… form.
  const highByte = dataBytes[offset + 1].toString(16).padStart(2, '0');
  const lowByte = dataBytes[offset].toString(16).padStart(2, '0');
  return `0000${highByte}${lowByte}-0000-1000-8000-00805F9B34FB`.toUpperCase();
}

/** Format a little-endian 128-bit UUID into dashed uppercase text. */
function formatUuid128LittleEndian(dataBytes, offset) {
  // Why: Bluetooth AD stores 128-bit UUIDs little-endian; reverse to network order.
  const littleEndianBytes = dataBytes.slice(offset, offset + 16);
  const bigEndianBytes = new Uint8Array(16);
  for (let index = 0; index < 16; index += 1) {
    bigEndianBytes[index] = littleEndianBytes[15 - index];
  }
  const hexText = [...bigEndianBytes].map((oneByte) => oneByte.toString(16).padStart(2, '0')).join('');
  return (
    `${hexText.slice(0, 8)}-${hexText.slice(8, 12)}-${hexText.slice(12, 16)}-` +
    `${hexText.slice(16, 20)}-${hexText.slice(20)}`
  ).toUpperCase();
}

/** Parse raw advertising PDU bytes into name / services / iBeacon fields. */
export function parseBleAdvertisementBytes(rawBytesOrNull) {
  // Why: start with empty fields so callers always get a stable shape.
  const parsedAdvertisement = {
    localName: null,
    txPowerLevel: null,
    manufacturerBytes: null,
    manufacturerHex: null,
    ibeacon: null,
    serviceUuids: [],
    serviceData: [],
  };
  // Why: nothing to parse when native layer omitted rawHex.
  if (!rawBytesOrNull || rawBytesOrNull.length < 2) return parsedAdvertisement;

  let offset = 0;
  while (offset < rawBytesOrNull.length) {
    const fieldLength = rawBytesOrNull[offset];
    // Why: length 0 ends the AD structure.
    if (fieldLength === 0) break;
    // Why: stop if the declared length runs past the buffer (corrupt packet).
    if (offset + 1 + fieldLength > rawBytesOrNull.length) break;

    const fieldType = rawBytesOrNull[offset + 1];
    const fieldData = rawBytesOrNull.slice(offset + 2, offset + 1 + fieldLength);

    if (fieldType === AD_TYPE_COMPLETE_LOCAL_NAME || fieldType === AD_TYPE_SHORT_LOCAL_NAME) {
      const decodedName = convertBytesToUtf8Text(fieldData);
      if (decodedName) {
        // Why: complete name wins; short name fills only when no name yet.
        if (fieldType === AD_TYPE_COMPLETE_LOCAL_NAME || !parsedAdvertisement.localName) {
          parsedAdvertisement.localName = decodedName;
        }
      }
    } else if (fieldType === AD_TYPE_TX_POWER && fieldData.length >= 1) {
      // Why: TX power is a signed byte in the AD.
      parsedAdvertisement.txPowerLevel = fieldData[0] > 127 ? fieldData[0] - 256 : fieldData[0];
    } else if (fieldType === AD_TYPE_MANUFACTURER && fieldData.length >= 2) {
      parsedAdvertisement.manufacturerBytes = fieldData;
      parsedAdvertisement.manufacturerHex = convertBytesToHexDump(fieldData);
      if (!parsedAdvertisement.ibeacon) {
        const beacon = parseIbeaconFromAdvertisementBytes(fieldData);
        if (beacon) parsedAdvertisement.ibeacon = beacon;
      }
    } else if (
      (fieldType === AD_TYPE_INCOMPLETE_UUID16 || fieldType === AD_TYPE_COMPLETE_UUID16) &&
      fieldData.length >= 2
    ) {
      for (let index = 0; index + 2 <= fieldData.length; index += 2) {
        parsedAdvertisement.serviceUuids.push(formatUuid16LittleEndian(fieldData, index));
      }
    } else if (
      (fieldType === AD_TYPE_INCOMPLETE_UUID128 || fieldType === AD_TYPE_COMPLETE_UUID128) &&
      fieldData.length >= 16
    ) {
      for (let index = 0; index + 16 <= fieldData.length; index += 16) {
        parsedAdvertisement.serviceUuids.push(formatUuid128LittleEndian(fieldData, index));
      }
    } else if (fieldType === AD_TYPE_SERVICE_DATA_UUID16 && fieldData.length >= 2) {
      const serviceUuid = formatUuid16LittleEndian(fieldData, 0);
      const servicePayload = fieldData.slice(2);
      parsedAdvertisement.serviceData.push({
        uuid: serviceUuid,
        bytes: servicePayload,
        hex: convertBytesToHexDump(servicePayload, 48) ?? '',
      });
    } else if (fieldType === AD_TYPE_SERVICE_DATA_UUID32 && fieldData.length >= 4) {
      const servicePayload = fieldData.slice(4);
      parsedAdvertisement.serviceData.push({
        uuid: convertBytesToHexDump(fieldData.slice(0, 4), 4) ?? '32-bit',
        bytes: servicePayload,
        hex: convertBytesToHexDump(servicePayload, 48) ?? '',
      });
    } else if (fieldType === AD_TYPE_SERVICE_DATA_UUID128 && fieldData.length >= 16) {
      const serviceUuid = formatUuid128LittleEndian(fieldData, 0);
      const servicePayload = fieldData.slice(16);
      parsedAdvertisement.serviceData.push({
        uuid: serviceUuid,
        bytes: servicePayload,
        hex: convertBytesToHexDump(servicePayload, 48) ?? '',
      });
    }

    // Why: advance past length byte + type/data payload.
    offset += fieldLength + 1;
  }

  // Why: last resort — search whole PDU when AD lengths were malformed.
  if (!parsedAdvertisement.ibeacon) {
    parsedAdvertisement.ibeacon = parseIbeaconFromAdvertisementBytes(rawBytesOrNull);
  }

  return parsedAdvertisement;
}

/** Parse a native hex dump string into structured advertisement fields. */
export function parseBleAdvertisementHexDump(rawHexDump) {
  // Why: convert hex text first so the PDU walker always receives bytes.
  return parseBleAdvertisementBytes(convertHexDumpToBytes(rawHexDump));
}
