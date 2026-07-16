import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeMapSpace } from "../src/data/mapInitialization.js";
import { initializeOperationsCenter } from "../src/data/operationsCenterInitialization.js";
import { initializeSpatialBusinessProfiles } from "../src/data/spatialBusinessProfileInitialization.js";
import { initializeSupplyManagement } from "../src/data/supplyManagementInitialization.js";
import {
  executeLongTermDemandForecastStrategy,
  executeSupplyDecisionStrategy,
} from "../src/services/businessPlanningService.js";
import {
  confirmDeploymentPlan,
  executeDeploymentDecision,
  executeShortTermDemandForecast,
} from "../src/services/operatingPlanningService.js";
import { navigationGroups, validateNavigationRegistry } from "../src/ui/navigationRegistry.js";
import { validatePageArchitecture } from "../src/ui/pageArchitectureRegistry.js";

const now = "2026-07-16T00:00:00.000Z";
const mapData = initializeMapSpace();
const operations = initializeOperationsCenter();
const supply = initializeSupplyManagement();
const profiles = initializeSpatialBusinessProfiles({ ...mapData, ...operations, ...supply, now });

const longForecast = executeLongTermDemandForecastStrategy({
  strategy: supply.longTermDemandForecastStrategies[0],
  businessTargets: supply.businessTargets,
  demandProfiles: profiles.demandProfiles,
  supplyProductionProfiles: supply.supplyProductionProfiles,
  robotaxis: operations.robotaxis,
  context: { now },
});
assert.equal(longForecast.run.run_status, "SUCCEEDED");
assert.ok(longForecast.results.length > 0);

const supplyDecision = executeSupplyDecisionStrategy({
  strategy: supply.supplyDecisionStrategies[0],
  forecast: longForecast.results[0],
  supplyProductionProfiles: supply.supplyProductionProfiles,
  context: { now, nextRunId: () => "SD-RUN-TEST", nextSupplyPlanId: () => "FPP-TEST" },
});
assert.equal(supplyDecision.run.run_status, "SUCCEEDED");
assert.equal(supplyDecision.supplyPlan.supply_decision_run_id, "SD-RUN-TEST");
assert.ok(supplyDecision.supplyPlan.planned_robotaxi_count > 0);

const shortForecast = executeShortTermDemandForecast({
  strategy: supply.shortTermDemandForecastStrategies[0],
  demandProfiles: profiles.demandProfiles,
  serviceOrders: [],
  trips: [],
  zones: mapData.zones,
  places: mapData.places,
  serviceAreas: mapData.serviceAreas,
  context: { now, nextRunId: () => "STF-RUN-TEST" },
});
assert.equal(shortForecast.run.run_status, "SUCCEEDED");
assert.ok(shortForecast.results.some((item) => item.predicted_order_count > 0));
assert.ok(shortForecast.results.every((item) => item.current_supply_quantity === undefined));

const deploymentDecision = executeDeploymentDecision({
  strategy: supply.deploymentDecisionStrategies[0],
  forecastResults: shortForecast.results,
  robotaxis: [],
  zones: mapData.zones,
  places: mapData.places,
  serviceAreas: mapData.serviceAreas,
  context: { now, nextRunId: () => "DD-RUN-TEST" },
});
assert.equal(deploymentDecision.run.run_status, "SUCCEEDED");
assert.ok(deploymentDecision.plans.length > 0);
assert.equal(confirmDeploymentPlan({ plan: deploymentDecision.plans[0], context: { now } }).plan.plan_status, "CONFIRMED");

const leafKeys = [];
const walk = (items) => items.forEach((item) => item.children?.length ? walk(item.children) : leafKeys.push(item.key));
walk(navigationGroups);
assert.ok(leafKeys.includes("supplyDecisionStrategies"));
assert.ok(leafKeys.includes("shortTermDemandForecastResults"));
assert.ok(leafKeys.includes("deploymentPlans"));
assert.ok(!leafKeys.includes("supplyDemandBalanceStrategies"));
assert.equal(validatePageArchitecture(leafKeys).valid, true);

const mainSource = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
assert.match(mainSource, /createDeploymentTask\(\{[\s\S]*deployment_plan_id/);
assert.match(mainSource, /operatingPlanningService\.executeShortTermDemandForecast/);

console.log(`v046 经营与供应规划闭环验证通过：长期结果 ${longForecast.results.length}，短期结果 ${shortForecast.results.length}，投放计划 ${deploymentDecision.plans.length}`);
