import { createRegisteredCalculationStep } from "../domain/calculationModelRegistry.js";

const TargetObjectType = {
  PLACE: "PLACE",
  SERVICE_AREA: "SERVICE_AREA",
  ZONE: "ZONE",
};

const DEFAULT_PEAK_DEMAND_RATIO = 0.15;
const LEGACY_PLACE_DEMAND_DEFAULTS = {
  robotaxi_adoption_rate: 0.18,
  service_acceptance_rate: 0.9,
  competition_retention_rate: 0.85,
};
const DEFAULT_PLACE_GROWTH_RATE_BY_TYPE = {
  RESIDENTIAL: 0.012,
  OFFICE: 0.009,
  COMMERCIAL: 0.014,
  HOSPITAL: 0.006,
  SCHOOL: 0.005,
  METRO_STATION: 0.016,
  OPS_CENTER: 0.004,
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

function usesLegacyPlaceDemandDefaults(profile = {}) {
  if (Number(profile.profile_version || 1) > 1) return false;
  return Object.entries(LEGACY_PLACE_DEMAND_DEFAULTS).every(([key, value]) => Number(profile[key]) === value);
}

function currentRealCalculationTime() {
  return new Date().toISOString();
}

function weightedAverage(items = [], field, weightField, fallback = 0) {
  const totalWeight = items.reduce((sum, item) => sum + Number(item?.[weightField] || 0), 0);
  if (totalWeight <= 0) return fallback;
  const total = items.reduce((sum, item) => sum + Number(item?.[field] || 0) * Number(item?.[weightField] || 0), 0);
  return total / totalWeight;
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

function createProfileFieldExplanations(targetObjectType) {
  if (targetObjectType === TargetObjectType.PLACE) {
    return {
      resident_population: { meaning: "地点覆盖范围内的常住人口，是地点潜在出行需求的输入项。", source: "人工配置或外部导入" },
      working_population: { meaning: "地点覆盖范围内的工作人口，是办公和通勤需求的输入项。", source: "人工配置或外部导入" },
      daily_visitors: { meaning: "地点日均访客量，是商业、医院、学校、交通枢纽等访客需求的输入项。", source: "人工配置或外部导入" },
      trip_generation_rate: { meaning: "人群在一个经营周期内产生出行需求的比例。", source: "人工配置或外部导入" },
      demand_weight: { meaning: "地点业务强度修正，用于表达同类地点之间的需求差异。", source: "Place 初始化权重或人工配置" },
      busiest_hour_share: { meaning: "一天中最繁忙小时订单占日订单的比例，用于计算峰值并发。", source: "人工配置或历史计算" },
      place_period_growth_rate: { meaning: "地点需求每个增长周期的变化比例。", source: "由增长率来源字段说明" },
      growth_rate_unit: { meaning: "增长率对应的时间单位，必须与预测周期单位一致。", source: "人工配置" },
      growth_rate_source: { meaning: "增长率的数据来源，只用于解释和质量追溯，不改变计算公式。", source: "人工配置" },
      daily_population_exposure: { meaning: "按居民、工作人口和访客权重得到的日有效人群。", calculation_logic: "常住人口×居民权重 + 工作人口×工作权重 + 日访客量×访客权重" },
      potential_daily_trips: { meaning: "地点每天可能产生的总出行量。", calculation_logic: "日有效人群 × 出行产生率 × 需求权重" },
      baseline_addressable_daily_orders: { meaning: "当前可被 Robotaxi 服务争取的日订单基线。", calculation_logic: "潜在日出行量 × Robotaxi采用率 × 服务接受率 × 竞争保留率" },
      baseline_peak_hour_orders: { meaning: "当前最繁忙小时订单基线。", calculation_logic: "当前可争取日订单 × 最繁忙小时占比" },
    };
  }
  if (targetObjectType === TargetObjectType.SERVICE_AREA) {
    return {
      pickup_position_capacity: { meaning: "服务区域可同时提供的上车位置数量。", source: "服务区域配置" },
      dropoff_position_capacity: { meaning: "服务区域可同时提供的下车位置数量。", source: "服务区域配置" },
      average_service_stop_duration_min: { meaning: "一辆 Robotaxi 完成一次上车或下车停靠平均占用的位置时间。", source: "人工配置" },
      operating_hours_per_day: { meaning: "服务区域每日可提供服务的小时数。", source: "人工配置" },
      accessibility_factor: { meaning: "道路可达、停靠限制等条件对服务区域理论承载的修正比例。", source: "人工配置" },
      capacity_availability_rate: { meaning: "扣除维护、拥堵等影响后可实际使用的容量比例。", source: "人工配置" },
      position_throughput_per_hour: { meaning: "单个上车位或下车位每小时可完成的停靠次数。", calculation_logic: "60 ÷ 平均站点停靠时长（分钟）" },
      effective_pickup_capacity_per_hour: { meaning: "服务区域每小时可完成的有效上车订单数。", calculation_logic: "上车位容量 × 单位置小时周转 × 可达性系数 × 容量可用率" },
      effective_dropoff_capacity_per_hour: { meaning: "服务区域每小时可完成的有效下车订单数。", calculation_logic: "下车位容量 × 单位置小时周转 × 可达性系数 × 容量可用率" },
      effective_daily_pickup_capacity: { meaning: "服务区域每日可完成的有效上车订单数。", calculation_logic: "有效上车承载 × 每日开放小时数" },
      effective_daily_dropoff_capacity: { meaning: "服务区域每日可完成的有效下车订单数。", calculation_logic: "有效下车承载 × 每日开放小时数" },
    };
  }
  if (targetObjectType === TargetObjectType.ZONE) {
    return {
      baseline_addressable_daily_orders: { meaning: "区域当前可争取日订单，是长期预测的需求基线。", calculation_logic: "Σ 区域内地点画像的当前可争取日订单" },
      baseline_peak_hour_orders: { meaning: "区域当前最繁忙小时订单。", calculation_logic: "Σ 区域内地点画像的当前峰值小时订单" },
      zone_period_growth_rate: { meaning: "区域增长率，不允许直接配置。", calculation_logic: "按地点当前可争取日订单加权汇总地点周期增长率" },
      effective_daily_pickup_capacity: { meaning: "区域所属服务区域有效日上车承载之和。", calculation_logic: "Σ ServiceArea 有效日上车承载" },
      effective_daily_dropoff_capacity: { meaning: "区域所属服务区域有效日下车承载之和。", calculation_logic: "Σ ServiceArea 有效日下车承载" },
      effective_daily_capacity: { meaning: "区域每日端到端服务承载能力。", calculation_logic: "min(区域有效日上车承载, 区域有效日下车承载)" },
      effective_peak_hour_capacity: { meaning: "区域峰值小时端到端服务承载能力。", calculation_logic: "min(区域有效上车承载, 区域有效下车承载)" },
      demand_distribution: { meaning: "区域需求来源结构。", calculation_logic: "按地点类型汇总当前可争取日订单后计算占比" },
      calculated_from_profile_ids: { meaning: "一级 Zone 画像的计算来源画像。", calculation_logic: "子区域内所有 Place 与 ServiceArea 画像编号集合" },
    };
  }
  return {};
}

function createPlaceDemandProfile(place, { calculatedAt = currentRealCalculationTime() } = {}) {
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
  const tripGenerationRate = place.place_type === "RESIDENTIAL" ? 0.6 : 0.9;
  const robotaxiAdoptionRate = 0.6;
  const serviceAcceptanceRate = 0.7;
  const competitionRetentionRate = 0.4;
  const residentTripWeight = 1;
  const workerTripWeight = 1;
  const visitorTripWeight = 1;
  const peakDemandRatio = Number(place.peak_demand_ratio ?? DEFAULT_PEAK_DEMAND_RATIO);
  const growthRate = Number(place.place_period_growth_rate ?? place.growth_rate ?? DEFAULT_PLACE_GROWTH_RATE_BY_TYPE[place.place_type] ?? 0.008);
  const dailyPopulationExposure = residentPopulation * residentTripWeight + workingPopulation * workerTripWeight + dailyVisitors * visitorTripWeight;
  const potentialDemand = dailyPopulationExposure * tripGenerationRate * demandWeight;
  const expectedDemand = potentialDemand * robotaxiAdoptionRate * serviceAcceptanceRate * competitionRetentionRate;
  const result = {
    ...createBaseDemandProfile({
      profileId: `DP-P-${place.place_id}`,
      profileName: `${place.place_name || place.place_id}需求画像`,
      targetObjectType: TargetObjectType.PLACE,
      targetObjectId: place.place_id,
      targetObjectName: place.place_name || place.place_id,
    }),
    profile_status: place.place_status === "Planned" ? "DRAFT" : "ACTIVE",
    resident_population: residentPopulation,
    working_population: workingPopulation,
    daily_visitors: dailyVisitors,
    resident_trip_weight: residentTripWeight,
    worker_trip_weight: workerTripWeight,
    visitor_trip_weight: visitorTripWeight,
    trip_generation_rate: tripGenerationRate,
    demand_weight: demandWeight,
    place_period_growth_rate: growthRate,
    growth_rate_unit: "MONTH",
    growth_rate_source: "MANUAL_ASSUMPTION",
    growth_rate_updated_at: calculatedAt,
    robotaxi_adoption_rate: robotaxiAdoptionRate,
    service_acceptance_rate: serviceAcceptanceRate,
    competition_retention_rate: competitionRetentionRate,
    busiest_hour_share: peakDemandRatio,
    daily_population_exposure: roundValue(dailyPopulationExposure),
    potential_daily_trips: roundValue(potentialDemand),
    baseline_addressable_daily_orders: roundValue(expectedDemand),
    baseline_peak_hour_orders: roundValue(expectedDemand * peakDemandRatio),
    profile_field_explanations: createProfileFieldExplanations(TargetObjectType.PLACE),
    calculated_at: calculatedAt,
  };
  result.profile_calculation_steps = createPlaceCalculationSteps(result);
  return result;
}

function createServiceAreaDemandProfile(serviceArea, { calculatedAt = currentRealCalculationTime() } = {}) {
  const capacity = Number(serviceArea.capacity || 0);
  const pickupPositions = Math.max(1, Number(serviceArea.pickup_position_capacity || capacity || 1));
  const dropoffPositions = Math.max(1, Number(serviceArea.dropoff_position_capacity || capacity || 1));
  const averageServiceStopDurationMin = Math.max(1, Number(serviceArea.average_service_stop_duration_min ?? serviceArea.average_service_time_min ?? 5));
  const accessibilityFactor = Number(serviceArea.accessibility_factor ?? 1);
  const capacityAvailabilityRate = Number(serviceArea.capacity_availability_rate ?? 0.9);
  const positionThroughput = 60 / averageServiceStopDurationMin;
  const effectivePickupCapacityPerHour = pickupPositions * positionThroughput * accessibilityFactor * capacityAvailabilityRate;
  const effectiveDropoffCapacityPerHour = dropoffPositions * positionThroughput * accessibilityFactor * capacityAvailabilityRate;
  const operatingHours = Number(serviceArea.operating_hours_per_day || 24);
  const effectiveDailyPickupCapacity = effectivePickupCapacityPerHour * operatingHours;
  const effectiveDailyDropoffCapacity = effectiveDropoffCapacityPerHour * operatingHours;
  const result = {
    ...createBaseDemandProfile({
      profileId: `DP-SA-${serviceArea.service_area_id}`,
      profileName: `${serviceArea.service_area_name || serviceArea.service_area_id}需求画像`,
      targetObjectType: TargetObjectType.SERVICE_AREA,
      targetObjectId: serviceArea.service_area_id,
      targetObjectName: serviceArea.service_area_name || serviceArea.service_area_id,
    }),
    profile_status: serviceArea.service_area_status === "PLANNED" ? "DRAFT" : "ACTIVE",
    parent_place_id: serviceArea.parent_place_id || serviceArea.place_ids?.[0] || null,
    pickup_position_capacity: pickupPositions,
    dropoff_position_capacity: dropoffPositions,
    average_service_stop_duration_min: averageServiceStopDurationMin,
    operating_hours_per_day: operatingHours,
    capacity_availability_rate: capacityAvailabilityRate,
    position_throughput_per_hour: roundValue(positionThroughput),
    effective_pickup_capacity_per_hour: roundValue(effectivePickupCapacityPerHour),
    effective_dropoff_capacity_per_hour: roundValue(effectiveDropoffCapacityPerHour),
    effective_daily_pickup_capacity: roundValue(effectiveDailyPickupCapacity),
    effective_daily_dropoff_capacity: roundValue(effectiveDailyDropoffCapacity),
    waiting_robotaxi_capacity: Number(serviceArea.waiting_capacity || serviceArea.parking_cell_ids?.length || 0),
    accessibility_factor: accessibilityFactor,
    profile_field_explanations: createProfileFieldExplanations(TargetObjectType.SERVICE_AREA),
    calculated_at: calculatedAt,
  };
  result.profile_calculation_steps = createServiceAreaCalculationSteps(result);
  return result;
}

function createServiceAreaCalculationSteps(result) {
  const step = (modelId, inputValues) => createRegisteredCalculationStep({ modelId, result, inputValues, sourceRefs: ["service_area_profile_snapshot"] });
  return [
    step("SERVICE_AREA_POSITION_THROUGHPUT", { average_service_stop_duration_min: result.average_service_stop_duration_min }),
    step("SERVICE_AREA_PICKUP_CAPACITY", {
      pickup_position_capacity: result.pickup_position_capacity,
      position_throughput_per_hour: result.position_throughput_per_hour,
      accessibility_factor: result.accessibility_factor,
      capacity_availability_rate: result.capacity_availability_rate,
    }),
    step("SERVICE_AREA_DROPOFF_CAPACITY", {
      dropoff_position_capacity: result.dropoff_position_capacity,
      position_throughput_per_hour: result.position_throughput_per_hour,
      accessibility_factor: result.accessibility_factor,
      capacity_availability_rate: result.capacity_availability_rate,
    }),
    step("SERVICE_AREA_DAILY_PICKUP_CAPACITY", {
      effective_pickup_capacity_per_hour: result.effective_pickup_capacity_per_hour,
      operating_hours_per_day: result.operating_hours_per_day,
    }),
    step("SERVICE_AREA_DAILY_DROPOFF_CAPACITY", {
      effective_dropoff_capacity_per_hour: result.effective_dropoff_capacity_per_hour,
      operating_hours_per_day: result.operating_hours_per_day,
    }),
  ].map((item, index) => ({ ...item, step_order: index + 1 }));
}

function calculatePlaceDemandProfiles({ places = [], demandProfiles = [], calculatedAt = null } = {}) {
  const placeProfileById = new Map(demandProfiles
    .filter((profile) => profile.target_object_type === TargetObjectType.PLACE)
    .map((profile) => [profile.target_object_id, profile]));
  return places.map((place) => {
    const baseProfile = createPlaceDemandProfile(place);
    const existingProfile = placeProfileById.get(place.place_id) || {};
    const migrateLegacyDefaults = usesLegacyPlaceDemandDefaults(existingProfile);
    const migrateLegacyTripGeneration = Number(existingProfile.profile_version || 1) <= 2
      && Number(existingProfile.trip_generation_rate) === 0.08;
    const nextCalculatedAt = calculatedAt || (migrateLegacyDefaults || migrateLegacyTripGeneration ? baseProfile.calculated_at : existingProfile.calculated_at) || baseProfile.calculated_at;
    const residentPopulation = Number(existingProfile.resident_population ?? baseProfile.resident_population);
    const workingPopulation = Number(existingProfile.working_population ?? baseProfile.working_population);
    const dailyVisitors = Number(existingProfile.daily_visitors ?? baseProfile.daily_visitors);
    const residentTripWeight = Number(existingProfile.resident_trip_weight ?? baseProfile.resident_trip_weight ?? 1);
    const workerTripWeight = Number(existingProfile.worker_trip_weight ?? baseProfile.worker_trip_weight ?? 1);
    const visitorTripWeight = Number(existingProfile.visitor_trip_weight ?? baseProfile.visitor_trip_weight ?? 1);
    const tripGenerationRate = Number(migrateLegacyTripGeneration ? baseProfile.trip_generation_rate : existingProfile.trip_generation_rate ?? baseProfile.trip_generation_rate);
    const demandWeight = Number(existingProfile.demand_weight ?? baseProfile.demand_weight);
    const robotaxiAdoptionRate = Number(migrateLegacyDefaults ? baseProfile.robotaxi_adoption_rate : existingProfile.robotaxi_adoption_rate ?? baseProfile.robotaxi_adoption_rate);
    const serviceAcceptanceRate = Number(migrateLegacyDefaults ? baseProfile.service_acceptance_rate : existingProfile.service_acceptance_rate ?? baseProfile.service_acceptance_rate);
    const competitionRetentionRate = Number(migrateLegacyDefaults ? baseProfile.competition_retention_rate : existingProfile.competition_retention_rate ?? baseProfile.competition_retention_rate ?? 0.4);
    const peakDemandRatio = Number(existingProfile.busiest_hour_share ?? existingProfile.peak_demand_ratio ?? baseProfile.busiest_hour_share);
    const growthRate = Number(existingProfile.place_period_growth_rate ?? existingProfile.growth_rate ?? baseProfile.place_period_growth_rate);
    const dailyPopulationExposure = residentPopulation * residentTripWeight + workingPopulation * workerTripWeight + dailyVisitors * visitorTripWeight;
    const potentialDemand = dailyPopulationExposure * tripGenerationRate * demandWeight;
    const expectedDemand = potentialDemand * robotaxiAdoptionRate * serviceAcceptanceRate * competitionRetentionRate;
    const result = {
      ...baseProfile,
      profile_id: existingProfile.profile_id || baseProfile.profile_id,
      profile_name: existingProfile.profile_name || baseProfile.profile_name,
      profile_version: migrateLegacyDefaults || migrateLegacyTripGeneration ? 3 : Number(existingProfile.profile_version || baseProfile.profile_version),
      profile_status: existingProfile.profile_status || baseProfile.profile_status,
      effective_from: existingProfile.effective_from || baseProfile.effective_from,
      effective_to: existingProfile.effective_to ?? baseProfile.effective_to,
      resident_population: residentPopulation,
      working_population: workingPopulation,
      daily_visitors: dailyVisitors,
      resident_trip_weight: residentTripWeight,
      worker_trip_weight: workerTripWeight,
      visitor_trip_weight: visitorTripWeight,
      trip_generation_rate: tripGenerationRate,
      demand_weight: demandWeight,
      place_period_growth_rate: roundValue(existingProfile.place_period_growth_rate ?? growthRate, 6),
      growth_rate_unit: existingProfile.growth_rate_unit || "MONTH",
      growth_rate_source: existingProfile.growth_rate_source || "MANUAL_ASSUMPTION",
      growth_rate_updated_at: existingProfile.growth_rate_updated_at || nextCalculatedAt,
      robotaxi_adoption_rate: robotaxiAdoptionRate,
      service_acceptance_rate: serviceAcceptanceRate,
      competition_retention_rate: competitionRetentionRate,
      busiest_hour_share: peakDemandRatio,
      daily_population_exposure: roundValue(dailyPopulationExposure),
      potential_daily_trips: roundValue(potentialDemand),
      baseline_addressable_daily_orders: roundValue(expectedDemand),
      baseline_peak_hour_orders: roundValue(expectedDemand * peakDemandRatio),
      profile_field_explanations: createProfileFieldExplanations(TargetObjectType.PLACE),
      calculated_at: nextCalculatedAt,
    };
    result.profile_calculation_steps = createPlaceCalculationSteps(result);
    return result;
  });
}

function createPlaceCalculationSteps(result) {
  const step = (modelId, inputValues) => createRegisteredCalculationStep({ modelId, result, inputValues, sourceRefs: ["place_profile_snapshot"] });
  return [
    step("PLACE_POPULATION_EXPOSURE", {
      resident_population: result.resident_population,
      resident_trip_weight: result.resident_trip_weight,
      working_population: result.working_population,
      worker_trip_weight: result.worker_trip_weight,
      daily_visitors: result.daily_visitors,
      visitor_trip_weight: result.visitor_trip_weight,
    }),
    step("PLACE_POTENTIAL_TRIPS", {
      daily_population_exposure: result.daily_population_exposure,
      trip_generation_rate: result.trip_generation_rate,
      demand_weight: result.demand_weight,
    }),
    step("PLACE_ADDRESSABLE_ORDERS", {
      potential_daily_trips: result.potential_daily_trips,
      robotaxi_adoption_rate: result.robotaxi_adoption_rate,
      service_acceptance_rate: result.service_acceptance_rate,
      competition_retention_rate: result.competition_retention_rate,
    }),
    step("PLACE_PEAK_ORDERS", {
      baseline_addressable_daily_orders: result.baseline_addressable_daily_orders,
      busiest_hour_share: result.busiest_hour_share,
    }),
  ].map((item, index) => ({ ...item, step_order: index + 1 }));
}

function topLevelZones(zones = []) {
  return zones.filter((zone) => !zone.parent_zone_id);
}

function zoneComponentIds(zone, zones = []) {
  const children = (zone.sub_zone_ids || [])
    .map((subZoneId) => zones.find((item) => item.zone_id === subZoneId))
    .filter(Boolean);
  const sourceZones = children.length ? children : [zone];
  return {
    placeIds: [...new Set(sourceZones.flatMap((item) => item.place_ids || []))],
    serviceAreaIds: [...new Set(sourceZones.flatMap((item) => item.service_area_ids || []))],
    subZoneIds: children.map((item) => item.zone_id),
  };
}

function calculateServiceAreaDemandProfiles({ serviceAreas = [], places = [], demandProfiles = [], calculatedAt = null }) {
  const serviceAreaProfileById = new Map(demandProfiles
    .filter((profile) => profile.target_object_type === TargetObjectType.SERVICE_AREA)
    .map((profile) => [profile.target_object_id, profile]));
  return serviceAreas.map((serviceArea) => {
    const baseProfile = createServiceAreaDemandProfile(serviceArea);
    const existingProfile = {
      ...baseProfile,
      ...(serviceAreaProfileById.get(serviceArea.service_area_id) || {}),
    };
    const nextCalculatedAt = calculatedAt || existingProfile.calculated_at || baseProfile.calculated_at;
    const parentPlaceId = existingProfile.parent_place_id || serviceArea.parent_place_id || serviceArea.place_ids?.[0] || places.find((place) => (place.nearby_service_area_ids || []).includes(serviceArea.service_area_id))?.place_id || null;
    const pickupProbability = 0;
    const accessibilityFactor = Number(existingProfile.accessibility_factor ?? 1);
    const pickupPositions = Math.max(1, Number(existingProfile.pickup_position_capacity ?? baseProfile.pickup_position_capacity ?? 1));
    const dropoffPositions = Math.max(1, Number(existingProfile.dropoff_position_capacity ?? baseProfile.dropoff_position_capacity ?? 1));
    const averageServiceStopDurationMin = Math.max(1, Number(existingProfile.average_service_stop_duration_min ?? existingProfile.average_service_time_min ?? baseProfile.average_service_stop_duration_min ?? 5));
    const operatingHours = Math.max(1, Number(existingProfile.operating_hours_per_day ?? baseProfile.operating_hours_per_day ?? 24));
    const capacityAvailabilityRate = Number(existingProfile.capacity_availability_rate ?? baseProfile.capacity_availability_rate ?? 0.9);
    const positionThroughput = 60 / averageServiceStopDurationMin;
    const effectivePickupCapacityPerHour = pickupPositions * positionThroughput * accessibilityFactor * capacityAvailabilityRate;
    const effectiveDropoffCapacityPerHour = dropoffPositions * positionThroughput * accessibilityFactor * capacityAvailabilityRate;
    const result = {
      ...existingProfile,
      profile_id: existingProfile.profile_id || baseProfile.profile_id,
      profile_name: existingProfile.profile_name || baseProfile.profile_name,
      profile_version: Number(existingProfile.profile_version || baseProfile.profile_version),
      profile_status: existingProfile.profile_status || baseProfile.profile_status,
      effective_from: existingProfile.effective_from || baseProfile.effective_from,
      effective_to: existingProfile.effective_to ?? baseProfile.effective_to,
      target_object_type: TargetObjectType.SERVICE_AREA,
      target_object_id: serviceArea.service_area_id,
      target_object_name: baseProfile.target_object_name,
      parent_place_id: parentPlaceId,
      pickup_position_capacity: pickupPositions,
      dropoff_position_capacity: dropoffPositions,
      average_service_stop_duration_min: averageServiceStopDurationMin,
      operating_hours_per_day: operatingHours,
      capacity_availability_rate: capacityAvailabilityRate,
      position_throughput_per_hour: roundValue(positionThroughput),
      effective_pickup_capacity_per_hour: roundValue(effectivePickupCapacityPerHour),
      effective_dropoff_capacity_per_hour: roundValue(effectiveDropoffCapacityPerHour),
      effective_daily_pickup_capacity: roundValue(effectivePickupCapacityPerHour * operatingHours),
      effective_daily_dropoff_capacity: roundValue(effectiveDropoffCapacityPerHour * operatingHours),
      waiting_robotaxi_capacity: Number(existingProfile.waiting_robotaxi_capacity ?? existingProfile.waiting_capacity ?? baseProfile.waiting_robotaxi_capacity),
      accessibility_factor: accessibilityFactor,
      profile_field_explanations: createProfileFieldExplanations(TargetObjectType.SERVICE_AREA),
      calculated_from_profile_ids: [],
      calculated_at: nextCalculatedAt,
    };
    delete result.average_service_time_min;
    delete result.service_capacity_per_hour;
    delete result.effective_peak_hour_capacity;
    delete result.effective_daily_capacity;
    result.profile_calculation_steps = createServiceAreaCalculationSteps(result);
    return result;
  });
}

function demandDistributionByPlaceType(placeProfiles = [], places = []) {
  const placeById = new Map(places.map((place) => [place.place_id, place]));
  const demandByType = {};
  placeProfiles.forEach((profile) => {
    const type = placeById.get(profile.target_object_id)?.place_type || "UNKNOWN";
    demandByType[type] = (demandByType[type] || 0) + Number(profile.baseline_addressable_daily_orders || 0);
  });
  const total = Object.values(demandByType).reduce((sum, value) => sum + Number(value || 0), 0);
  if (total <= 0) return {};
  return Object.fromEntries(Object.entries(demandByType).map(([type, value]) => [type, roundValue(Number(value || 0) / total, 4)]));
}

function createZoneCalculationSteps({ placeProfiles, serviceAreaProfiles, result }) {
  const placeSourceRefs = placeProfiles.map((profile) => profile.profile_id);
  const steps = [
    createRegisteredCalculationStep({ modelId: "ZONE_BASELINE_DEMAND", result, inputValues: {
      calculated_from_profile_ids: placeSourceRefs,
    }, sourceRefs: placeSourceRefs }),
    createRegisteredCalculationStep({ modelId: "ZONE_PEAK_DEMAND", result, inputValues: {
      calculated_from_profile_ids: placeSourceRefs,
    }, sourceRefs: placeSourceRefs }),
    createRegisteredCalculationStep({ modelId: "ZONE_PERIOD_GROWTH_RATE", result, inputValues: {
      calculated_from_profile_ids: placeSourceRefs,
    }, sourceRefs: placeSourceRefs }),
  ];
  const sourceRefs = serviceAreaProfiles.map((profile) => profile.profile_id);
  steps.push(createRegisteredCalculationStep({ modelId: "ZONE_DAILY_SERVICE_CAPACITY", result, inputValues: {
    effective_daily_pickup_capacity: result.effective_daily_pickup_capacity,
    effective_daily_dropoff_capacity: result.effective_daily_dropoff_capacity,
  }, sourceRefs }));
  steps.push(createRegisteredCalculationStep({ modelId: "ZONE_PEAK_SERVICE_CAPACITY", result, inputValues: {
    effective_pickup_capacity_per_hour: result.effective_pickup_capacity_per_hour,
    effective_dropoff_capacity_per_hour: result.effective_dropoff_capacity_per_hour,
  }, sourceRefs }));
  return steps.map((item, index) => ({ ...item, step_order: index + 1 }));
}

export function calculateZoneDemandProfiles({ zones = [], places = [], serviceAreas = [], demandProfiles = [], calculatedAt = null }) {
  const placeProfileById = new Map(demandProfiles
    .filter((profile) => profile.target_object_type === TargetObjectType.PLACE)
    .map((profile) => [profile.target_object_id, profile]));
  const serviceAreaProfileById = new Map(demandProfiles
    .filter((profile) => profile.target_object_type === TargetObjectType.SERVICE_AREA)
    .map((profile) => [profile.target_object_id, profile]));
  return topLevelZones(zones).map((zone) => {
    const existingZoneProfile = demandProfiles.find((profile) => (
      profile.target_object_type === TargetObjectType.ZONE && profile.target_object_id === zone.zone_id
    )) || {};
    const nextCalculatedAt = calculatedAt || existingZoneProfile.calculated_at || currentRealCalculationTime();
    const components = zoneComponentIds(zone, zones);
    const zonePlaceProfiles = components.placeIds
      .map((placeId) => placeProfileById.get(placeId))
      .filter(Boolean);
    const zoneServiceAreaProfiles = components.serviceAreaIds
      .map((serviceAreaId) => serviceAreaProfileById.get(serviceAreaId))
      .filter(Boolean);
    const potentialDemand = zonePlaceProfiles.reduce((sum, profile) => sum + Number(profile.potential_daily_trips || 0), 0);
    const baselineAddressableOrders = zonePlaceProfiles.reduce((sum, profile) => sum + Number(profile.baseline_addressable_daily_orders || 0), 0);
    const baselinePeakHourOrders = zonePlaceProfiles.reduce((sum, profile) => sum + Number(profile.baseline_peak_hour_orders || 0), 0);
    const effectiveDailyPickupCapacity = zoneServiceAreaProfiles.reduce((sum, profile) => sum + Number(profile.effective_daily_pickup_capacity || 0), 0);
    const effectiveDailyDropoffCapacity = zoneServiceAreaProfiles.reduce((sum, profile) => sum + Number(profile.effective_daily_dropoff_capacity || 0), 0);
    const effectivePickupCapacityPerHour = zoneServiceAreaProfiles.reduce((sum, profile) => sum + Number(profile.effective_pickup_capacity_per_hour || 0), 0);
    const effectiveDropoffCapacityPerHour = zoneServiceAreaProfiles.reduce((sum, profile) => sum + Number(profile.effective_dropoff_capacity_per_hour || 0), 0);
    const effectiveDailyCapacity = Math.min(effectiveDailyPickupCapacity, effectiveDailyDropoffCapacity);
    const effectivePeakHourCapacity = Math.min(effectivePickupCapacityPerHour, effectiveDropoffCapacityPerHour);
    const waitingRobotaxiCapacity = zoneServiceAreaProfiles.reduce((sum, profile) => sum + Number(profile.waiting_robotaxi_capacity ?? profile.waiting_capacity ?? 0), 0);
    const growthRate = weightedAverage(zonePlaceProfiles, "place_period_growth_rate", "baseline_addressable_daily_orders", 0);
    const peakDemandRatio = baselineAddressableOrders > 0 ? baselinePeakHourOrders / baselineAddressableOrders : DEFAULT_PEAK_DEMAND_RATIO;
    const demandDistribution = demandDistributionByPlaceType(zonePlaceProfiles, places);
    const targetName = profileTargetName({
      targetObjectType: TargetObjectType.ZONE,
      targetObjectId: zone.zone_id,
      places,
      serviceAreas,
      zones,
    });
    const result = {
      ...createBaseDemandProfile({
        profileId: `DP-Z-${zone.zone_id}`,
        profileName: `${targetName}需求画像`,
        targetObjectType: TargetObjectType.ZONE,
        targetObjectId: zone.zone_id,
        targetObjectName: targetName,
      }),
      profile_name: existingZoneProfile.profile_name || `${targetName}需求画像`,
      profile_version: Number(existingZoneProfile.profile_version || 1),
      profile_status: existingZoneProfile.profile_status || (zone.zone_status === "Planned" ? "DRAFT" : "ACTIVE"),
      zone_period_growth_rate: growthRate,
      growth_rate_unit: zonePlaceProfiles[0]?.growth_rate_unit || "MONTH",
      effective_daily_capacity: roundValue(effectiveDailyCapacity),
      effective_peak_hour_capacity: roundValue(effectivePeakHourCapacity),
      effective_daily_pickup_capacity: roundValue(effectiveDailyPickupCapacity),
      effective_daily_dropoff_capacity: roundValue(effectiveDailyDropoffCapacity),
      effective_pickup_capacity_per_hour: roundValue(effectivePickupCapacityPerHour),
      effective_dropoff_capacity_per_hour: roundValue(effectiveDropoffCapacityPerHour),
      waiting_robotaxi_capacity: roundValue(waitingRobotaxiCapacity),
      potential_daily_trips: roundValue(potentialDemand),
      baseline_addressable_daily_orders: roundValue(baselineAddressableOrders),
      baseline_peak_hour_orders: roundValue(baselinePeakHourOrders),
      busiest_hour_share: roundValue(peakDemandRatio, 4),
      demand_distribution: demandDistribution,
      calculated_from_profile_ids: [
        ...zonePlaceProfiles.map((profile) => profile.profile_id),
        ...zoneServiceAreaProfiles.map((profile) => profile.profile_id),
      ],
      profile_field_explanations: createProfileFieldExplanations(TargetObjectType.ZONE),
      calculated_at: nextCalculatedAt,
    };
    result.profile_calculation_steps = createZoneCalculationSteps({ placeProfiles: zonePlaceProfiles, serviceAreaProfiles: zoneServiceAreaProfiles, result });
    return result;
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
  const potentialDemand = profile.potential_daily_trips ?? profile.potential_demand ?? (
    targetObjectType === TargetObjectType.PLACE
      ? (Number(profile.resident_population || 0) + Number(profile.working_population || 0) + Number(profile.daily_visitors || 0))
        * Number(profile.trip_generation_rate || 0)
        * Number(profile.demand_weight || 1)
      : undefined
  );
  const expectedDemand = profile.baseline_addressable_daily_orders ?? profile.expected_robotaxi_demand ?? (
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
    ...(potentialDemand == null ? {} : { potential_daily_trips: roundValue(potentialDemand) }),
    ...(expectedDemand == null ? {} : { baseline_addressable_daily_orders: roundValue(expectedDemand) }),
    ...(targetObjectType === TargetObjectType.PLACE ? {
      busiest_hour_share: Number(profile.busiest_hour_share ?? profile.peak_demand_ratio ?? DEFAULT_PEAK_DEMAND_RATIO),
      place_period_growth_rate: Number(profile.place_period_growth_rate ?? profile.growth_rate ?? 0),
      growth_rate_unit: profile.growth_rate_unit || "MONTH",
      growth_rate_source: profile.growth_rate_source || "MANUAL_ASSUMPTION",
      baseline_peak_hour_orders: Number(profile.baseline_peak_hour_orders ?? profile.peak_hour_demand ?? Number(expectedDemand || 0) * Number(profile.busiest_hour_share ?? profile.peak_demand_ratio ?? DEFAULT_PEAK_DEMAND_RATIO)),
      profile_calculation_steps: profile.profile_calculation_steps || createPlaceCalculationSteps({
        residentPopulation: Number(profile.resident_population || 0),
        workingPopulation: Number(profile.working_population || 0),
        dailyVisitors: Number(profile.daily_visitors || 0),
        tripGenerationRate: Number(profile.trip_generation_rate || 0),
        demandWeight: Number(profile.demand_weight || 1),
        potentialDemand: Number(potentialDemand || 0),
        robotaxiAdoptionRate: Number(profile.robotaxi_adoption_rate || 0),
        serviceAcceptanceRate: Number(profile.service_acceptance_rate || 1),
        competitionRetentionRate: Number(profile.competition_retention_rate || 1),
        expectedDemand: Number(expectedDemand || 0),
        peakDemandRatio: Number(profile.busiest_hour_share ?? profile.peak_demand_ratio ?? DEFAULT_PEAK_DEMAND_RATIO),
      }),
    } : {}),
    profile_field_explanations: profile.profile_field_explanations || createProfileFieldExplanations(targetObjectType),
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
  return recalculateDemandProfiles({ demandProfiles: normalized, places, serviceAreas, zones });
}

export function recalculateDemandProfiles({ demandProfiles = [], places = [], serviceAreas = [], zones = [], calculatedAt = null } = {}) {
  const placeProfiles = calculatePlaceDemandProfiles({ places, demandProfiles, calculatedAt });
  const serviceAreaProfiles = calculateServiceAreaDemandProfiles({
    serviceAreas,
    places,
    zones,
    calculatedAt,
    demandProfiles: [
      ...placeProfiles,
      ...demandProfiles.filter((profile) => profile.target_object_type === TargetObjectType.SERVICE_AREA),
    ],
  });
  const zoneProfiles = calculateZoneDemandProfiles({
    zones,
    places,
    serviceAreas,
    calculatedAt,
    demandProfiles: [...placeProfiles, ...serviceAreaProfiles, ...demandProfiles.filter((profile) => profile.target_object_type === TargetObjectType.ZONE)],
  });
  return [...placeProfiles, ...serviceAreaProfiles, ...zoneProfiles].map(stripLegacyDemandProfileFields);
}

function stripLegacyDemandProfileFields(profile = {}) {
  const legacyFields = new Set([
    "profile_type", "source_object_id", "source_object_name", "source_object_type",
    "growth_rate", "forecast_years", "growth_factor", "peak_pattern", "peak_demand_ratio",
    "potential_demand", "expected_robotaxi_demand", "peak_hour_demand", "service_area_demand",
    "pickup_probability", "dropoff_probability", "zone_adjustment_factor", "coverage_factor",
    "competition_factor", "demand_growth_factor", "peak_demand_factor", "coverage_gap_factor",
    "supply_need_score", "service_capacity", "waiting_capacity", "turnover_capacity",
  ]);
  return Object.fromEntries(Object.entries(profile).filter(([key]) => !legacyFields.has(key)));
}

export function updateDemandProfileConfig({ demandProfiles = [], profileId, patch = {}, places = [], serviceAreas = [], zones = [], calculatedAt = currentRealCalculationTime() } = {}) {
  const normalized = normalizeDemandProfiles({
    demandProfiles,
    places,
    serviceAreas,
    zones,
  });
  const updatedProfiles = normalized.map((profile) => {
    if (profile.profile_id !== profileId) return profile;
    const merged = {
      ...profile,
      ...patch,
      profile_version: Number(profile.profile_version || 1) + 1,
      calculated_at: calculatedAt,
    };
    if (merged.target_object_type === TargetObjectType.PLACE) {
      const peakDemandRatio = Number(merged.busiest_hour_share ?? DEFAULT_PEAK_DEMAND_RATIO);
      const dailyPopulationExposure = Number(merged.resident_population || 0) * Number(merged.resident_trip_weight || 1)
        + Number(merged.working_population || 0) * Number(merged.worker_trip_weight || 1)
        + Number(merged.daily_visitors || 0) * Number(merged.visitor_trip_weight || 1);
      const potentialDemand = dailyPopulationExposure * Number(merged.trip_generation_rate || 0) * Number(merged.demand_weight || 1);
      const expectedDemand = potentialDemand
        * Number(merged.robotaxi_adoption_rate || 0)
        * Number(merged.service_acceptance_rate || 1)
        * Number(merged.competition_retention_rate || 1);
      return {
        ...merged,
        busiest_hour_share: peakDemandRatio,
        daily_population_exposure: roundValue(dailyPopulationExposure),
        potential_daily_trips: roundValue(potentialDemand),
        baseline_addressable_daily_orders: roundValue(expectedDemand),
        baseline_peak_hour_orders: roundValue(expectedDemand * peakDemandRatio),
        profile_calculation_steps: createPlaceCalculationSteps({
          residentPopulation: Number(merged.resident_population || 0),
          workingPopulation: Number(merged.working_population || 0),
          dailyVisitors: Number(merged.daily_visitors || 0),
          tripGenerationRate: Number(merged.trip_generation_rate || 0),
          demandWeight: Number(merged.demand_weight || 1),
          potentialDemand,
          robotaxiAdoptionRate: Number(merged.robotaxi_adoption_rate || 0),
          serviceAcceptanceRate: Number(merged.service_acceptance_rate || 1),
          competitionRetentionRate: Number(merged.competition_retention_rate || 1),
          expectedDemand,
          peakDemandRatio,
        }),
      };
    }
    return merged;
  });
  return recalculateDemandProfiles({
    demandProfiles: updatedProfiles,
    places,
    serviceAreas,
    zones,
    calculatedAt,
  });
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
  const calculatedAt = currentRealCalculationTime();
  const baseDemandProfiles = [
    ...places.map((place) => createPlaceDemandProfile(place, { calculatedAt })),
    ...serviceAreas.map((serviceArea) => createServiceAreaDemandProfile(serviceArea, { calculatedAt })),
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
