import assert from "node:assert/strict";
import fs from "node:fs";
import {
  initializeSpatialBusinessProfiles,
  normalizeDemandProfiles,
  splitDemandProfilesByTarget,
} from "../src/data/spatialBusinessProfileInitialization.js";

const context = {
  places: [
    { place_id: "P-001", place_name: "住宅生活区 A", place_type: "RESIDENTIAL", demand_weight: 1.1 },
  ],
  serviceAreas: [
    { service_area_id: "SA-001", service_area_name: "住宅区接驳点", capacity: 8, parking_cell_ids: ["C-1"] },
  ],
  zones: [
    { zone_id: "Z-001", zone_name: "最小运营区", place_ids: ["P-001"], service_area_ids: ["SA-001"] },
  ],
};

const initialized = initializeSpatialBusinessProfiles(context);
assert.ok(Array.isArray(initialized.demandProfiles), "初始化必须生成统一 demandProfiles");
assert.ok(initialized.demandProfiles.some((profile) => profile.target_object_type === "PLACE"), "必须生成 Place 类型 DemandProfile");
assert.ok(initialized.demandProfiles.some((profile) => profile.target_object_type === "SERVICE_AREA"), "必须生成 ServiceArea 类型 DemandProfile");
assert.ok(initialized.demandProfiles.some((profile) => profile.target_object_type === "ZONE"), "必须生成 Zone 类型 DemandProfile");
assert.ok(initialized.demandProfiles.every((profile) => profile.target_object_id && profile.target_object_name), "DemandProfile 必须包含目标对象编号和名称");
assert.equal(initialized.demandProfiles.some((profile) => Object.hasOwn(profile, "profile_type")), false, "新初始化不得写入 profile_type 主字段");
const zoneProfile = initialized.demandProfiles.find((profile) => profile.target_object_type === "ZONE");
assert.equal(zoneProfile.service_capacity, 8, "Zone 画像服务容量必须由包含的 ServiceArea 汇总计算");
assert.equal(zoneProfile.waiting_capacity, 1, "Zone 画像等待容量必须由包含的 ServiceArea 汇总计算");
assert.equal(zoneProfile.turnover_capacity, 32, "Zone 画像周转能力必须由包含的 ServiceArea 汇总计算");
assert.ok(zoneProfile.potential_demand > 0, "Zone 画像潜在需求必须由包含的 Place 画像汇总计算");
assert.ok(zoneProfile.expected_robotaxi_demand > 0, "Zone 画像预计 Robotaxi 需求必须由包含的 Place 画像汇总计算");

const legacyProfiles = normalizeDemandProfiles({
  ...context,
  placeDemandProfiles: [{ profile_id: "PDP-OLD", place_id: "P-001", profile_status: "ACTIVE", daily_visitors: 100, trip_generation_rate: 0.5, demand_weight: 1 }],
  serviceAreaDemandProfiles: [{ profile_id: "SADP-OLD", service_area_id: "SA-001", profile_status: "ACTIVE", service_capacity: 8 }],
});
assert.ok(legacyProfiles.some((profile) => profile.target_object_type === "PLACE" && profile.target_object_id === "P-001"), "旧 Place 画像必须迁移为统一 DemandProfile");
assert.ok(legacyProfiles.some((profile) => profile.target_object_type === "SERVICE_AREA" && profile.target_object_id === "SA-001"), "旧 ServiceArea 画像必须迁移为统一 DemandProfile");
assert.ok(legacyProfiles.some((profile) => profile.target_object_type === "ZONE" && profile.target_object_id === "Z-001"), "迁移旧画像时必须补齐 Zone DemandProfile");

const split = splitDemandProfilesByTarget(initialized.demandProfiles);
assert.equal(split.placeDemandProfiles.length, 1, "兼容拆分必须保留 Place 画像数组");
assert.equal(split.serviceAreaDemandProfiles.length, 1, "兼容拆分必须保留 ServiceArea 画像数组");
assert.equal(split.zoneDemandProfiles.length, 1, "兼容拆分必须保留 Zone 画像数组");

const main = fs.readFileSync("src/main.jsx", "utf8");
const fieldDictionary = fs.readFileSync("src/domain/fieldDictionary.js", "utf8");
const dictionaryDoc = fs.readFileSync("doc/rules/field-dictionary.md", "utf8");

assert.ok(main.includes('"target_object_name",\n      "potential_demand",\n      "expected_robotaxi_demand",\n      "peak_hour_demand",\n      "service_capacity"'), "需求画像页面必须把关键计算数字放在目标对象字段之后");
assert.ok(main.includes('"resident_population",\n      "working_population",\n      "daily_visitors",\n      "trip_generation_rate"'), "需求画像页面必须展示可配置的 Place 需求输入数字");
assert.ok(main.includes('"pickup_probability",\n      "dropoff_probability",\n      "peak_demand_ratio"'), "需求画像页面必须展示可配置的 ServiceArea 能力输入数字");
assert.ok(!main.includes('columns: ["profile_id", "profile_type", "source_object_id", "source_object_name"'), "需求画像页面不得继续以 profile_type/source_object_* 为主列");
assert.ok(main.includes("demandProfiles: snapshot.operationalData?.demandProfiles || initialData.demandProfiles || []"), "运行态恢复必须读取统一 demandProfiles");
assert.ok(main.includes("normalizeDemandProfiles ? normalizeDemandProfiles(operationalData)"), "运行态必须归一化旧画像数据");

assert.ok(fieldDictionary.includes('target_object_type: "目标对象类型"'), "代码字段字典必须包含目标对象类型");
assert.ok(fieldDictionary.includes('target_object_id: "目标对象编号"'), "代码字段字典必须包含目标对象编号");
assert.ok(fieldDictionary.includes('SERVICE_AREA: "服务区域"'), "代码值字典必须包含 SERVICE_AREA 中文");
assert.ok(dictionaryDoc.includes("|target_object_type|目标对象类型|"), "文档字段字典必须包含目标对象类型");
assert.ok(dictionaryDoc.includes("|profile_type|画像类型（兼容）|"), "文档字段字典必须标记 profile_type 为兼容字段");

console.log("v041.1 需求画像统一对象合同验证通过");
