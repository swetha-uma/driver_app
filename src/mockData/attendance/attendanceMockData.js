/** Mock driver attendance by month — same shape as parent calendar. */

function buildNovember2026Days() {
  const days = [];
  for (let day = 1; day <= 30; day += 1) {
    const date = `2026-11-${String(day).padStart(2, '0')}`;
    const weekday = new Date(2026, 10, day).getDay();
    if (weekday === 0 || weekday === 6) {
      continue;
    }
    if (day === 5) {
      days.push({ date, status: 'absent' });
    } else if (day === 12) {
      days.push({ date, status: 'late' });
    } else if (day === 19) {
      days.push({ date, status: 'leave' });
    } else if (day === 26) {
      days.push({ date, status: 'halfDay' });
    } else if (day <= 3 || day >= 28) {
      days.push({ date, status: 'present' });
    } else {
      days.push({ date, status: 'present' });
    }
  }
  return days;
}

function summarize(days) {
  const counts = {
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
  };
  days.forEach((day) => {
    if (counts[day.status] != null) counts[day.status] += 1;
  });
  const marked = counts.present + counts.absent + counts.late + counts.halfDay + counts.leave;
  const percentage = marked === 0 ? 0 : Math.round((counts.present / marked) * 100);
  return {
    days,
    percentage,
    presentCount: counts.present,
    absentCount: counts.absent,
    lateCount: counts.late,
    halfDayCount: counts.halfDay,
    leaveCount: counts.leave,
  };
}

const MONTH_CACHE = {
  '2026-11': summarize(buildNovember2026Days()),
  '2026-10': summarize([
    { date: '2026-10-01', status: 'present' },
    { date: '2026-10-02', status: 'present' },
    { date: '2026-10-03', status: 'absent' },
    { date: '2026-10-06', status: 'late' },
    { date: '2026-10-07', status: 'present' },
    { date: '2026-10-08', status: 'present' },
    { date: '2026-10-09', status: 'present' },
    { date: '2026-10-10', status: 'halfDay' },
    { date: '2026-10-13', status: 'present' },
    { date: '2026-10-14', status: 'leave' },
    { date: '2026-10-15', status: 'present' },
    { date: '2026-10-16', status: 'present' },
    { date: '2026-10-17', status: 'present' },
    { date: '2026-10-20', status: 'present' },
    { date: '2026-10-21', status: 'present' },
    { date: '2026-10-22', status: 'absent' },
    { date: '2026-10-23', status: 'present' },
    { date: '2026-10-24', status: 'present' },
    { date: '2026-10-27', status: 'present' },
    { date: '2026-10-28', status: 'present' },
    { date: '2026-10-29', status: 'present' },
    { date: '2026-10-30', status: 'present' },
    { date: '2026-10-31', status: 'present' },
  ]),
};

/** Load mock month data for driver attendance calendar. month is 1–12. */
export function loadDriverAttendanceMonth(year, month) {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  if (MONTH_CACHE[key]) {
    return MONTH_CACHE[key];
  }
  return {
    days: [],
    percentage: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    halfDayCount: 0,
    leaveCount: 0,
  };
}
