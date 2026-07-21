export const SpatialScenarioType = Object.freeze({
  CITY_GEOGRAPHIC: "CITY_GEOGRAPHIC",
  GRID_SIMULATION: "GRID_SIMULATION",
});

export const SpatialScenarioStatus = Object.freeze({
  PLANNING: "PLANNING",
  ACTIVE: "ACTIVE",
});

export const RoutingProviderType = Object.freeze({
  GRID_ROAD_GRAPH: "GRID_ROAD_GRAPH",
  CITY_ROAD_GRAPH: "CITY_ROAD_GRAPH",
  UNAVAILABLE: "UNAVAILABLE",
});

export const PositionProviderType = Object.freeze({
  CELL_POSITION: "CELL_POSITION",
  GEOGRAPHIC_POSITION: "GEOGRAPHIC_POSITION",
  UNAVAILABLE: "UNAVAILABLE",
});

export function createSpatialScenario(input = {}) {
  return {
    spatial_scenario_id: input.spatial_scenario_id,
    spatial_scenario_name: input.spatial_scenario_name,
    spatial_scenario_type: input.spatial_scenario_type,
    spatial_scenario_status: input.spatial_scenario_status || SpatialScenarioStatus.PLANNING,
    map_dataset_id: input.map_dataset_id,
    spatial_catalog_version: input.spatial_catalog_version,
    routing_provider_type: input.routing_provider_type || RoutingProviderType.UNAVAILABLE,
    position_provider_type: input.position_provider_type || PositionProviderType.UNAVAILABLE,
    business_runtime_enabled: input.business_runtime_enabled === true,
    capability_message: input.capability_message || "",
  };
}
