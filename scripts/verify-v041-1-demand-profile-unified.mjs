import assert from "node:assert/strict";
import fs from "node:fs";
import {
  initializeSpatialBusinessProfiles,
  normalizeDemandProfiles,
  splitDemandProfilesByTarget,
  updateDemandProfileConfig,
} from "../src/data/spatialBusinessProfileInitialization.js";

const context = {
  places: [
    { place_id: "P-001", place_name: "住宅生活区 A", place_type: "RESIDENTIAL", demand_weight: 1.1 },
  ],
  serviceAreas: [
    { service_area_id: "SA-001", service_area_name: "住宅区接驳点", capacity: 8, parking_cell_ids: ["C-1"] },
  ],
  zones: [
    { zone_id: "Z-001", zone_name: "最小运营区", parent_zone_id: null, sub_zone_ids: ["Z-001-A"], place_ids: [], service_area_ids: [] },
    { zone_id: "Z-001-A", zone_name: "住宅服务子区", parent_zone_id: "Z-001", place_ids: ["P-001"], service_area_ids: ["SA-001"] },
  ],
};

const initialized = initializeSpatialBusinessProfiles(context);
assert.ok(Array.isArray(initialized.demandProfiles), "初始化必须生成统一 demandProfiles");
assert.ok(initialized.demandProfiles.some((profile) => profile.target_object_type === "PLACE"), "必须生成 Place 类型 DemandProfile");
assert.ok(initialized.demandProfiles.some((profile) => profile.target_object_type === "SERVICE_AREA"), "必须生成 ServiceArea 类型 DemandProfile");
assert.ok(initialized.demandProfiles.some((profile) => profile.target_object_type === "ZONE"), "必须生成 Zone 类型 DemandProfile");
assert.equal(initialized.demandProfiles.filter((profile) => profile.target_object_type === "ZONE").length, 1, "只允许为一级 Zone 生成 DemandProfile，SubZone 不生成画像");
assert.ok(initialized.demandProfiles.every((profile) => profile.target_object_id && profile.target_object_name), "DemandProfile 必须包含目标对象编号和名称");
assert.ok(initialized.demandProfiles.every((profile) => profile.profile_field_explanations), "DemandProfile 必须包含通用字段解释属性");
assert.ok(initialized.demandProfiles.every((profile) => Array.isArray(profile.profile_calculation_steps)), "DemandProfile 必须包含通用计算过程属性");
assert.ok(initialized.demandProfiles.every((profile) => !String(profile.calculated_at || "").startsWith("Day ")), "业务初始化计算时间不得使用模拟时间占位");
assert.ok(initialized.demandProfiles.every((profile) => Number.isFinite(Date.parse(profile.calculated_at))), "业务初始化计算时间必须是真实时间");
assert.equal(initialized.demandProfiles.some((profile) => Object.hasOwn(profile, "profile_type")), false, "新初始化不得写入 profile_type 主字段");
const zoneProfile = initialized.demandProfiles.find((profile) => profile.target_object_type === "ZONE");
const serviceAreaProfile = initialized.demandProfiles.find((profile) => profile.target_object_type === "SERVICE_AREA");
assert.equal(zoneProfile.service_capacity, 8, "Zone 画像服务容量必须由包含的 ServiceArea 汇总计算");
assert.equal(zoneProfile.waiting_capacity, 1, "Zone 画像等待容量必须由包含的 ServiceArea 汇总计算");
assert.equal(zoneProfile.turnover_capacity, 32, "Zone 画像周转能力必须由包含的 ServiceArea 汇总计算");
assert.ok(serviceAreaProfile.service_area_demand > 0, "ServiceArea 画像必须计算承接服务需求");
assert.ok(zoneProfile.potential_demand > 0, "Zone 画像潜在需求必须由包含的 Place 画像汇总计算");
assert.ok(zoneProfile.expected_robotaxi_demand > 0, "Zone 画像预计 Robotaxi 需求必须由包含的 ServiceArea 画像汇总计算");
assert.equal(zoneProfile.expected_robotaxi_demand, serviceAreaProfile.service_area_demand, "无区域修正时 Zone 需求必须等于服务区域承接需求汇总");
assert.ok(zoneProfile.profile_field_explanations.expected_robotaxi_demand.calculation_logic.includes("Σ 子区域内 ServiceArea"), "Zone 字段解释必须写出服务区域需求汇总计算逻辑");
assert.deepEqual(zoneProfile.calculated_from_profile_ids.sort(), ["DP-P-P-001", "DP-SA-SA-001"].sort(), "Zone 画像计算来源必须来自子区域内 Place 与 ServiceArea 画像");
assert.ok(Object.hasOwn(zoneProfile.demand_distribution, "RESIDENTIAL"), "Zone 需求分布必须按 Place 类型形成占比");
assert.ok(Number.isFinite(zoneProfile.supply_need_score), "Zone 供给需求评分必须是数值");

