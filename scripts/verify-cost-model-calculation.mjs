import {
  CostType,
  createCostCalculation,
  initializeDefaultCostModelProfile,
} from "../src/data/costModelCalculator.js";
import { getDisplayValue } from "../src/domain/fieldDictionary.js";

const simulationRun = {
  simulation_run_id: "SIM-RUN-COST",
  simulation_timeline_id: "SIM-TL-COST",
  simulation_status: "COMPLETED",
  current_day: 1,
  current_time: "Day 1 00:10:00",
  current_day_tick: 10,
  current_global_tick: 10,
};

const businessData = {
  routes: [
    { route_id: "R-OPS", total_distance_m: 1200 },
    { route_id: "R-PICKUP", total_distance_m: 800 },
    { route_id: "R-DROP", total_distance_m: 1600 },
  ],
  routeExecutions: [{
    route_execution_id: "REX-COST",
    simulation_run_id: "SIM-RUN-COST",
    task_id: "TASK-DP-COST",
    robotaxi_id: "RT-001",
    route_id: "R-OPS",
    simulation_created_at: "Day 1 00:00:00",
    simulation_completed_at: "Day 1 00:02:00",
  }],
  trips: [{
    trip_id: "TRIP-COST",
    simulation_run_id: "SIM-RUN-COST",
    service_order_id: "SO-COST",
    robotaxi_id: "RT-002",
    route_history: [{ route_id: "R-PICKUP" }, { route_id: "R-DROP" }],
    simulation_created_at: "Day 1 00:03:00",
    simulation_completed_at: "Day 1 00:08:00",
  }],
  serviceOrders: [{
    service_order_id: "SO-COST",
    simulation_run_id: "SIM-RUN-COST",
    trip_id: "TRIP-COST",
  }],
  readinessTasks: [{
    task_id: "TASK-RC-COST",
    simulation_run_id: "SIM-RUN-COST",
    robotaxi_id: "RT-003",
    worker_id: "WK-001",
    calculated_simulation_created_at: "Day 1 00:00:00",
    calculated_simulation_completed_at: "Day 1 00:04:00",
  }],
  deploymentTasks: [{
    task_id: "TASK-DP-COST",
    simulation_run_id: "SIM-RUN-COST",
    robotaxi_id: "RT-001",
    worker_id: "WK-002",
    calculated_simulation_created_at: "Day 1 00:00:00",
    calculated_simulation_completed_at: "Day 1 00:03:00",
  }],
};

const profile = initializeDefaultCostModelProfile();
const result = createCostCalculation({
  simulationRun,
  profile,
  businessData,
  calculationRunId: "CCR-VERIFY",
});

assert(result.calculationRun.calculation_status === "SUCCEEDED", "成本计算应成功");
assert(result.costRecords.length === 8, `应生成 8 条成本记录，实际 ${result.costRecords.length}`);
assert(result.costRecords.some((record) => record.cost_type === CostType.DISTANCE_COST), "应包含距离成本");
assert(result.costRecords.some((record) => record.cost_type === CostType.ENERGY_COST), "应包含能源成本");
assert(result.costRecords.some((record) => record.cost_type === CostType.LABOR_COST), "应包含人力成本");
assert(result.costRecords.some((record) => record.cost_type === CostType.ASSET_DEPRECIATION_COST), "应包含资产折旧成本");

const serviceOrder = result.businessData.serviceOrders[0];
const trip = result.businessData.trips[0];
assert(serviceOrder.total_cost_amount === trip.total_cost_amount, "服务订单应汇总关联 Trip 成本，不重复计算");
assert(getDisplayValue("DISTANCE_COST", "cost_type") === "距离成本", "成本类型必须中文展示");
assert(getDisplayValue("PER_KM", "depreciation_method") === "按公里折旧", "折旧方式必须中文展示");

console.log("成本模型计算验证通过");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
