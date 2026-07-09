const TargetObjectType = {
  PLACE: "PLACE",
  SERVICE_AREA: "SERVICE_AREA",
  ZONE: "ZONE",
};

const DEFAULT_PEAK_DEMAND_RATIO = 0.15;
const DEFAULT_FORECAST_YEARS = 1;

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

function calculateGrowthFactor(growthRate = 0, forecastYears = DEFAULT_FORECAST_YEARS) {
  return roundValue(Math.pow(1 + Number(growthRate || 0), Number(forecastYears || DEFAULT_FORECAST_YEARS)), 4);
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
      peak_demand_ratio: { meaning: "高峰需求比例，用于把日需求转换为高峰窗口需求。", source: "人工配置或初始化默认值" },
      growth_rate: { meaning: "需求增长率，用于长期需求预测周期的增长修正。", source: "人工配置或外部预测输入" },
      forecast_years: { meaning: "预测年数，用于将增长率转换为增长修正因子。", source: "人工配置或长期需求预测策略" },
      potential_demand: { meaning: "地点潜在需求。", calculation_logic: "(常住人口 + 工作人口 + 日访客量) × 出行产生率 × 需求权重" },
      expected_robotaxi_demand: { meaning: "地点预计可转化为 Robotaxi 的需求。", calculation_logic: "潜在需求 × Robotaxi 采用率 × 服务接受率" },
      peak_hour_demand: { meaning: "地点高峰小时需求估计。", calculation_logic: "预计 Robotaxi 需求 × 高峰需求比例" },
      growth_factor: { meaning: "地点需求增长修正因子。", calculation_logic: "(1 + 增长率) ^ 预测年数" },
    };
  }
  if (targetObjectType === TargetObjectType.SERVICE_AREA) {
    return {
      pickup_probability: { meaning: "服务区域成为上车点的概率，用于解释需求在服务区域的分布。", source: "人工配置或初始化默认值" },
      dropoff_probability: { meaning: "服务区域成为下车点的概率，用于解释需求在服务区域的分布。", source: "人工配置或初始化默认值" },
      peak_demand_ratio: { meaning: "服务区域在高峰期承接需求的放大比例。", source: "人工配置或初始化默认值" },
      service_capacity: { meaning: "服务区域可承载的服务能力。", source: "ServiceArea.capacity 或人工配置" },
      waiting_capacity: { meaning: "服务区域可等待容量。", source: "ServiceArea.waiting_capacity 或停车网格数量" },
      turnover_capacity: { meaning: "服务区域单位周期周转能力。", calculation_logic: "当前初始化按 服务容量 × 4 估算，可后续配置" },
      accessibility_factor: { meaning: "服务区域道路可达性修正。", source: "人工配置或初始化默认值" },
      service_area_demand: { meaning: "服务区域承接的 Robotaxi 服务需求。", calculation_logic: "Σ 关联 Place expected_robotaxi_demand × 上车概率 × 可达性系数" },
    };
  }
  if (targetObjectType === TargetObjectType.ZONE) {
    return {
      potential_demand: { meaning: "一级 Zone 的潜在需求，用于长期需求预测。", calculation_logic: "Σ 子区域内 Place DemandProfile.potential_demand" },
      expected_robotaxi_demand: { meaning: "一级 Zone 的预计 Robotaxi 需求，是长期需求预测和供应计划的核心输入。", calculation_logic: "Σ 子区域内 ServiceArea DemandProfile.service_area_demand × 区域调整系数 × 服务覆盖系数 × 竞争影响系数" },
      peak_hour_demand: { meaning: "一级 Zone 的峰值需求。", calculation_logic: "预计 Robotaxi 需求 × 高峰需求比例" },
      service_capacity: { meaning: "一级 Zone 包含服务区域的服务承载能力。", calculation_logic: "Σ 子区域内 ServiceArea DemandProfile.service_capacity" },
      waiting_capacity: { meaning: "一级 Zone 包含服务区域的等待能力。", calculation_logic: "Σ 子区域内 ServiceArea DemandProfile.waiting_capacity" },
      turnover_capacity: { meaning: "一级 Zone 包含服务区域的周转能力。", calculation_logic: "Σ 子区域内 ServiceArea DemandProfile.turnover_capacity" },
      demand_growth_factor: { meaning: "需求增长因子，用于长期预测期放大当前需求。", calculation_logic: "(1 + 增长率) ^ 预测年数" },
      peak_demand_factor: { meaning: "高峰需求因子，用于表达高峰窗口需求压力。", calculation_logic: "高峰需求 / 预计 Robotaxi 需求" },
      coverage_gap_factor: { meaning: "覆盖缺口因子，用于表达服务能力与需求之间的缺口。", calculation_logic: "max(0, 预计 Robotaxi 需求 - 服务容量) / 预计 Robotaxi 需求" },
      supply_need_score: { meaning: "供给需求评分，用于判断供给紧迫程度。", calculation_logic: "需求增长因子 × 高峰需求因子 × 覆盖缺口因子 × 100" },
      demand_distribution: { meaning: "一级 Zone 的需求来源结构。", calculation_logic: "按 Place 类型汇总 expected_robotaxi_demand 后除以 Zone Place 总需求" },
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
  const tripGenerationRate = Number((0.08 * demandWeight).toFixed(3));
  const robotaxiAdoptionRate = 0.18;
  const serviceAcceptanceRate = 0.9;
  const peakDemandRatio = Number(place.peak_demand_ratio ?? DEFAULT_PEAK_DEMAND_RATIO);
  const growthRate = Number(place.growth_rate || 0);
  const forecastYears = Number(place.forecast_years || DEFAULT_FORECAST_YEARS);
  const growthFactor = calculateGrowthFactor(growthRate, forecastYears);
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
    peak_demand_ratio: peakDemandRatio,
    growth_rate: growthRate,
    forecast_years: forecastYears,
    robotaxi_adoption_rate: robotaxiAdoptionRate,
    service_acceptance_rate: serviceAcceptanceRate,
    growth_factor: growthFactor,
    potential_demand: roundValue(potentialDemand),
    expected_robotaxi_demand: roundValue(expectedDemand),
    peak_hour_demand: roundValue(expectedDemand * peakDemandRatio),
    profile_field_explanations: createProfileFieldExplanations(TargetObjectType.PLACE),
    profile_calculation_steps: createPlaceCalculationSteps({
      residentPopulation,
      workingPopulation,
      dailyVisitors,
      tripGenerationRate,
      demandWeight,
      potentialDemand,
      robotaxiAdoptionRate,
      serviceAcceptanceRate,
      expectedDemand,
      peakDemandRatio,
      growthRate,
      forecastYears,
      growthFactor,
    }),
    calculated_at: calculatedAt,
  };
}

