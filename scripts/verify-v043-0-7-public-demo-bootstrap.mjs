import assert from "node:assert/strict";
import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { initializeOperationsCenter } from "../src/data/operationsCenterInitialization.js";
import { initializeSupplyManagement } from "../src/data/supplyManagementInitialization.js";
import { initializeSpatialBusinessProfiles } from "../src/data/spatialBusinessProfileInitialization.js";
import * as businessPlanningService from "../src/services/businessPlanningService.js";
import {
  PublicDemoBootstrapAction,
  createPublicDemoBootstrapPlan,
  executePublicDemoForecast,
} from "../src/services/publicDemoBootstrapService.js";
import { ensureLatestRelease } from "../src/ui/releaseFreshnessService.js";

const publicLocation = { hostname: "chizheng4.github.io", search: "", href: "https://chizheng4.github.io/robotaxi/" };
const emptyPlan = createPublicDemoBootstrapPlan({ locationLike: publicLocation });
assert.equal(emptyPlan.forecastAction, PublicDemoBootstrapAction.EXECUTE_FORECAST, "线上无预测结果时必须执行预测");
assert.equal(emptyPlan.simulationAction, PublicDemoBootstrapAction.CREATE_SIMULATION, "线上无模拟运行时必须创建模拟");

const readyPlan = createPublicDemoBootstrapPlan({
  locationLike: publicLocation,
  forecastResults: [{ forecast_result_id: "LDF-RES-0001-001" }],
  simulationRuns: [{ simulation_run_id: "SIM-RUN-001", simulation_status: "READY" }],
});
assert.equal(readyPlan.forecastAction, PublicDemoBootstrapAction.NONE, "已有预测结果不得重复执行");
assert.equal(readyPlan.simulationAction, PublicDemoBootstrapAction.START_SIMULATION, "已有就绪模拟必须直接启动");
assert.equal(readyPlan.simulationRunId, "SIM-RUN-001", "必须启动已有就绪模拟");

const completedPlan = createPublicDemoBootstrapPlan({
  locationLike: publicLocation,
  forecastResults: [{ forecast_result_id: "LDF-RES-0001-001" }],
  simulationRuns: [{ simulation_run_id: "SIM-RUN-001", simulation_status: "COMPLETED" }],
});
assert.equal(completedPlan.simulationAction, PublicDemoBootstrapAction.NONE, "已执行模拟不得重复运行");
assert.equal(createPublicDemoBootstrapPlan({ locationLike: { hostname: "127.0.0.1", search: "" } }).enabled, false, "本地开发默认不得自动生成演示数据");

const baseData = {
  ...initializeMapSpace(),
  ...initializeOperationsCenter(),
  ...initializeSupplyManagement(),
};
const operationalData = {
  ...baseData,
  ...initializeSpatialBusinessProfiles(baseData),
};
const forecast = executePublicDemoForecast({
  planningService: businessPlanningService,
  operationalData,
  context: {
    now: () => "2026-07-15T10:00:00.000Z",
    nextRunId: () => "LDF-RUN-DEMO",
    nextResultBaseId: () => "LDF-RES-DEMO",
  },
});
assert(forecast.succeeded && forecast.results.length > 0, "演示初始化必须通过现有经营规划服务生成预测结果");
assert.equal(forecast.operationalData.longTermDemandForecastRuns[0].forecast_run_id, "LDF-RUN-DEMO", "预测执行记录必须完整保留");

let replacedUrl = null;
const latestReleaseReloaded = await ensureLatestRelease({
  locationLike: {
    hostname: "chizheng4.github.io",
    href: "https://chizheng4.github.io/robotaxi/",
    replace: (url) => { replacedUrl = url; },
  },
  documentLike: {
    querySelector: () => ({ getAttribute: () => "./src/main.bundle.js?v=old-release" }),
  },
  fetchImplementation: async () => ({ ok: true, json: async () => ({ cache_version: "new-release" }) }),
  sessionStorageLike: new MapStorage(),
});
assert.equal(latestReleaseReloaded, true, "检测到线上新版本时必须刷新");
assert(String(replacedUrl).includes("release=new-release"), "刷新地址必须携带最新发布标识");

console.log("v043.0.7 线上演示数据引导验证通过");

function MapStorage() {
  const values = new Map();
  this.getItem = (key) => values.get(key) || null;
  this.setItem = (key, value) => values.set(key, String(value));
}
