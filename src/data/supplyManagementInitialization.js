import {
  initializeDefaultFleetAllocationStrategies,
  initializeDefaultLongTermDemandForecastStrategies,
  initializeDefaultSupplyProductionProfiles,
} from "../services/businessPlanningService.js";

export function initializeSupplyManagement() {
  return {
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
