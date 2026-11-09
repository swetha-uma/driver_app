/** Format 16 UUID bytes into dashed uppercase proximity UUID text. */
function formatIbeaconUuidBytes(uuidBytes) {
  // Why: join to hex then insert dashes so ERP mapping rows match.
  const hexText = [...uuidBytes].map((oneByte) => oneByte.toString(16).padStart(2, '0')).join('');
  return (
    `${hexText.slice(0, 8)}-${hexText.slice(8, 12)}-${hexText.slice(12, 16)}-` +
    `${hexText.slice(16, 20)}-${hexText.slice(20)}`
  ).toUpperCase();
}

/** Read a big-endian unsigned 16-bit field (major / minor). */
function readUnsigned16BigEndian(byteArray, offset) {
  // Why: iBeacon major/minor are big-endian in the manufacturer payload.
  return ((byteArray[offset] << 8) | byteArray[offset + 1]) & 0xffff;
}

/** Parse Apple iBeacon layout starting at a known offset inside manufacturer or raw bytes. */
function parseIbeaconLayoutAtOffset(byteArray, offset) {
  // Why: need 02 15 + UUID(16) + major(2) + minor(2) + power(1) = 23 bytes.
  if (offset + 23 > byteArray.length) return null;
  // Why: Apple beacon type byte must be 0x02.
  if (byteArray[offset] !== 0x02) return null;
  // Why: length is normally 0x15; accept nearby clones that still pack 21 payload bytes.
  const lengthByte = byteArray[offset + 1];
  if (lengthByte !== 0x15 && lengthByte !== 0x14 && lengthByte !== 0x16) {
    return null;
  }
  // Why: guard remaining length before slicing UUID/major/minor/power.
  if (offset + 2 + 16 + 2 + 2 + 1 > byteArray.length) return null;
  // Why: UUID sits immediately after type/length.
  const uuidBytes = byteArray.slice(offset + 2, offset + 18);
  // Why: return the fields Reader and Gateway both need for Type B cards.
  return {
    companyId: '0x004C (Apple)',
    uuid: formatIbeaconUuidBytes(uuidBytes),
    major: readUnsigned16BigEndian(byteArray, offset + 18),
    minor: readUnsigned16BigEndian(byteArray, offset + 20),
    rawPowerByte: byteArray[offset + 22],
  };
}

/** Find Apple iBeacon inside manufacturer payload or full raw scan record. */
export function parseIbeaconFromAdvertisementBytes(byteArray) {
  // Why: too-short buffers cannot hold a full iBeacon frame.
  if (!byteArray || byteArray.length < 23) return null;
  // Why: preferred path is Apple company id 4C 00 then beacon type/length.
  for (let index = 0; index + 25 <= byteArray.length; index += 1) {
    if (byteArray[index] === 0x4c && byteArray[index + 1] === 0x00) {
      const beacon = parseIbeaconLayoutAtOffset(byteArray, index + 2);
      if (beacon) return beacon;
    }
  }
  // Why: some stacks already stripped the company id so the buffer starts at 02 15.
  const beaconAtStart = parseIbeaconLayoutAtOffset(byteArray, 0);
  if (beaconAtStart) return beaconAtStart;
  // Why: defensive scan for 02 15 anywhere matches malformed AD lengths seen in the field.
  for (let index = 0; index + 23 <= byteArray.length; index += 1) {
    if (byteArray[index] === 0x02 && byteArray[index + 1] === 0x15) {
      const beacon = parseIbeaconLayoutAtOffset(byteArray, index);
      if (beacon) return beacon;
    }
  }
  // Why: not an iBeacon — classifier will try Type A name/service rules next.
  return null;
}
