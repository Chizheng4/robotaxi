import {
  initializeDefaultBusinessTargets,
  initializeDefaultFleetAllocationStrategies,
  initializeDefaultLongTermDemandForecastStrategies,
  initializeDefaultSupplyProductionProfiles,
} from "../services/businessPlanningService.js";
import { initializeDefaultSupplyDemandBalanceStrategies } from "../services/supplyDemandBalanceService.js";

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
    supplyDemandBalanceStrategies: initializeDefaultSupplyDemandBalanceStrategies(),
    supplyDemandBalanceRuns: [],
    supplyDemandBalanceResults: [],
    supplyOrders: [],
    dealerSupplies: [],
    ownerSupplies: [],
  };
}
