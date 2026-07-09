import {
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
    supplyOrders: [],
    dealerSupplies: [],
    ownerSupplies: [],
  };
}