const legacyProfiles = normalizeDemandProfiles({
  ...context,
  placeDemandProfiles: [{ profile_id: "PDP-OLD", place_id: "P-001", profile_status: "ACTIVE", daily_visitors: 100, trip_generation_rate: 0.5, demand_weight: 1, potential_demand: 0, expected_robotaxi_demand: 0 }],
  serviceAreaDemandProfiles: [{ profile_id: "SADP-OLD", service_area_id: "SA-001", profile_status: "ACTIVE" }],
});
assert.ok(legacyProfiles.some((profile) => profile.target_object_type === "PLACE" && profile.target_object_id === "P-001"), "旧 Place 画像必须迁移为统一 DemandProfile");
assert.ok(legacyProfiles.some((profile) => profile.target_object_type === "SERVICE_AREA" && profile.target_object_id === "SA-001"), "旧 ServiceArea 画像必须迁移为统一 DemandProfile");
assert.ok(legacyProfiles.some((profile) => profile.target_object_type === "ZONE" && profile.target_object_id === "Z-001"), "迁移旧画像时必须补齐 Zone DemandProfile");
const migratedPlace = legacyProfiles.find((profile) => profile.target_object_type === "PLACE" && profile.target_object_id === "P-001");
const migratedServiceArea = legacyProfiles.find((profile) => profile.target_object_type === "SERVICE_AREA" && profile.target_object_id === "SA-001");
const migratedZone = legacyProfiles.find((profile) => profile.target_object_type === "ZONE" && profile.target_object_id === "Z-001");
assert.ok(migratedPlace.potential_demand > 0, "旧 Place 画像即使带有过期计算值，也必须按当前配置重新计算潜在需求");
assert.ok(migratedPlace.expected_robotaxi_demand > 0, "旧 Place 画像即使带有过期计算值，也必须按当前配置重新计算预计需求");
assert.equal(migratedServiceArea.service_capacity, 8, "旧 ServiceArea 画像缺少容量配置时必须从 ServiceArea 基础对象补齐");
assert.equal(migratedZone.service_capacity, 8, "旧 ServiceArea 补齐容量后 Zone 汇总容量必须同步重算");

const split = splitDemandProfilesByTarget(initialized.demandProfiles);
assert.equal(split.placeDemandProfiles.length, 1, "兼容拆分必须保留 Place 画像数组");
assert.equal(split.serviceAreaDemandProfiles.length, 1, "兼容拆分必须保留 ServiceArea 画像数组");
assert.equal(split.zoneDemandProfiles.length, 1, "兼容拆分必须保留 Zone 画像数组");

const placeProfile = initialized.demandProfiles.find((profile) => profile.target_object_type === "PLACE");
const updatedByPlaceConfig = updateDemandProfileConfig({
  ...context,
  demandProfiles: initialized.demandProfiles,
  profileId: placeProfile.profile_id,
  patch: { daily_visitors: 2000, trip_generation_rate: 1, demand_weight: 1, robotaxi_adoption_rate: 0.5, service_acceptance_rate: 1 },
});
const recalculatedZone = updatedByPlaceConfig.find((profile) => profile.target_object_type === "ZONE");
assert.equal(recalculatedZone.potential_demand, 3200, "配置 Place 后 Zone 潜在需求必须自动重算");
assert.equal(recalculatedZone.expected_robotaxi_demand, 800, "配置 Place 后 Zone 预计 Robotaxi 需求必须经过 ServiceArea Demand 自动重算");
assert.ok(updatedByPlaceConfig.every((profile) => Number.isFinite(Date.parse(profile.calculated_at))), "人工保存配置后所有画像必须记录真实计算时间");

