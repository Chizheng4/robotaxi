import assert from "node:assert/strict";
import fs from "node:fs";
import {
  initializeSpatialBusinessProfiles,
  normalizeDemandProfiles,
  splitDemandProfilesByTarget,
  updateDemandProfileConfig,
} from "../src/data/spatialBusinessProfileInitialization.js";

const context = {
  places: [{ place_id: "P-001", place_name: "住宅生活区 A", place_type: "RESIDENTIAL", demand_weight: 1.1, nearby_service_area_ids: ["SA-001"] }],
  serviceAreas: [{ service_area_id: "SA-001", service_area_name: "住宅区接驳点", place_ids: ["P-001"], capacity: 8, parking_cell_ids: ["C-1"] }],
  zones: [
    { zone_id: "Z-001", zone_name: "最小运营区", parent_zone_id: null, sub_zone_ids: ["Z-001-A"], place_ids: [], service_area_ids: [] },
    { zone_id: "Z-001-A", zone_name: "住宅服务子区", parent_zone_id: "Z-001", place_ids: ["P-001"], service_area_ids: ["SA-001"] },
  ],
};

const initialized = initializeSpatialBusinessProfiles(context);
const place = initialized.demandProfiles.find((profile) => profile.target_object_type === "PLACE");
const serviceArea = initialized.demandProfiles.find((profile) => profile.target_object_type === "SERVICE_AREA");
const zone = initialized.demandProfiles.find((profile) => profile.target_object_type === "ZONE");
assert.ok(place && serviceArea && zone, "必须初始化 Place、ServiceArea、Zone 三类统一画像");
assert.equal(initialized.demandProfiles.filter((profile) => profile.target_object_type === "ZONE").length, 1, "SubZone 不生成画像");
assert.ok(initialized.demandProfiles.every((profile) => profile.target_object_id && profile.target_object_name), "画像必须关联目标对象");
assert.ok(initialized.demandProfiles.every((profile) => Number.isFinite(Date.parse(profile.calculated_at))), "业务计算必须记录真实时间");
assert.equal(place.trip_generation_rate, 0.08, "出行产生率不得预乘需求权重");
assert.ok(place.daily_population_exposure > 0 && place.potential_daily_trips > 0 && place.baseline_addressable_daily_orders > 0, "Place 必须形成完整需求基线");
assert.equal(serviceArea.parent_place_id, "P-001", "ServiceArea 必须唯一归属 Place");
assert.equal("service_area_demand" in serviceArea, false, "ServiceArea 不得生成或保留需求字段");
assert.ok(serviceArea.effective_daily_capacity > 0 && serviceArea.effective_peak_hour_capacity > 0, "ServiceArea 必须计算承载能力");
assert.equal(zone.baseline_addressable_daily_orders, place.baseline_addressable_daily_orders, "Zone 需求必须等于所属 Place 需求汇总");
assert.equal("expected_robotaxi_demand" in zone, false, "Zone 新结果不得继续产生旧兼容需求字段");
assert.equal(zone.effective_daily_capacity, serviceArea.effective_daily_capacity, "Zone 容量必须等于所属 ServiceArea 容量汇总");

const updated = updateDemandProfileConfig({
  ...context,
  demandProfiles: initialized.demandProfiles,
  profileId: place.profile_id,
  patch: { daily_visitors: 2000, trip_generation_rate: 1, demand_weight: 1, robotaxi_adoption_rate: 0.5, service_acceptance_rate: 1, competition_retention_rate: 1 },
});
const updatedPlace = updated.find((profile) => profile.target_object_type === "PLACE");
const updatedZone = updated.find((profile) => profile.target_object_type === "ZONE");
assert.equal(updatedPlace.potential_daily_trips, 3200, "Place 配置后必须按三类人群和独立需求权重重算");
assert.equal(updatedZone.baseline_addressable_daily_orders, 1600, "Zone 必须立即汇总更新后的 Place 需求");

const legacyProfiles = normalizeDemandProfiles({
  ...context,
  placeDemandProfiles: [{ profile_id: "PDP-OLD", place_id: "P-001", profile_status: "ACTIVE", daily_visitors: 100, trip_generation_rate: 0.5, demand_weight: 1 }],
  serviceAreaDemandProfiles: [{ profile_id: "SADP-OLD", service_area_id: "SA-001", profile_status: "ACTIVE" }],
});
assert.ok(legacyProfiles.some((profile) => profile.target_object_type === "PLACE"), "旧 Place 画像必须兼容迁移");
assert.ok(legacyProfiles.some((profile) => profile.target_object_type === "SERVICE_AREA"), "旧 ServiceArea 画像必须兼容迁移");
assert.ok(legacyProfiles.some((profile) => profile.target_object_type === "ZONE"), "迁移后必须补齐 Zone 画像");

const split = splitDemandProfilesByTarget(initialized.demandProfiles);
assert.equal(split.placeDemandProfiles.length, 1);
assert.equal(split.serviceAreaDemandProfiles.length, 1);
assert.equal(split.zoneDemandProfiles.length, 1);

const simulated = updateDemandProfileConfig({ ...context, demandProfiles: initialized.demandProfiles, profileId: place.profile_id, patch: { daily_visitors: 1800 }, calculatedAt: "Day 8 10:30:00" });
assert.ok(simulated.every((profile) => profile.calculated_at === "Day 8 10:30:00"), "只有显式模拟上下文才允许记录模拟时间");

const main = fs.readFileSync("src/main.jsx", "utf8");
assert.ok(main.includes('{ key: "competition_retention_rate"'), "Place 配置必须包含竞争保留率");
assert.ok(main.includes('{ key: "waiting_robotaxi_capacity"'), "ServiceArea 配置必须包含等待 Robotaxi 容量");
assert.ok(main.includes("function saveDemandProfileConfig()"), "画像必须通过统一保存动作整体重算");

console.log("统一需求与服务承载画像验证通过");
