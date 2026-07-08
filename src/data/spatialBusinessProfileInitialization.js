function createPlaceDemandProfile(place) {
  const typeWeight = {
    RESIDENTIAL: 1.2,
    OFFICE: 1.1,
    COMMERCIAL: 1,
    HOSPITAL: 0.8,
    SCHOOL: 0.7,
    METRO_STATION: 1.3,
    OPS_CENTER: 0.2,
  }[place.place_type] ?? 0.6;
  const demandWeight = Number(place.demand_weight ?? typeWeight);
  return {
    profile_id: `PDP-${place.place_id}`,
    place_id: place.place_id,
    profile_status: "ACTIVE",
    resident_population: place.place_type === "RESIDENTIAL" ? 1200 : 0,
    working_population: place.place_type === "OFFICE" ? 1800 : 0,
    daily_visitors: Math.round(500 * demandWeight),
    trip_generation_rate: Number((0.08 * demandWeight).toFixed(3)),
    demand_weight: demandWeight,
    peak_pattern: place.peak_pattern || "BALANCED",
    growth_rate: 0,
    robotaxi_adoption_rate: 0.18,
    effective_from: "Day 1 00:00:00",
    effective_to: null,
  };
}

function createServiceAreaDemandProfile(serviceArea) {
  const capacity = Number(serviceArea.capacity || 0);
  return {
    profile_id: `SADP-${serviceArea.service_area_id}`,
    service_area_id: serviceArea.service_area_id,
    profile_status: "ACTIVE",
    pickup_probability: 0.5,
    dropoff_probability: 0.5,
    peak_demand_ratio: 1.2,
    service_capacity: capacity,
    waiting_capacity: Number(serviceArea.waiting_capacity || serviceArea.parking_cell_ids?.length || 0),
    turnover_capacity: Math.max(1, capacity * 4),
    effective_from: "Day 1 00:00:00",
    effective_to: null,
  };
}

export function calculateZoneDemandProfiles({ zones = [], places = [], serviceAreas = [], placeDemandProfiles = [], serviceAreaDemandProfiles = [] }) {
  const placeProfileById = new Map(placeDemandProfiles.map((profile) => [profile.place_id, profile]));
  const serviceAreaProfileById = new Map(serviceAreaDemandProfiles.map((profile) => [profile.service_area_id, profile]));
  return zones.map((zone) => {
    const zonePlaceProfiles = (zone.place_ids || [])
      .map((placeId) => placeProfileById.get(placeId))
      .filter(Boolean);
    const zoneServiceAreaProfiles = (zone.service_area_ids || [])
      .map((serviceAreaId) => serviceAreaProfileById.get(serviceAreaId))
      .filter(Boolean);
    const potentialDemand = zonePlaceProfiles.reduce((sum, profile) => (
      sum + Number(profile.daily_visitors || 0) * Number(profile.trip_generation_rate || 0)
    ), 0);
    const expectedDemand = potentialDemand * 0.18;
    const serviceCapacity = zoneServiceAreaProfiles.reduce((sum, profile) => sum + Number(profile.service_capacity || 0), 0);
    const supplyNeedScore = serviceCapacity > 0 ? expectedDemand / serviceCapacity : expectedDemand;
    return {
      profile_id: `ZDP-${zone.zone_id}`,
      zone_id: zone.zone_id,
      profile_status: "ACTIVE",
      potential_demand: Number(potentialDemand.toFixed(2)),
      expected_robotaxi_demand: Number(expectedDemand.toFixed(2)),
      peak_hour_demand: Number((expectedDemand * 1.2).toFixed(2)),
      demand_distribution: {
        place_count: zonePlaceProfiles.length,
        service_area_count: zoneServiceAreaProfiles.length,
      },
      growth_factor: 1,
      supply_need_score: Number(supplyNeedScore.toFixed(2)),
      calculated_from_profile_ids: [
        ...zonePlaceProfiles.map((profile) => profile.profile_id),
        ...zoneServiceAreaProfiles.map((profile) => profile.profile_id),
      ],
      calculated_at: "Day 1 00:00:00",
    };
  });
}

export function initializeSpatialBusinessProfiles({ places = [], serviceAreas = [], zones = [] } = {}) {
  const placeDemandProfiles = places.map(createPlaceDemandProfile);
  const serviceAreaDemandProfiles = serviceAreas.map(createServiceAreaDemandProfile);
  const zoneDemandProfiles = calculateZoneDemandProfiles({
    zones,
    places,
    serviceAreas,
    placeDemandProfiles,
    serviceAreaDemandProfiles,
  });
  return {
    placeDemandProfiles,
    serviceAreaDemandProfiles,
    zoneDemandProfiles,
  };
}
