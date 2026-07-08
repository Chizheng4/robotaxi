const TargetObjectType = {
  PLACE: "PLACE",
  SERVICE_AREA: "SERVICE_AREA",
  ZONE: "ZONE",
};

function profileTargetName({ targetObjectType, targetObjectId, places = [], serviceAreas = [], zones = [] }) {
  if (targetObjectType === TargetObjectType.PLACE) {
    const place = places.find((item) => item.place_id === targetObjectId);
    return place?.place_name || targetObjectId;
  }
  if (targetObjectType === TargetObjectType.SERVICE_AREA) {
    const serviceArea = serviceAreas.find((item) => item.service_area_id === targetObjectId);
    return serviceArea?.service_area_name || targetObjectId;
  }
  if (targetObjectType === TargetObjectType.ZONE) {
    const zone = zones.find((item) => item.zone_id === targetObjectId);
    return zone?.zone_name || targetObjectId;
  }
  return targetObjectId;
}

function roundValue(value, digits = 2) {
  return Number((Number(value) || 0).toFixed(digits));
}

function normalizeTargetObjectType(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (normalized === "place") return TargetObjectType.PLACE;
  if (normalized === "serviceArea" || normalized === "service_area") return TargetObjectType.SERVICE_AREA;
  if (normalized === "zone") return TargetObjectType.ZONE;
  return normalized.replace("_DEMAND", "").toUpperCase();
}

function createBaseDemandProfile({ profileId, profileName, targetObjectType, targetObjectId, targetObjectName }) {
  return {
    profile_id: profileId,
    profile_name: profileName,
    target_object_type: targetObjectType,
    target_object_id: targetObjectId,
    target_object_name: targetObjectName,
    profile_version: 1,
    profile_status: "ACTIVE",
    effective_from: "Day 1 00:00:00",
    effective_to: null,
  };
}

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
  const residentPopulation = place.place_type === "RESIDENTIAL" ? 1200 : 0;
  const workingPopulation = place.place_type === "OFFICE" ? 1800 : 0;
  const dailyVisitors = Math.round(500 * demandWeight);
  const tripGenerationRate = Number((0.08 * demandWeight).toFixed(3));
  const robotaxiAdoptionRate = 0.18;
  const serviceAcceptanceRate = 0.9;
  const potentialDemand = (residentPopulation + workingPopulation + dailyVisitors) * tripGenerationRate * demandWeight;
  const expectedDemand = potentialDemand * robotaxiAdoptionRate * serviceAcceptanceRate;
  return {
    ...createBaseDemandProfile({
      profileId: `DP-P-${place.place_id}`,
      profileName: `${place.place_name || place.place_id}需求画像`,
      targetObjectType: TargetObjectType.PLACE,
      targetObjectId: place.place_id,
      targetObjectName: place.place_name || place.place_id,
    }),
    resident_population: residentPopulation,
    working_population: workingPopulation,
    daily_visitors: dailyVisitors,
    trip_generation_rate: tripGenerationRate,
    demand_weight: demandWeight,
    peak_pattern: place.peak_pattern || "BALANCED",
    growth_rate: 0,
    robotaxi_adoption_rate: robotaxiAdoptionRate,
    service_acceptance_rate: serviceAcceptanceRate,
    potential_demand: roundValue(potentialDemand),
    expected_robotaxi_demand: roundValue(expectedDemand),
    peak_hour_demand: roundValue(expectedDemand * 1.2),
    calculated_at: "Day 1 00:00:00",
  };
}

