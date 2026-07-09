import {
  initializeDefaultBusinessTargets,
  initializeDefaultFleetAllocationStrategies,
  initializeDefaultLongTermDemandForecastStrategies,
  initializeDefaultSupplyProductionProfiles,
} from "../services/businessPlanningService.js";

export function initializeSupplyManagement() {
  return {
    businessTargets: initializeDefaultBusinessTargets(),
    supplyProductionProfiles: initializeDefaultSupplyProductionProfiles(),
    longTermDemandForecastStrategies: initializeDefaultLongTermDemandForecastStrategies(),
    longTermDemandForecastRuns: [],
    longTermDemandForecasts: [],
    supplyPlans: [],
    productionBatches: [],
    fleetAllocationStrategies: initializeDefaultFleetAllocationStrategies(),
    fleetAllocationRuns: [],
    fleetAllocationResults: [],
    robotaxiDeliveryOrders: [],
    supplyOrders: [],
    dealerSupplies: [],
    ownerSupplies: [],
  };
}