function createServiceAreaDemandProfile(serviceArea, { calculatedAt = currentRealCalculationTime() } = {}) {
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
    peak_demand_ratio: DEFAULT_PEAK_DEMAND_RATIO,
    service_capacity: capacity,
    waiting_capacity: Number(serviceArea.waiting_capacity || serviceArea.parking_cell_ids?.length || 0),
    turnover_capacity: Math.max(1, capacity * 4),
    accessibility_factor: 1,
    service_area_demand: 0,
    profile_field_explanations: createProfileFieldExplanations(TargetObjectType.SERVICE_AREA),
    profile_calculation_steps: [],
    calculated_at: calculatedAt,
  };
}

function calculatePlaceDemandProfiles({ places = [], demandProfiles = [], calculatedAt = null } = {}) {
  const placeProfileById = new Map(demandProfiles
    .filter((profile) => profile.target_object_type === TargetObjectType.PLACE)
    .map((profile) => [profile.target_object_id, profile]));
  return places.map((place) => {
    const baseProfile = createPlaceDemandProfile(place);
    const existingProfile = placeProfileById.get(place.place_id) || {};
    const nextCalculatedAt = calculatedAt || existingProfile.calculated_at || baseProfile.calculated_at;
    const residentPopulation = Number(existingProfile.resident_population ?? baseProfile.resident_population);
    const workingPopulation = Number(existingProfile.working_population ?? baseProfile.working_population);
    const dailyVisitors = Number(existingProfile.daily_visitors ?? baseProfile.daily_visitors);
    const tripGenerationRate = Number(existingProfile.trip_generation_rate ?? baseProfile.trip_generation_rate);
    const demandWeight = Number(existingProfile.demand_weight ?? baseProfile.demand_weight);
    const robotaxiAdoptionRate = Number(existingProfile.robotaxi_adoption_rate ?? baseProfile.robotaxi_adoption_rate);
    const serviceAcceptanceRate = Number(existingProfile.service_acceptance_rate ?? baseProfile.service_acceptance_rate);
    const peakDemandRatio = Number(existingProfile.peak_demand_ratio ?? baseProfile.peak_demand_ratio);
    const growthRate = Number(existingProfile.growth_rate ?? baseProfile.growth_rate);
    const forecastYears = Number(existingProfile.forecast_years || baseProfile.forecast_years || DEFAULT_FORECAST_YEARS);
    const growthFactor = calculateGrowthFactor(growthRate, forecastYears);
    const potentialDemand = (residentPopulation + workingPopulation + dailyVisitors) * tripGenerationRate * demandWeight;
    const expectedDemand = potentialDemand * robotaxiAdoptionRate * serviceAcceptanceRate;
    return {
      ...baseProfile,
      profile_id: existingProfile.profile_id || baseProfile.profile_id,
      profile_name: existingProfile.profile_name || baseProfile.profile_name,
      profile_version: Number(existingProfile.profile_version || baseProfile.profile_version),
      profile_status: existingProfile.profile_status || baseProfile.profile_status,
      effective_from: existingProfile.effective_from || baseProfile.effective_from,
      effective_to: existingProfile.effective_to ?? baseProfile.effective_to,
      resident_population: residentPopulation,
      working_population: workingPopulation,
      daily_visitors: dailyVisitors,
      trip_generation_rate: tripGenerationRate,
      demand_weight: demandWeight,
      peak_pattern: existingProfile.peak_pattern || baseProfile.peak_pattern,
      peak_demand_ratio: peakDemandRatio,
      growth_rate: growthRate,
      forecast_years: forecastYears,
      robotaxi_adoption_rate: robotaxiAdoptionRate,
      service_acceptance_rate: serviceAcceptanceRate,
      growth_factor: growthFactor,
      potential_demand: roundValue(potentialDemand),
      expected_robotaxi_demand: roundValue(expectedDemand),
      peak_hour_demand: roundValue(expectedDemand * peakDemandRatio),
      profile_field_explanations: createProfileFieldExplanations(TargetObjectType.PLACE),
      profile_calculation_steps: createPlaceCalculationSteps({
        residentPopulation,
        workingPopulation,
        dailyVisitors,
        tripGenerationRate,
        demandWeight,
        potentialDemand,
        robotaxiAdoptionRate,
        serviceAcceptanceRate,
        expectedDemand,
        peakDemandRatio,
        growthRate,
        forecastYears,
        growthFactor,
      }),
      calculated_at: nextCalculatedAt,
    };
  });
}

