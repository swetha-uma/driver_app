/** Normalize any pasted MAC into AA:BB:CC:DD:EE:FF so GMAC/DMAC comparisons stay consistent. */
export function normalizeBleMacAddress(rawMac) {
  // Why: empty values mean the field was left blank on purpose.
  if (!rawMac) return null;
  // Why: keep only hex digits so dashes, colons, or spaces still parse.
  const hexOnly = String(rawMac).replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  // Why: a MAC must be exactly 12 hex chars (6 bytes).
  if (hexOnly.length !== 12) return null;
  // Why: insert colon separators in the ERP/admin style used by ble_capture.
  return hexOnly.match(/.{2}/g).join(':');
}

/** Split multi-line / comma zone-card text into valid MACs plus invalid entries for form errors. */
export function parseBleMacAddressList(rawText) {
  // Why: collect unique valid MACs for multi-zone mode.
  const validMacAddresses = [];
  // Why: collect bad entries so Settings can show which line failed.
  const invalidEntries = [];
  // Why: drivers paste one MAC per line or comma-separated from Excel.
  for (const rawEntry of String(rawText || '').split(/[\n,;]+/)) {
    const trimmedEntry = rawEntry.trim();
    // Why: skip blank lines between pasted blocks.
    if (!trimmedEntry) continue;
    const normalizedMac = normalizeBleMacAddress(trimmedEntry);
    if (!normalizedMac) {
      invalidEntries.push(trimmedEntry);
    } else if (!validMacAddresses.includes(normalizedMac)) {
      validMacAddresses.push(normalizedMac);
    }
  }
  // Why: Settings save needs both lists to validate and persist.
  return { macs: validMacAddresses, invalidEntries };
}

/** Join saved zone-card MACs back into editable multiline text. */
export function formatBleMacAddressList(macAddresses) {
  // Why: one MAC per line is easiest for drivers to edit in Settings.
  return (macAddresses || []).join('\n');
}

/** Prefer dashed uppercase UUID so Type B card ids match ERP BLE mapping rows. */
export function normalizeBleUuid(rawUuid) {
  // Why: missing UUID means this packet is not an iBeacon identity.
  if (!rawUuid) return null;
  // Why: strip separators so both dashed and compact UUIDs normalize the same way.
  const hexOnly = String(rawUuid).replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  // Why: non-32-hex values keep the trimmed original (some cards use short names as id).
  if (hexOnly.length !== 32) {
    const trimmedUuid = String(rawUuid).trim();
    return trimmedUuid.length > 0 ? trimmedUuid : null;
  }
  // Why: insert RFC dashes so server mapping lookups stay consistent.
  return (
    `${hexOnly.slice(0, 8)}-${hexOnly.slice(8, 12)}-${hexOnly.slice(12, 16)}-` +
    `${hexOnly.slice(16, 20)}-${hexOnly.slice(20)}`
  );
}
