export const TripStatus = {
  WAITING_ROUTE: "WAITING_ROUTE",
  WAITING_CUSTOMER_BOARDING: "WAITING_CUSTOMER_BOARDING",
  CUSTOMER_ONBOARD: "CUSTOMER_ONBOARD",
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  ON_THE_WAY_PICKUP: "ON_THE_WAY_PICKUP",
  ARRIVED_PICKUP: "ARRIVED_PICKUP",
  PASSENGER_ONBOARD: "PASSENGER_ONBOARD",
  ON_THE_WAY_DESTINATION: "ON_THE_WAY_DESTINATION",
  ARRIVED_DESTINATION: "ARRIVED_DESTINATION",
  WAITING_OPERATION_DECISION: "WAITING_OPERATION_DECISION",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
};

export const TripPhase = {
  PICKUP: "PICKUP",
  DESTINATION: "DESTINATION",
  COMPLETED: "COMPLETED",
};

export function createTrip(trip) {
  return trip;
}

export function normalizeTripRecord(trip) {
  if (!trip || trip.trip_status !== "SETTLING") return trip;
  return {
    ...trip,
    trip_status: TripStatus.COMPLETED,
    trip_phase: TripPhase.COMPLETED,
    completed_at: trip.completed_at || trip.updated_at || trip.created_at || null,
  };
}
