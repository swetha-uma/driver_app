/** True when a row's status matches the chosen status filter ('all' | 'pending' | 'approved' | 'rejected'). */
export function matchesStatusFilter(status, filterId) {
  if (!filterId || filterId === 'all') return true;
  return String(status || '').toUpperCase() === filterId.toUpperCase();
}

/** True when `dateValue` falls inside the picked {from, to} range (inclusive, ISO "yyyy-mm-dd" strings). */
export function matchesDateRange(dateValue, range) {
  if (!range || !range.from) return true;
  if (!dateValue) return false;
  const day = String(dateValue).slice(0, 10);
  const from = range.from;
  const to = range.to || range.from;
  return day >= from && day <= to;
}
