export const PublicDemoBootstrapAction = Object.freeze({
  NONE: "NONE",
  EXECUTE_FORECAST: "EXECUTE_FORECAST",
  EXECUTE_SHORT_TERM_FORECAST: "EXECUTE_SHORT_TERM_FORECAST",
  CREATE_SIMULATION: "CREATE_SIMULATION",
  START_SIMULATION: "START_SIMULATION",
});

const executedSimulationStatuses = new Set([
  "RUNNING",
  "DRAINING",
  "PAUSED",
  "COMPLETED",
  "STOPPED",
  "FAILED",
]);

export function isPublicDemoEnvironment(locationLike = globalThis.location) {
  const hostname = String(locationLike?.hostname || "").toLowerCase();
  const search = String(locationLike?.search || "");
  return hostname === "chizheng4.github.io" || new URLSearchParams(search).get("publicDemo") === "1";
}

export function createPublicDemoBootstrapPlan({
  locationLike = globalThis.location,
  forecastResults = [],
  shortTermForecastResults = [],
  simulationRuns = [],
} = {}) {
  if (!isPublicDemoEnvironment(locationLike)) {
    return {
      enabled: false,
      forecastAction: PublicDemoBootstrapAction.NONE,
      shortTermForecastAction: PublicDemoBootstrapAction.NONE,
      simulationAction: PublicDemoBootstrapAction.NONE,
      simulationRunId: null,
    };
  }

  const hasForecastResult = forecastResults.some((item) => item?.forecast_result_id);
  const hasShortTermForecastResult = shortTermForecastResults.some((item) => item?.short_term_forecast_result_id);
  const readySimulationRun = simulationRuns.find((item) => item?.simulation_status === "READY") || null;
  const hasExecutedSimulation = simulationRuns.some((item) => executedSimulationStatuses.has(item?.simulation_status));

  return {
    enabled: true,
    forecastAction: hasForecastResult
      ? PublicDemoBootstrapAction.NONE
      : PublicDemoBootstrapAction.EXECUTE_FORECAST,
    shortTermForecastAction: hasShortTermForecastResult
      ? PublicDemoBootstrapAction.NONE
      : PublicDemoBootstrapAction.EXECUTE_SHORT_TERM_FORECAST,
    simulationAction: hasExecutedSimulation
      ? PublicDemoBootstrapAction.NONE
      : readySimulationRun
        ? PublicDemoBootstrapAction.START_SIMULATION
        : PublicDemoBootstrapAction.CREATE_SIMULATION,
    simulationRunId: readySimulationRun?.simulation_run_id || null,
  };
}

export function executePublicDemoShortTermForecast({
  planningService,
  operationalData = {},
  context = {},
} = {}) {
  if (operationalData.shortTermDemandForecastResults?.some((item) => item?.short_term_forecast_result_id)) {
    return { executed: false, succeeded: true, operationalData, run: null, results: [] };
  }

  const strategy = (operationalData.shortTermDemandForecastStrategies || [])
    .find((item) => item.strategy_status === "ACTIVE")
    || operationalData.shortTermDemandForecastStrategies?.[0]
    || null;
  if (!planningService?.executeShortTermDemandForecast || !strategy) {
    return { executed: false, succeeded: false, operationalData, run: null, results: [] };
  }

  const result = planningService.executeShortTermDemandForecast({
    strategy,
    demandProfiles: operationalData.demandProfiles || [],
    serviceOrders: operationalData.serviceOrders || [],
    trips: operationalData.trips || [],
    zones: operationalData.zones || [],
    places: operationalData.places || [],
    serviceAreas: operationalData.serviceAreas || [],
    context,
  });
  return {
    executed: true,
    succeeded: Boolean(result.results?.length),
    run: result.run,
    results: result.results || [],
    operationalData: {
      ...operationalData,
      shortTermDemandForecastRuns: [result.run, ...(operationalData.shortTermDemandForecastRuns || [])],
      shortTermDemandForecastResults: [...(result.results || []), ...(operationalData.shortTermDemandForecastResults || [])],
    },
  };
}

export function executePublicDemoForecast({
  planningService,
  operationalData = {},
  context = {},
} = {}) {
  if (operationalData.longTermDemandForecasts?.some((item) => item?.forecast_result_id)) {
    return { executed: false, succeeded: true, operationalData, run: null, results: [] };
  }

  const strategy = (operationalData.longTermDemandForecastStrategies || [])
    .find((item) => item.strategy_status === "ACTIVE")
    || operationalData.longTermDemandForecastStrategies?.[0]
    || null;
  if (!planningService?.executeLongTermDemandForecastStrategy || !strategy) {
    return { executed: false, succeeded: false, operationalData, run: null, results: [] };
  }

  const result = planningService.executeLongTermDemandForecastStrategy({
    strategy,
    businessTargets: operationalData.businessTargets || [],
    demandProfiles: operationalData.demandProfiles || [],
    supplyProductionProfiles: operationalData.supplyProductionProfiles || [],
    robotaxis: operationalData.robotaxis || [],
    context,
  });
  return {
    executed: true,
    succeeded: Boolean(result.results?.length),
    run: result.run,
    results: result.results || [],
    operationalData: {
      ...operationalData,
      longTermDemandForecastRuns: [result.run, ...(operationalData.longTermDemandForecastRuns || [])],
      longTermDemandForecasts: [...(result.results || []), ...(operationalData.longTermDemandForecasts || [])],
    },
  };
}
