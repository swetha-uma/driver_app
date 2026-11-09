/** Build local wall-clock ISO without timezone suffix — matches CaptureAdvertisingRequest.time. */
export function buildLocalIsoTimestampFromMillis(millis) {
  // Why: server attendance windows use the phone's local clock string style.
  const date = new Date(millis);
  // Why: zero-pad so month/day/hour always take two digits.
  const padTwoDigits = (value) => String(value).padStart(2, '0');
  // Why: concatenate date and time the same way the standalone mobile gateway did.
  return (
    `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}` +
    `T${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}:${padTwoDigits(date.getSeconds())}`
  );
}

/** Convenience for log rows that need "now" in local ISO form. */
export function buildLocalIsoTimestampNow() {
  // Why: detection logs should show the same clock the capture payload uses.
  return buildLocalIsoTimestampFromMillis(Date.now());
}
