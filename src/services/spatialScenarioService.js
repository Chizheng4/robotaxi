import {
  CITY_SPATIAL_SCENARIO_ID,
  GRID_SPATIAL_SCENARIO_ID,
  initializeSpatialScenarios,
} from "../data/spatialScenarioInitialization.js?v=20260721-v049-2-0";

export function normalizeSpatialScenarioState(data = {}) {
  const initial = initializeSpatialScenarios();
  return {
    spatialScenarios: Array.isArray(data.spatialScenarios) && data.spatialScenarios.length
      ? data.spatialScenarios
      : initial.spatialScenarios,
    activeSpatialScenarioId: data.activeSpatialScenarioId || initial.activeSpatialScenarioId,
  };
}

export function getSpatialScenario(data = {}, scenarioId) {
  const state = normalizeSpatialScenarioState(data);
  return state.spatialScenarios.find((scenario) => scenario.spatial_scenario_id === scenarioId) || null;
}

export function getActiveBusinessScenario(data = {}) {
  const state = normalizeSpatialScenarioState(data);
  const configured = state.spatialScenarios.find((scenario) => scenario.spatial_scenario_id === state.activeSpatialScenarioId);
  if (configured?.business_runtime_enabled) return configured;
  return state.spatialScenarios.find((scenario) => scenario.business_runtime_enabled) || null;
}

export function getCityGeographicScenario(data = {}) {
  return getSpatialScenario(data, CITY_SPATIAL_SCENARIO_ID);
}

export function getGridSimulationScenario(data = {}) {
  return getSpatialScenario(data, GRID_SPATIAL_SCENARIO_ID);
}

export function canUseScenarioForBusinessRuntime(scenario) {
  return Boolean(scenario?.business_runtime_enabled
    && scenario.routing_provider_type !== "UNAVAILABLE"
    && scenario.position_provider_type !== "UNAVAILABLE");
}

export function createScenarioPresentation(viewScenario, businessScenario) {
  return {
    viewLabel: viewScenario?.spatial_scenario_name || "未知空间场景",
    runtimeLabel: businessScenario?.spatial_scenario_name || "未启用",
    message: viewScenario?.capability_message || "",
    sameScenario: viewScenario?.spatial_scenario_id === businessScenario?.spatial_scenario_id,
  };
}