const updatedByServiceAreaConfig = updateDemandProfileConfig({
  ...context,
  demandProfiles: initialized.demandProfiles,
  profileId: serviceAreaProfile.profile_id,
  patch: { pickup_probability: 0.25, accessibility_factor: 0.5, service_capacity: 20, waiting_capacity: 6, turnover_capacity: 80 },
});
const serviceAreaAdjusted = updatedByServiceAreaConfig.find((profile) => profile.target_object_type === "SERVICE_AREA");
const zoneAfterServiceAreaConfig = updatedByServiceAreaConfig.find((profile) => profile.target_object_type === "ZONE");
assert.equal(serviceAreaAdjusted.service_capacity, 20, "配置 ServiceArea 后服务容量必须保存为配置值");
assert.equal(zoneAfterServiceAreaConfig.service_capacity, 20, "配置 ServiceArea 后 Zone 服务容量必须整体重算");
assert.ok(zoneAfterServiceAreaConfig.expected_robotaxi_demand < zoneProfile.expected_robotaxi_demand, "配置 ServiceArea 需求转换参数后 Zone 预计需求必须整体重算");

const simulatedCalculationTime = "Day 8 10:30:00";
const updatedBySimulationContext = updateDemandProfileConfig({
  ...context,
  demandProfiles: initialized.demandProfiles,
  profileId: placeProfile.profile_id,
  patch: { daily_visitors: 1800 },
  calculatedAt: simulatedCalculationTime,
});
assert.ok(updatedBySimulationContext.every((profile) => profile.calculated_at === simulatedCalculationTime), "只有模拟触发显式传入模拟时间时，画像才允许记录模拟计算时间");

const updatedByZoneConfig = updateDemandProfileConfig({
  ...context,
  demandProfiles: initialized.demandProfiles,
  profileId: zoneProfile.profile_id,
  patch: { zone_adjustment_factor: 2, coverage_factor: 1, competition_factor: 1, growth_rate: 0.05, forecast_years: 3 },
});
const adjustedZone = updatedByZoneConfig.find((profile) => profile.target_object_type === "ZONE");
assert.equal(adjustedZone.service_capacity, 8, "配置 Zone 时服务容量仍必须来自 ServiceArea 汇总，不能人工覆盖");
assert.ok(adjustedZone.expected_robotaxi_demand > zoneProfile.expected_robotaxi_demand, "配置 Zone 修正系数后预计需求必须重算");
assert.equal(adjustedZone.growth_factor, 1.1576, "配置 Zone 增长率和预测年数后增长修正必须自动计算");

const main = fs.readFileSync("src/main.jsx", "utf8");
const fieldDictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
const dictionaryDoc = fs.readFileSync("doc/rules/field-dictionary.md", "utf8");

