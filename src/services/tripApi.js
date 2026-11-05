import { DRIVER_TOKEN_HEADER } from './loginApi';
import { getApiBase } from '../features/settings/backendUrl';

/**
 * Trip APIs for the Driver App.
 * Mark-stop-done and end-trip persist on the school server.
 */

export async function startTrip(_tripId) {
  // Why: Phase 2 will POST start; until then Home updates local card status only
  throw new Error('Start trip API not implemented yet');
}

/**
 * Mark this trip COMPLETED (manual swipe to end).
 * @param {string} driverToken Redis session from verify-otp
 * @param {string|number} tripId trips.id from the Home card
 * @returns {Promise<{ tripId: string, status: string }>}
 */
export async function endTrip(driverToken, tripId) {
  // Why: blank session or trip id would hit the API with nothing useful
  if (!driverToken || tripId == null || tripId === '') {
    throw new Error('Sign in again to end the trip');
  }
  // Why: same path as DriverTripEndNames.END on the backend
  const url =
    `${getApiBase()}/api/v1/driver-app/trips/${encodeURIComponent(String(tripId))}/end`;
  // Why: POST sets trips.trip_status = COMPLETED (no request body needed)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      // Why: backend maps employee from Redis via X-Driver-Token, not the body
      [DRIVER_TOKEN_HEADER]: driverToken,
    },
  });
  let body;
  try {
    // Why: ApiResponse JSON carries success + data.status
    body = await response.json();
  } catch {
    // Why: surface network/parse failure clearly on the Home card
    throw new Error(response.ok ? 'Invalid server response' : 'Could not reach the school server');
  }
  // Why: ApiResponse.success is false when trip is cancelled or not owned
  if (!response.ok || body.success === false || body.data == null) {
    throw new Error(body.message || 'Could not end the trip');
  }
  // Why: Home applies Completed status from this payload (and then refreshes)
  return body.data;
}

/**
 * Mark the next unreached stop on this trip as done (manual fallback).
 * @param {string} driverToken Redis session from verify-otp
 * @param {string|number} tripId trips.id from the Home card
 * @returns {Promise<{ tripId: string, completedStops: number, stopCount: number, reachedStopId: number, reachedStopName: string, allStopsDone: boolean }>}
 */
export async function markNextStopDone(driverToken, tripId) {
  // Why: blank session or trip id would hit the API with nothing useful
  if (!driverToken || tripId == null || tripId === '') {
    throw new Error('Sign in again to mark the stop');
  }
  // Why: same path as DriverStopReachNames.MARK_NEXT on the backend
  const url =
    `${getApiBase()}/api/v1/driver-app/trips/${encodeURIComponent(String(tripId))}/stops/mark-next-done`;
  // Why: POST creates a driver_trip_stop_reach row (no request body needed)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      // Why: backend maps employee from Redis via X-Driver-Token, not the body
      [DRIVER_TOKEN_HEADER]: driverToken,
    },
  });
  let body;
  try {
    // Why: ApiResponse JSON carries success + data.completedStops
    body = await response.json();
  } catch {
    // Why: surface network/parse failure clearly on the Home card
    throw new Error(response.ok ? 'Invalid server response' : 'Could not reach the school server');
  }
  // Why: ApiResponse.success is false when trip is cancelled or already finished
  if (!response.ok || body.success === false || body.data == null) {
    throw new Error(body.message || 'Could not mark stop done');
  }
  // Why: Home applies completedStops from this payload (and then refreshes)
  return body.data;
}
