/** Calendar day helpers for trip history labels. */

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseTripDate(tripDate) {
  if (!tripDate) return null;
  const parsed = new Date(`${tripDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

/** ISO date string YYYY-MM-DD for local calendar day. */
export function toIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Relative label: Today / Yesterday / N days ago / formatted date. */
export function formatTripDateLabel(tripDate, now = new Date()) {
  const tripDay = parseTripDate(tripDate);
  if (!tripDay) return tripDate || '—';

  const today = startOfDay(now);
  const diffDays = Math.round((today.getTime() - tripDay.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

  return tripDay.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function isSameCalendarDay(tripDate, now = new Date()) {
  return formatTripDateLabel(tripDate, now) === 'Today';
}
