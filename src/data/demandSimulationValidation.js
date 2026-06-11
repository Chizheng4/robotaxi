import {
  DemandSimulationAlgorithm,
  DemandSimulationResult,
  DemandSimulationStatus,
  DemandSimulationStrategyType,
} from "../domain/demandSimulationTypes.js?v=20260611-v019-2-demand-simulation";

export function validateDemandSimulation(data) {
  const strategies = data.demandSimulationStrategies || [];
  const runs = data.demandSimulationRuns || [];
  const strategyIds = strategies.map((strategy) => strategy.demand_simulation_strategy_id);
  const customerIds = new Set((data.customers || []).map((customer) => customer.customer_id));
  const serviceAreaById = new Map((data.serviceAreas || []).map((area) => [area.service_area_id, area]));

  return [
    check("DEMAND_SIMULATION_STRATEGY_COUNT", "需求模拟策略数量必须为 1", strategies.length === 1, `当前 ${strategies.length} 个策略`),
    check("DEMAND_SIMULATION_STRATEGY_ID", "需求模拟策略编号必须为 DSS-001", strategies[0]?.demand_simulation_strategy_id === "DSS-001"),
    check("DEMAND_SIMULATION_STRATEGY_TYPE", "需求模拟策略类型必须正确", strategies[0]?.strategy_type === DemandSimulationStrategyType.BASIC_RANDOM_DEMAND_SIMULATION),
    check("DEMAND_SIMULATION_ALGORITHM", "需求模拟算法必须为基础加权随机采样", strategies[0]?.simulation_algorithm === DemandSimulationAlgorithm.BASIC_WEIGHTED_RANDOM_SAMPLING),
    check("DEMAND_SIMULATION_STRATEGY_ACTIVE", "需求模拟策略初始状态必须可使用", strategies[0]?.strategy_status === DemandSimulationStatus.ACTIVE),
    check("DEMAND_SIMULATION_RUN_STRATEGY_REF", "需求模拟执行记录必须引用有效策略", runs.every((run) => strategyIds.includes(run.demand_simulation_strategy_id))),
    check("DEMAND_SIMULATION_RUN_CUSTOMER_REF", "成功的需求模拟执行记录必须引用有效客户", runs.every((run) => run.simulation_result !== DemandSimulationResult.SUCCESS || customerIds.has(run.customer_id))),
    check("DEMAND_SIMULATION_RUN_PICKUP_REF", "成功的需求模拟执行记录上车点必须属于服务区", runs.every((run) => {
      if (run.simulation_result !== DemandSimulationResult.SUCCESS) return true;
      const area = serviceAreaById.get(run.pickup_service_area_id);
      return area?.pickup_cell_ids.includes(run.pickup_cell_id);
    })),
    check("DEMAND_SIMULATION_RUN_DROPOFF_REF", "成功的需求模拟执行记录下车点必须属于服务区", runs.every((run) => {
      if (run.simulation_result !== DemandSimulationResult.SUCCESS) return true;
      const area = serviceAreaById.get(run.dropoff_service_area_id);
      return area?.dropoff_cell_ids.includes(run.dropoff_cell_id);
    })),
  ];
}

function check(rule_id, rule_name, passed, detail = "") {
  return {
    rule_id,
    rule_name,
    result: passed ? "PASS" : "FAIL",
    detail,
  };
}
