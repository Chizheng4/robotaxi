import {
  DemandSimulationAlgorithm,
  DemandSimulationStatus,
  DemandSimulationStrategyType,
  createDemandSimulationStrategy,
} from "../domain/demandSimulationTypes.js?v=20260611-v019-2-demand-simulation";

export function initializeDemandSimulation() {
  return {
    demandSimulationStrategies: [
      createDemandSimulationStrategy({
        demand_simulation_strategy_id: "DSS-001",
        strategy_name: "基础随机需求模拟策略",
        strategy_type: DemandSimulationStrategyType.BASIC_RANDOM_DEMAND_SIMULATION,
        simulation_algorithm: DemandSimulationAlgorithm.BASIC_WEIGHTED_RANDOM_SAMPLING,
        location_type_weights: {
          PLACE: 0.6,
          ROAD_SEGMENT: 0.3,
          CELL: 0.1,
        },
        strategy_status: DemandSimulationStatus.ACTIVE,
        description: "从 ACTIVE 客户池中随机选择客户，并生成订单创建上下文。",
        demand_simulation_run_count: 0,
      }),
    ],
  };
}