function createPlaceCalculationSteps({
  residentPopulation,
  workingPopulation,
  dailyVisitors,
  tripGenerationRate,
  demandWeight,
  potentialDemand,
  robotaxiAdoptionRate,
  serviceAcceptanceRate,
  expectedDemand,
  peakDemandRatio,
  growthRate,
  forecastYears,
  growthFactor,
}) {
  return [
    {
      step_name: "潜在需求",
      formula: "(常住人口 + 工作人口 + 日访客量) × 出行产生率 × 需求权重",
      input_values: { resident_population: residentPopulation, working_population: workingPopulation, daily_visitors: dailyVisitors, trip_generation_rate: tripGenerationRate, demand_weight: demandWeight },
      output_value: roundValue(potentialDemand),
    },
    {
      step_name: "Robotaxi 需求转换",
      formula: "潜在需求 × Robotaxi 采用率 × 服务接受率",
      input_values: { potential_demand: roundValue(potentialDemand), robotaxi_adoption_rate: robotaxiAdoptionRate, service_acceptance_rate: serviceAcceptanceRate },
      output_value: roundValue(expectedDemand),
    },
    {
      step_name: "峰值需求",
      formula: "预计 Robotaxi 需求 × 高峰需求比例",
      input_values: { expected_robotaxi_demand: roundValue(expectedDemand), peak_demand_ratio: peakDemandRatio },
      output_value: roundValue(expectedDemand * peakDemandRatio),
    },
    {
      step_name: "增长修正",
      formula: "(1 + 增长率) ^ 预测年数",
      input_values: { growth_rate: growthRate, forecast_years: forecastYears },
      output_value: growthFactor,
    },
  ];
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

function serviceAreaPlaceProfiles(serviceArea, places = [], placeProfileById = new Map(), zones = []) {
  const relatedPlaceIds = new Set(serviceArea.place_ids || []);
  places.forEach((place) => {
    if ((place.nearby_service_area_ids || []).includes(serviceArea.service_area_id)) {
      relatedPlaceIds.add(place.place_id);
    }
  });
  zones.forEach((zone) => {
    if ((zone.service_area_ids || []).includes(serviceArea.service_area_id)) {
      (zone.place_ids || []).forEach((placeId) => relatedPlaceIds.add(placeId));
    }
  });
  return [...relatedPlaceIds]
    .map((placeId) => placeProfileById.get(placeId))
    .filter(Boolean);
}

function createServiceAreaCalculationSteps({ placeProfiles, pickupProbability, accessibilityFactor, serviceAreaDemand }) {
  return [
    {
      step_name: "服务需求转换",
      formula: "Σ 关联 Place 预计 Robotaxi 需求 × 上车概率 × 可达性系数",
      input_values: {
        related_place_profile_ids: placeProfiles.map((profile) => profile.profile_id),
        related_place_expected_robotaxi_demand: roundValue(placeProfiles.reduce((sum, profile) => sum + Number(profile.expected_robotaxi_demand || 0), 0)),
        pickup_probability: pickupProbability,
        accessibility_factor: accessibilityFactor,
      },
      output_value: roundValue(serviceAreaDemand),
    },
  ];
}

function calculateServiceAreaDemandProfiles({ serviceAreas = [], places = [], zones = [], demandProfiles = [], calculatedAt = null }) {
  const placeProfileById = new Map(demandProfiles
    .filter((profile) => profile.target_object_type === TargetObjectType.PLACE)
    .map((profile) => [profile.target_object_id, profile]));
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
    const placeProfiles = serviceAreaPlaceProfiles(serviceArea, places, placeProfileById, zones);
    const placeExpectedDemand = placeProfiles.reduce((sum, profile) => sum + Number(profile.expected_robotaxi_demand || 0), 0);
    const pickupProbability = Number(existingProfile.pickup_probability ?? 0.5);
    const accessibilityFactor = Number(existingProfile.accessibility_factor ?? 1);
    const serviceAreaDemand = placeExpectedDemand * pickupProbability * accessibilityFactor;
    return {
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
      pickup_probability: pickupProbability,
      dropoff_probability: Number(existingProfile.dropoff_probability ?? baseProfile.dropoff_probability),
      peak_demand_ratio: Number(existingProfile.peak_demand_ratio ?? baseProfile.peak_demand_ratio),
      service_capacity: Number(existingProfile.service_capacity ?? baseProfile.service_capacity),
      waiting_capacity: Number(existingProfile.waiting_capacity ?? baseProfile.waiting_capacity),
      turnover_capacity: Number(existingProfile.turnover_capacity ?? baseProfile.turnover_capacity),
      accessibility_factor: accessibilityFactor,
      service_area_demand: roundValue(serviceAreaDemand),
      profile_field_explanations: createProfileFieldExplanations(TargetObjectType.SERVICE_AREA),
      profile_calculation_steps: createServiceAreaCalculationSteps({
        placeProfiles,
        pickupProbability,
        accessibilityFactor,
        serviceAreaDemand,
      }),
      calculated_from_profile_ids: placeProfiles.map((profile) => profile.profile_id),
      calculated_at: nextCalculatedAt,
    };
  });
}

