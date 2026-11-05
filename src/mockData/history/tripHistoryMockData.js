import { toIsoDate } from '../../utils/formatTripDate';

/** Mock trip history — past completed trips only. */

function daysAgoIso(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toIsoDate(date);
}

export const tripHistoryMockData = {
  totals: {
    todayCompleted: 1,
    todayTotal: 2,
    totalCompleted: 48,
  },
  recentCompleted: [
    {
      id: 'h1',
      tripDate: daysAgoIso(1),
      tripType: 'Drop',
      routeName: 'North Campus Evening',
      vehicleName: 'School Bus A',
      status: 'Completed',
      actualStartTime: '15:02',
      actualEndTime: '16:18',
    },
    {
      id: 'h2',
      tripDate: daysAgoIso(1),
      tripType: 'Pickup',
      routeName: 'North Campus Morning',
      vehicleName: 'School Bus A',
      status: 'Completed',
      actualStartTime: '06:58',
      actualEndTime: '08:22',
    },
    {
      id: 'h3',
      tripDate: daysAgoIso(2),
      tripType: 'Drop',
      routeName: 'North Campus Evening',
      vehicleName: 'School Bus A',
      status: 'Completed',
      actualStartTime: '15:10',
      actualEndTime: '16:25',
    },
    {
      id: 'h4',
      tripDate: daysAgoIso(3),
      tripType: 'Pickup',
      routeName: 'North Campus Morning',
      vehicleName: 'School Bus A',
      status: 'Completed',
      actualStartTime: '07:00',
      actualEndTime: '08:30',
    },
  ],
};
