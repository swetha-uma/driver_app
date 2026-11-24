/**
 * Format late minutes as "45 min", "1 hr", "1 hr 1 min".
 * @param {number|null|undefined} minutes
 * @returns {string|null}
 */
export function formatLateDuration(minutes) { // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  if (minutes == null || Number.isNaN(Number(minutes))) return null;
  const total = Math.max(0, Math.floor(Number(minutes)));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  const hourLabel = hours === 1 ? '1 hr' : `${hours} hr`;
  if (mins === 0) return hourLabel;
  return `${hourLabel} ${mins} min`;
}