function demandDistributionByPlaceType(placeProfiles = [], places = []) {
  const placeById = new Map(places.map((place) => [place.place_id, place]));
  const demandByType = {};
  placeProfiles.forEach((profile) => {
    const type = placeById.get(profile.target_object_id)?.place_type || "UNKNOWN";
    demandByType[type] = (demandByType[type] || 0) + Number(profile.expected_robotaxi_demand || 0);
  });
  const total = Object.values(demandByType).reduce((sum, value) => sum + Number(value || 0), 0);
  if (total <= 0) return {};
  return Object.fromEntries(Object.entries(demandByType).map(([type, value]) => [type, roundValue(Number(value || 0) / total, 4)]));
}

function createZoneCalculationSteps({
  serviceAreaProfiles,
  serviceAreaDemand,
  zoneAdjustmentFactor,
  coverageFactor,
  competitionFactor,
  expectedDemand,
  peakDemandRatio,
  peakHourDemand,
  growthRate,
  forecastYears,
  growthFactor,
  coverageGapFactor,
  supplyNeedScore,
  demandDistribution,
}) {
  return [
    {
      step_name: "服务区域需求聚合",
      formula: "Σ ServiceArea DemandProfile.service_area_demand",
      input_values: { service_area_profile_ids: serviceAreaProfiles.map((profile) => profile.profile_id) },
      output_value: roundValue(serviceAreaDemand),
    },
    {
      step_name: "区域修正",
      formula: "服务区域需求聚合 × 区域调整系数 × 服务覆盖系数 × 竞争影响系数",
      input_values: { service_area_demand: roundValue(serviceAreaDemand), zone_adjustment_factor: zoneAdjustmentFactor, coverage_factor: coverageFactor, competition_factor: competitionFactor },
      output_value: roundValue(expectedDemand),
    },
    {
      step_name: "峰值需求",
      formula: "预计 Robotaxi 需求 × 高峰需求比例",
      input_values: { expected_robotaxi_demand: roundValue(expectedDemand), peak_demand_ratio: peakDemandRatio },
      output_value: roundValue(peakHourDemand),
    },
    {
      step_name: "增长修正",
      formula: "(1 + 增长率) ^ 预测年数",
      input_values: { growth_rate: growthRate, forecast_years: forecastYears },
      output_value: growthFactor,
    },
    {
      step_name: "需求分布",
      formula: "每类 Place expected_robotaxi_demand / Zone Place 总需求",
      input_values: demandDistribution,
      output_value: demandDistribution,
    },
    {
      step_name: "供给需求评分",
      formula: "需求增长因子 × 高峰需求因子 × 覆盖缺口因子 × 100",
      input_values: { demand_growth_factor: growthFactor, peak_demand_factor: peakDemandRatio, coverage_gap_factor: coverageGapFactor },
      output_value: roundValue(supplyNeedScore),
    },
  ];
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
    const potentialDemand = zonePlaceProfiles.reduce((sum, profile) => sum + Number(profile.potential_demand || 0), 0);
    const serviceAreaDemand = zoneServiceAreaProfiles.reduce((sum, profile) => sum + Number(profile.service_area_demand || 0), 0);
    const serviceCapacity = zoneServiceAreaProfiles.reduce((sum, profile) => sum + Number(profile.service_capacity || 0), 0);
    const waitingCapacity = zoneServiceAreaProfiles.reduce((sum, profile) => sum + Number(profile.waiting_capacity || 0), 0);
    const turnoverCapacity = zoneServiceAreaProfiles.reduce((sum, profile) => sum + Number(profile.turnover_capacity || 0), 0);
    const zoneAdjustmentFactor = Number(existingZoneProfile.zone_adjustment_factor ?? 1);
    const coverageFactor = Number(existingZoneProfile.coverage_factor ?? 1);
    const competitionFactor = Number(existingZoneProfile.competition_factor ?? 1);
    const growthRate = Number(existingZoneProfile.growth_rate ?? weightedAverage(zonePlaceProfiles, "growth_rate", "expected_robotaxi_demand", 0));
    const forecastYears = Number(existingZoneProfile.forecast_years ?? DEFAULT_FORECAST_YEARS);
    const growthFactor = calculateGrowthFactor(growthRate, forecastYears);
    const peakDemandRatio = Number(existingZoneProfile.peak_demand_ratio ?? weightedAverage(zonePlaceProfiles, "peak_demand_ratio", "expected_robotaxi_demand", DEFAULT_PEAK_DEMAND_RATIO));
    const adjustedExpectedDemand = serviceAreaDemand * zoneAdjustmentFactor * coverageFactor * competitionFactor;
    const peakHourDemand = adjustedExpectedDemand * peakDemandRatio;
    const coverageGapFactor = adjustedExpectedDemand > 0 ? Math.max(0, adjustedExpectedDemand - serviceCapacity) / adjustedExpectedDemand : 0;
    const supplyNeedScore = Math.min(100, growthFactor * peakDemandRatio * coverageGapFactor * 100);
    const demandDistribution = demandDistributionByPlaceType(zonePlaceProfiles, places);
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
      profile_name: existingZoneProfile.profile_name || `${targetName}需求画像`,
      profile_version: Number(existingZoneProfile.profile_version || 1),
      zone_adjustment_factor: zoneAdjustmentFactor,
      coverage_factor: coverageFactor,
      competition_factor: competitionFactor,
      growth_rate: growthRate,
      forecast_years: forecastYears,
      growth_factor: growthFactor,
      peak_demand_ratio: roundValue(peakDemandRatio, 4),
      service_area_demand: roundValue(serviceAreaDemand),
      service_capacity: roundValue(serviceCapacity),
      waiting_capacity: roundValue(waitingCapacity),
      turnover_capacity: roundValue(turnoverCapacity),
      potential_demand: roundValue(potentialDemand),
      expected_robotaxi_demand: roundValue(adjustedExpectedDemand),
      peak_hour_demand: roundValue(peakHourDemand),
      demand_growth_factor: growthFactor,
      peak_demand_factor: roundValue(peakDemandRatio, 4),
      coverage_gap_factor: roundValue(coverageGapFactor, 4),
      demand_distribution: demandDistribution,
      supply_need_score: roundValue(supplyNeedScore),
      calculated_from_profile_ids: [
        ...zonePlaceProfiles.map((profile) => profile.profile_id),
        ...zoneServiceAreaProfiles.map((profile) => profile.profile_id),
      ],
      profile_field_explanations: createProfileFieldExplanations(TargetObjectType.ZONE),
      profile_calculation_steps: createZoneCalculationSteps({
        serviceAreaProfiles: zoneServiceAreaProfiles,
        serviceAreaDemand,
        zoneAdjustmentFactor,
        coverageFactor,
        competitionFactor,
        expectedDemand: adjustedExpectedDemand,
        peakDemandRatio,
        peakHourDemand,
        growthRate,
        forecastYears,
        growthFactor,
        coverageGapFactor,
        supplyNeedScore,
        demandDistribution,
      }),
      calculated_at: nextCalculatedAt,
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
    ...(targetObjectType === TargetObjectType.PLACE ? {
      peak_demand_ratio: Number(profile.peak_demand_ratio ?? DEFAULT_PEAK_DEMAND_RATIO),
      forecast_years: Number(profile.forecast_years || DEFAULT_FORECAST_YEARS),
      growth_factor: calculateGrowthFactor(Number(profile.growth_rate || 0), Number(profile.forecast_years || DEFAULT_FORECAST_YEARS)),
      profile_calculation_steps: profile.profile_calculation_steps || createPlaceCalculationSteps({
        residentPopulation: Number(profile.resident_population || 0),
        workingPopulation: Number(profile.working_population || 0),
        dailyVisitors: Number(profile.daily_visitors || 0),
        tripGenerationRate: Number(profile.trip_generation_rate || 0),
        demandWeight: Number(profile.demand_weight || 1),
        potentialDemand: Number(potentialDemand || 0),
        robotaxiAdoptionRate: Number(profile.robotaxi_adoption_rate || 0),
        serviceAcceptanceRate: Number(profile.service_acceptance_rate || 1),
        expectedDemand: Number(expectedDemand || 0),
        peakDemandRatio: Number(profile.peak_demand_ratio ?? DEFAULT_PEAK_DEMAND_RATIO),
        growthRate: Number(profile.growth_rate || 0),
        forecastYears: Number(profile.forecast_years || DEFAULT_FORECAST_YEARS),
        growthFactor: calculateGrowthFactor(Number(profile.growth_rate || 0), Number(profile.forecast_years || DEFAULT_FORECAST_YEARS)),
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
  return [...placeProfiles, ...serviceAreaProfiles, ...zoneProfiles];
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
      const peakDemandRatio = Number(merged.peak_demand_ratio ?? DEFAULT_PEAK_DEMAND_RATIO);
      const growthRate = Number(merged.growth_rate || 0);
      const forecastYears = Number(merged.forecast_years || DEFAULT_FORECAST_YEARS);
      const growthFactor = calculateGrowthFactor(growthRate, forecastYears);
      const potentialDemand = (
        Number(merged.resident_population || 0)
        + Number(merged.working_population || 0)
        + Number(merged.daily_visitors || 0)
      ) * Number(merged.trip_generation_rate || 0) * Number(merged.demand_weight || 1);
      const expectedDemand = potentialDemand * Number(merged.robotaxi_adoption_rate || 0) * Number(merged.service_acceptance_rate || 1);
      return {
        ...merged,
        peak_demand_ratio: peakDemandRatio,
        growth_rate: growthRate,
        forecast_years: forecastYears,
        growth_factor: growthFactor,
        potential_demand: roundValue(potentialDemand),
        expected_robotaxi_demand: roundValue(expectedDemand),
        peak_hour_demand: roundValue(expectedDemand * peakDemandRatio),
        profile_calculation_steps: createPlaceCalculationSteps({
          residentPopulation: Number(merged.resident_population || 0),
          workingPopulation: Number(merged.working_population || 0),
          dailyVisitors: Number(merged.daily_visitors || 0),
          tripGenerationRate: Number(merged.trip_generation_rate || 0),
          demandWeight: Number(merged.demand_weight || 1),
          potentialDemand,
          robotaxiAdoptionRate: Number(merged.robotaxi_adoption_rate || 0),
          serviceAcceptanceRate: Number(merged.service_acceptance_rate || 1),
          expectedDemand,
          peakDemandRatio,
          growthRate,
          forecastYears,
          growthFactor,
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