function createServiceAreaDemandProfile(serviceArea) {
  const capacity = Number(serviceArea.capacity || 0);
  return {
    ...createBaseDemandProfile({
      profileId: `DP-SA-${serviceArea.service_area_id}`,
      profileName: `${serviceArea.service_area_name || serviceArea.service_area_id}需求画像`,
      targetObjectType: TargetObjectType.SERVICE_AREA,
      targetObjectId: serviceArea.service_area_id,
      targetObjectName: serviceArea.service_area_name || serviceArea.service_area_id,
    }),
    pickup_probability: 0.5,
    dropoff_probability: 0.5,
    peak_demand_ratio: 1.2,
    service_capacity: capacity,
    waiting_capacity: Number(serviceArea.waiting_capacity || serviceArea.parking_cell_ids?.length || 0),
    turnover_capacity: Math.max(1, capacity * 4),
    accessibility_factor: 1,
  };
}

export function calculateZoneDemandProfiles({ zones = [], places = [], serviceAreas = [], demandProfiles = [] }) {
  const placeProfileById = new Map(demandProfiles
    .filter((profile) => profile.target_object_type === TargetObjectType.PLACE)
    .map((profile) => [profile.target_object_id, profile]));
  const serviceAreaProfileById = new Map(demandProfiles
    .filter((profile) => profile.target_object_type === TargetObjectType.SERVICE_AREA)
    .map((profile) => [profile.target_object_id, profile]));
  return zones.map((zone) => {
    const zonePlaceProfiles = (zone.place_ids || [])
      .map((placeId) => placeProfileById.get(placeId))
      .filter(Boolean);
    const zoneServiceAreaProfiles = (zone.service_area_ids || [])
      .map((serviceAreaId) => serviceAreaProfileById.get(serviceAreaId))
      .filter(Boolean);
    const potentialDemand = zonePlaceProfiles.reduce((sum, profile) => sum + Number(profile.potential_demand || 0), 0);
    const expectedDemand = zonePlaceProfiles.reduce((sum, profile) => sum + Number(profile.expected_robotaxi_demand || 0), 0);
    const serviceCapacity = zoneServiceAreaProfiles.reduce((sum, profile) => sum + Number(profile.service_capacity || 0), 0);
    const supplyNeedScore = serviceCapacity > 0 ? expectedDemand / serviceCapacity : expectedDemand;
    const targetName = profileTargetName({
      targetObjectType: TargetObjectType.ZONE,
      targetObjectId: zone.zone_id,
      places,
      serviceAreas,
      zones,
    });
    return {
      ...createBaseDemandProfile({
        profileId: `DP-Z-${zone.zone_id}`,
        profileName: `${targetName}需求画像`,
        targetObjectType: TargetObjectType.ZONE,
        targetObjectId: zone.zone_id,
        targetObjectName: targetName,
      }),
      zone_adjustment_factor: 1,
      coverage_factor: 1,
      competition_factor: 1,
      growth_factor: 1,
      potential_demand: roundValue(potentialDemand),
      expected_robotaxi_demand: roundValue(expectedDemand),
      peak_hour_demand: roundValue(expectedDemand * 1.2),
      demand_distribution: {
        place_count: zonePlaceProfiles.length,
        service_area_count: zoneServiceAreaProfiles.length,
      },
      supply_need_score: roundValue(supplyNeedScore),
      calculated_from_profile_ids: [
        ...zonePlaceProfiles.map((profile) => profile.profile_id),
        ...zoneServiceAreaProfiles.map((profile) => profile.profile_id),
      ],
      calculated_at: "Day 1 00:00:00",
    };
  });
}