assert.ok(main.includes('"target_object_name",\n      "potential_demand",\n      "expected_robotaxi_demand",\n      "service_area_demand",\n      "peak_hour_demand"'), "需求画像页面必须把关键计算数字放在目标对象字段之后");
assert.ok(main.includes('"service_area_demand",'), "需求画像页面必须展示服务区域需求");
assert.ok(main.includes("const order = { ZONE: 0, PLACE: 1, SERVICE_AREA: 2 };"), "需求画像列表必须将 Zone 画像显示在第一行");
assert.ok(main.includes('"resident_population",\n      "working_population",\n      "daily_visitors",\n      "trip_generation_rate"'), "需求画像页面必须展示可配置的 Place 需求输入数字");
assert.ok(main.includes('"pickup_probability",\n      "dropoff_probability",\n      "peak_demand_ratio"'), "需求画像页面必须展示可配置的 ServiceArea 能力输入数字");
assert.ok(main.includes("function editDemandProfile(profile)"), "需求画像必须提供配置入口");
assert.ok(main.includes("function saveDemandProfileConfig()"), "需求画像必须提供保存配置动作");
assert.ok(main.includes("function getDetailTabs(selectedType, selectedObject)"), "详情标签必须接收选中对象，避免需求画像详情白屏");
assert.ok(main.includes("function DetailFieldContent({ selectedObject, keys })"), "详情模块必须通过统一入口区分简单字段和复杂字段");
assert.ok(main.includes("function isComplexDetailField(key, value)"), "详情模块必须识别复杂字段");
assert.ok(main.includes('className="detail-block-list"'), "复杂详情字段必须整行块级展示，不能塞入 Descriptions 内容格");
assert.ok(main.includes("function getStructuredKeyLabel(key)"), "结构化详情 key 必须统一走字段字典或枚举字典展示");
assert.ok(main.includes('if (selectedType === "demandProfile") {\n    return getDemandProfileDetailTabs(selectedObject);'), "需求画像详情必须使用当前选中画像生成详情标签");
assert.ok(main.includes('{ key: "explanation", label: "字段解释", keys: ["profile_field_explanations"] }'), "需求画像详情必须展示字段解释");
assert.ok(main.includes('{ key: "steps", label: "计算过程", keys: ["profile_calculation_steps"] }'), "需求画像详情必须展示计算过程");
assert.ok(main.includes('renderActionCell(row, <RowActionButton onClick={() => actions.editDemandProfile(row)}>配置</RowActionButton>)'), "需求画像表格行操作必须显示配置按钮");
assert.ok(main.includes('if (profile.target_object_type === "ZONE")'), "Zone 画像配置必须单独分支");
assert.ok(main.includes('{ key: "zone_adjustment_factor", type: "number"'), "Zone 画像配置必须只暴露区域修正类字段");
assert.ok(!main.includes('profile.target_object_type === "ZONE") {\n    return [\n      ...commonFields,\n      { key: "service_capacity"'), "Zone 画像不得配置服务容量等汇总字段");
assert.ok(!main.includes('{ key: "growth_factor", type: "number"'), "Zone 增长修正是计算字段，不得作为人工配置字段");
assert.ok(!main.includes('columns: ["profile_id", "profile_type", "source_object_id", "source_object_name"'), "需求画像页面不得继续以 profile_type/source_object_* 为主列");
assert.ok(main.includes("demandProfiles: snapshot.operationalData?.demandProfiles || initialData.demandProfiles || []"), "运行态恢复必须读取统一 demandProfiles");
assert.ok(main.includes("normalizeDemandProfiles ? normalizeDemandProfiles(operationalData)"), "运行态必须归一化旧画像数据");

assert.ok(fieldDictionary.includes('target_object_type: "目标对象类型"'), "代码字段字典必须包含目标对象类型");
assert.ok(fieldDictionary.includes('target_object_id: "目标对象编号"'), "代码字段字典必须包含目标对象编号");
assert.ok(fieldDictionary.includes('profile_field_explanations: "画像字段解释"'), "代码字段字典必须包含画像字段解释");
assert.ok(fieldDictionary.includes('profile_calculation_steps: "画像计算过程"'), "代码字段字典必须包含画像计算过程");
assert.ok(fieldDictionary.includes('related_place_profile_ids: "关联地点画像"'), "代码字段字典必须包含计算过程嵌套字段");
assert.ok(fieldDictionary.includes('SERVICE_AREA: "服务区域"'), "代码值字典必须包含 SERVICE_AREA 中文");
assert.ok(dictionaryDoc.includes("target_object_type") && dictionaryDoc.includes("目标对象类型"), "文档字段字典必须包含目标对象类型");
assert.ok(dictionaryDoc.includes("profile_field_explanations") && dictionaryDoc.includes("画像字段解释"), "文档字段字典必须包含画像字段解释");
assert.ok(dictionaryDoc.includes("service_area_demand"), "文档字段字典必须包含服务区域需求");
assert.ok(dictionaryDoc.includes("related_place_profile_ids"), "文档字段字典必须包含计算过程嵌套字段");
assert.ok(dictionaryDoc.includes("profile_type") && dictionaryDoc.includes("画像类型（兼容）"), "文档字段字典必须标记 profile_type 为兼容字段");

console.log("v041.1 需求画像统一对象合同验证通过");
