import {
  initializeDefaultBusinessTargets,
  initializeDefaultFleetAllocationStrategies,
  initializeDefaultLongTermDemandForecastStrategies,
  initializeDefaultSupplyDecisionStrategies,
  initializeDefaultSupplyProductionProfiles,
} from "../services/businessPlanningService.js";
import { initializeDefaultSupplyDemandBalanceStrategies } from "../services/supplyDemandBalanceService.js";
import { initializeOperatingPlanningData } from "../services/operatingPlanningService.js?v=20260716-v046-0-6";

export function initializeSupplyManagement() {
  const operatingPlanning = initializeOperatingPlanningData();
  return {
    businessTargets: initializeDefaultBusinessTargets(),
    supplyProductionProfiles: initializeDefaultSupplyProductionProfiles(),
    longTermDemandForecastStrategies: initializeDefaultLongTermDemandForecastStrategies(),
    longTermDemandForecastRuns: [],
    longTermDemandForecasts: [],
    supplyDecisionStrategies: initializeDefaultSupplyDecisionStrategies(),
    supplyDecisionRuns: [],
    supplyPlans: [],
    productionBatches: [],
    fleetAllocationStrategies: initializeDefaultFleetAllocationStrategies(),
    fleetAllocationRuns: [],
    fleetAllocationResults: [],
    robotaxiDeliveryOrders: [],
    supplyDemandBalanceStrategies: initializeDefaultSupplyDemandBalanceStrategies(),
    supplyDemandBalanceRuns: [],
    supplyDemandBalanceResults: [],
    ...operatingPlanning,
    supplyOrders: [],
    dealerSupplies: [],
    ownerSupplies: [],
  };
}
