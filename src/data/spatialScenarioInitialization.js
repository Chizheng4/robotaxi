import {
  PositionProviderType,
  RoutingProviderType,
  SpatialScenarioStatus,
  SpatialScenarioType,
  createSpatialScenario,
} from "../domain/spatialScenarioTypes.js?v=20260721-v049-2-0";

export const GRID_SPATIAL_SCENARIO_ID = "SCENE-GRID-001";
export const CITY_SPATIAL_SCENARIO_ID = "SCENE-CITY-GZ-001";
export const CITY_SPATIAL_CATALOG_VERSION = "2026.07.22-city-3";

export function initializeSpatialScenarios() {
  return {
    spatialScenarios: [
      createSpatialScenario({
        spatial_scenario_id: GRID_SPATIAL_SCENARIO_ID,
        spatial_scenario_name: "网格仿真",
        spatial_scenario_type: SpatialScenarioType.GRID_SIMULATION,
        spatial_scenario_status: SpatialScenarioStatus.ACTIVE,
        map_dataset_id: "M-001",
        spatial_catalog_version: "2026.07.21-grid-1",
        routing_provider_type: RoutingProviderType.GRID_ROAD_GRAPH,
        position_provider_type: PositionProviderType.CELL_POSITION,
        business_runtime_enabled: true,
        capability_message: "当前业务运行、路径规划和模拟运行使用网格仿真空间",
      }),
      createSpatialScenario({
        spatial_scenario_id: CITY_SPATIAL_SCENARIO_ID,
        spatial_scenario_name: "城市地理",
        spatial_scenario_type: SpatialScenarioType.CITY_GEOGRAPHIC,
        spatial_scenario_status: SpatialScenarioStatus.PLANNING,
        map_dataset_id: "MAP-DATASET-GZ-DEMO-001",
        spatial_catalog_version: CITY_SPATIAL_CATALOG_VERSION,
        routing_provider_type: RoutingProviderType.UNAVAILABLE,
        position_provider_type: PositionProviderType.UNAVAILABLE,
        business_runtime_enabled: false,
        capability_message: "当前用于广州运营空间规划；城市道路路由和车辆地理位置尚未启用",
      }),
    ],
    activeSpatialScenarioId: GRID_SPATIAL_SCENARIO_ID,
  };
}
