export function createSimulationRunBusinessScope(simulationRun, businessData = {}) {
  const runId = simulationRun?.simulation_run_id;
  const filterByRun = (items = []) => (items || []).filter((item) => item?.simulation_run_id === runId);
  return {
    simulationRun,
    simulation_run_id: runId,
    serviceOrders: filterByRun(businessData.serviceOrders),
    trips: filterByRun(businessData.trips),
    readinessTasks: filterByRun(businessData.readinessTasks),
    cleaningTasks: filterByRun(businessData.cleaningTasks),
    chargingTasks: filterByRun(businessData.chargingTasks),
    maintenanceTasks: filterByRun(businessData.maintenanceTasks),
    failureHandlingTasks: filterByRun(businessData.failureHandlingTasks),
    retirementTasks: filterByRun(businessData.retirementTasks),
    deploymentTasks: filterByRun(businessData.deploymentTasks),
    routeExecutions: filterByRun(businessData.routeExecutions),
    pricingStrategyRuns: filterByRun(businessData.pricingStrategyRuns),
    pricingDecisions: filterByRun(businessData.pricingDecisions),
    orderMatchingRuns: filterByRun(businessData.orderMatchingRuns),
    orderMatchingDecisions: filterByRun(businessData.orderMatchingDecisions),
    routePlanningRuns: filterByRun(businessData.routePlanningRuns),
    demandSimulationRuns: filterByRun(businessData.demandSimulationRuns),
    routes: businessData.routes || [],
    robotaxis: businessData.robotaxis || [],
    maps: businessData.maps || [],
  };
}

export function countScopeObjects(scope) {
  return [
    scope.serviceOrders,
    scope.trips,
    scope.readinessTasks,
    scope.cleaningTasks,
    scope.chargingTasks,
    scope.maintenanceTasks,
    scope.failureHandlingTasks,
    scope.retirementTasks,
    scope.deploymentTasks,
    scope.routeExecutions,
  ].reduce((sum, items) => sum + (items?.length || 0), 0);
}
