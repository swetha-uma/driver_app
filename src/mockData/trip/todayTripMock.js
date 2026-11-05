/** Mock live trips for design — Pickup + Drop with long stop lists. */

export const TRIP_STATUS = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const SHARED_VEHICLE = {
  vehicleName: 'School Bus A',
  vehiclePlate: 'KA-01-AB-1234',
};

const PICKUP_STOP_NAMES = [
  'Green Park Gate',
  'City Library',
  'Lake View Apt',
  'Market Square',
  'Station Road',
  'Oak Street',
  'River Bridge',
  'Temple Circle',
  'Hospital Gate',
  'Sports Complex',
  'Tech Park',
  'Garden Colony',
  'Bus Depot',
  'Mall Entrance',
  'Railway Cross',
  'Police Station',
  'College Road',
  'Park Avenue',
  'Sunrise Nagar',
  'Hill View',
  'Central Plaza',
  'Metro Gate A',
  'Metro Gate B',
  'Church Street',
  'Post Office',
  'Bank Junction',
  'Cinema Hall',
  'Water Tank',
  'Old Market',
  'School Gate',
];

const DROP_STOP_NAMES = [...PICKUP_STOP_NAMES].reverse();

function buildStops(names) {
  return names.map((name, index) => ({
    name,
    studentCount: 1 + ((index * 3) % 6),
  }));
}

const PICKUP_STOPS = buildStops(PICKUP_STOP_NAMES);
const DROP_STOPS = buildStops(DROP_STOP_NAMES);

function buildTrip({ id, tripType, routeName, scheduledStartTime, scheduledEndTime, stops }) {
  return {
    id,
    tripType,
    status: TRIP_STATUS.SCHEDULED,
    ...SHARED_VEHICLE,
    routeName,
    scheduledStartTime,
    scheduledEndTime,
    stopCount: stops.length,
    studentCount: stops.reduce((sum, stop) => sum + stop.studentCount, 0),
    stops,
    completedStops: 0,
    actualStartTime: null,
    actualEndTime: null,
  };
}

export function createMockPickupTrip() {
  return buildTrip({
    id: 'trip-pickup-mock-1',
    tripType: 'Pickup',
    routeName: 'North Campus Morning',
    scheduledStartTime: '07:00',
    scheduledEndTime: '08:30',
    stops: PICKUP_STOPS,
  });
}

export function createMockDropTrip() {
  return buildTrip({
    id: 'trip-drop-mock-1',
    tripType: 'Drop',
    routeName: 'North Campus Evening',
    scheduledStartTime: '15:00',
    scheduledEndTime: '16:30',
    stops: DROP_STOPS,
  });
}

export function createMockTodayTrips() {
  return {
    pickup: createMockPickupTrip(),
    drop: createMockDropTrip(),
  };
}

/** Next stop while trip is in progress (mock pointer). */
export function getNextStop(trip) {
  if (!trip?.stops?.length) return null;
  const index = Math.min(trip.completedStops ?? 0, trip.stops.length - 1);
  if ((trip.completedStops ?? 0) >= trip.stops.length) return null;
  return { ...trip.stops[index], index };
}

export function buildTodaySummary(pickup, drop) {
  const chips = [
    { id: 'pickup', label: `Pickup · ${pickup.status}`, status: pickup.status },
    { id: 'drop', label: `Drop · ${drop.status}`, status: drop.status },
  ];

  let headline = 'Today: 1 Pickup · 1 Drop';
  if (pickup.status === TRIP_STATUS.IN_PROGRESS) {
    headline = 'Pickup in progress';
  } else if (drop.status === TRIP_STATUS.IN_PROGRESS) {
    headline = 'Drop in progress';
  } else if (
    pickup.status === TRIP_STATUS.COMPLETED
    && drop.status === TRIP_STATUS.COMPLETED
  ) {
    headline = 'All trips completed today';
  } else if (pickup.status === TRIP_STATUS.COMPLETED) {
    headline = 'Pickup done · Drop waiting';
  }

  return { headline, chips };
}
