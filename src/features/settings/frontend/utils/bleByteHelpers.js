/** Turn a hex dump ("02 01 06 …") into bytes so we can parse the advertisement PDU. */
export function convertHexDumpToBytes(hexDump) {
  // Why: empty input means the native scan did not include raw bytes.
  if (!hexDump) return null;
  // Why: strip spaces/colons so both nRF-style and compact hex work.
  const compactHex = String(hexDump).replace(/[\s:.-]/g, '');
  // Why: reject odd-length or non-hex strings instead of producing garbage bytes.
  if (compactHex.length === 0 || compactHex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(compactHex)) {
    return null;
  }
  // Why: allocate exact byte length for the parsed hex pairs.
  const byteArray = new Uint8Array(compactHex.length / 2);
  // Why: walk two hex chars at a time into one unsigned byte.
  for (let byteIndex = 0; byteIndex < byteArray.length; byteIndex += 1) {
    byteArray[byteIndex] = parseInt(compactHex.slice(byteIndex * 2, byteIndex * 2 + 2), 16);
  }
  // Why: callers need the raw AD payload for iBeacon / name / service parsing.
  return byteArray;
}

/** Format bytes as spaced hex for Reader expand rows and copy-to-clipboard debug. */
export function convertBytesToHexDump(byteArray, maxBytes = 64) {
  // Why: missing bytes should render as empty rather than crashing the list row.
  if (!byteArray || byteArray.length === 0) return null;
  // Why: truncate long manufacturer blobs so the UI stays readable.
  const visibleBytes = byteArray.length > maxBytes ? byteArray.subarray(0, maxBytes) : byteArray;
  // Why: uppercase spaced hex matches what nRF Connect shows.
  const hexDump = [...visibleBytes]
    .map((oneByte) => oneByte.toString(16).padStart(2, '0'))
    .join(' ')
    .toUpperCase();
  // Why: show an ellipsis when we cut the packet so operators know more bytes exist.
  return byteArray.length > maxBytes ? `${hexDump} …` : hexDump;
}

/** Decode AD name fields as UTF-8 text used as Type A card ids. */
export function convertBytesToUtf8Text(byteArray) {
  try {
    // Why: TextDecoder is the correct way to read BLE Complete/Short Local Name bytes.
    return new TextDecoder('utf-8', { fatal: false }).decode(byteArray).replace(/\0/g, '').trim();
  } catch {
    // Why: older runtimes may lack TextDecoder — fall back to printable ASCII only.
    let asciiText = '';
    for (const oneByte of byteArray) {
      if (oneByte === 0) break;
      if (oneByte >= 32 && oneByte < 127) asciiText += String.fromCharCode(oneByte);
    }
    return asciiText.trim();
  }
}