function migrateLegacyProfile(profile, targetObjectType, targetObjectId, context) {
  const targetObjectName = profileTargetName({
    targetObjectType,
    targetObjectId,
    places: context.places,
    serviceAreas: context.serviceAreas,
    zones: context.zones,
  });
  const base = createBaseDemandProfile({
    profileId: profile.profile_id || `DP-${targetObjectType}-${targetObjectId}`,
    profileName: profile.profile_name || `${targetObjectName}需求画像`,
    targetObjectType,
    targetObjectId,
    targetObjectName,
  });
  const potentialDemand = profile.potential_demand ?? (
    targetObjectType === TargetObjectType.PLACE
      ? (Number(profile.resident_population || 0) + Number(profile.working_population || 0) + Number(profile.daily_visitors || 0))
        * Number(profile.trip_generation_rate || 0)
        * Number(profile.demand_weight || 1)
      : undefined
  );
  const expectedDemand = profile.expected_robotaxi_demand ?? (
    potentialDemand == null
      ? undefined
      : Number(potentialDemand || 0) * Number(profile.robotaxi_adoption_rate || 0) * Number(profile.service_acceptance_rate || 1)
  );
  return {
    ...profile,
    ...base,
    profile_version: Number(profile.profile_version || base.profile_version),
    profile_status: profile.profile_status || base.profile_status,
    effective_from: profile.effective_from || base.effective_from,
    effective_to: profile.effective_to ?? base.effective_to,
    ...(potentialDemand == null ? {} : { potential_demand: roundValue(potentialDemand) }),
    ...(expectedDemand == null ? {} : { expected_robotaxi_demand: roundValue(expectedDemand) }),
  };
}

export function normalizeDemandProfiles({
  demandProfiles = [],
  placeDemandProfiles = [],
  serviceAreaDemandProfiles = [],
  zoneDemandProfiles = [],
  places = [],
  serviceAreas = [],
  zones = [],
} = {}) {
  const context = { places, serviceAreas, zones };
  const normalized = Array.isArray(demandProfiles) && demandProfiles.length
    ? demandProfiles.map((profile) => {
      const targetObjectType = normalizeTargetObjectType(profile.target_object_type || profile.source_object_type || profile.profile_type);
      const targetObjectId = profile.target_object_id || profile.source_object_id || profile.place_id || profile.service_area_id || profile.zone_id;
      return migrateLegacyProfile(profile, targetObjectType, targetObjectId, context);
    }).filter((profile) => profile.target_object_type && profile.target_object_id)
    : [
      ...placeDemandProfiles.map((profile) => migrateLegacyProfile(profile, TargetObjectType.PLACE, profile.place_id, context)),
      ...serviceAreaDemandProfiles.map((profile) => migrateLegacyProfile(profile, TargetObjectType.SERVICE_AREA, profile.service_area_id, context)),
      ...zoneDemandProfiles.map((profile) => migrateLegacyProfile(profile, TargetObjectType.ZONE, profile.zone_id, context)),
    ].filter((profile) => profile.target_object_id);
  const hasZoneProfiles = normalized.some((profile) => profile.target_object_type === TargetObjectType.ZONE);
  if (hasZoneProfiles) return normalized;
  return [
    ...normalized,
    ...calculateZoneDemandProfiles({ zones, places, serviceAreas, demandProfiles: normalized }),
  ];
}

export function splitDemandProfilesByTarget(demandProfiles = []) {
  return {
    placeDemandProfiles: demandProfiles
      .filter((profile) => profile.target_object_type === TargetObjectType.PLACE)
      .map((profile) => ({ ...profile, place_id: profile.target_object_id })),
    serviceAreaDemandProfiles: demandProfiles
      .filter((profile) => profile.target_object_type === TargetObjectType.SERVICE_AREA)
      .map((profile) => ({ ...profile, service_area_id: profile.target_object_id })),
    zoneDemandProfiles: demandProfiles
      .filter((profile) => profile.target_object_type === TargetObjectType.ZONE)
      .map((profile) => ({ ...profile, zone_id: profile.target_object_id })),
  };
}

export function initializeSpatialBusinessProfiles({ places = [], serviceAreas = [], zones = [] } = {}) {
  const baseDemandProfiles = [
    ...places.map(createPlaceDemandProfile),
    ...serviceAreas.map(createServiceAreaDemandProfile),
  ];
  const demandProfiles = normalizeDemandProfiles({
    demandProfiles: baseDemandProfiles,
    places,
    serviceAreas,
    zones,
  });
  return {
    demandProfiles,
    ...splitDemandProfilesByTarget(demandProfiles),
  };
}
