export const RevenueType = {
  RECEIVABLE_REVENUE: "RECEIVABLE_REVENUE",
  COLLECTED_REVENUE: "COLLECTED_REVENUE",
  UNRECEIVED_REVENUE: "UNRECEIVED_REVENUE",
};

export const RevenueCalculationStatus = {
  QUEUED: "QUEUED",
  CALCULATING: "CALCULATING",
  SUCCEEDED: "SUCCEEDED",
  PARTIALLY_SUCCEEDED: "PARTIALLY_SUCCEEDED",
  FAILED: "FAILED",
};

export function createRevenueCalculation({
  simulationRun,
  scope,
  calculationRunId,
  algorithmVersion = "1.0.0",
}) {
  const startedAt = new Date().toISOString();
  const errors = [];
  const records = [];
  let sequence = 1;

  (scope.serviceOrders || []).forEach((order) => {
    const receivable = firstPositive(order.final_price, order.estimated_price, order.quoted_price);
    const collected = nonNegative(order.paid_amount, 0);
    if (!receivable && !collected) {
      errors.push(createError("REVENUE_AMOUNT_MISSING", order.service_order_id, "服务订单缺少可生成收入记录的金额"));
      return;
    }
    if (receivable > 0) {
      records.push(createRecord({ simulationRun, calculationRunId, order, sequence: sequence++, revenueType: RevenueType.RECEIVABLE_REVENUE, amount: receivable, basisField: revenueBasisField(order) }));
    }
    if (collected > 0) {
      records.push(createRecord({ simulationRun, calculationRunId, order, sequence: sequence++, revenueType: RevenueType.COLLECTED_REVENUE, amount: collected, basisField: "paid_amount" }));
    }
    const unreceived = Math.max(0, receivable - collected);
    if (unreceived > 0) {
      records.push(createRecord({ simulationRun, calculationRunId, order, sequence: sequence++, revenueType: RevenueType.UNRECEIVED_REVENUE, amount: unreceived, basisField: "receivable_amount - collected_amount" }));
    }
  });

  const failedOrderIds = new Set(errors.map((error) => error.service_order_id));
  const processedObjectCount = (scope.serviceOrders || []).length;
  const status = processedObjectCount > 0 && failedOrderIds.size >= processedObjectCount
    ? RevenueCalculationStatus.FAILED
    : errors.length > 0
      ? RevenueCalculationStatus.PARTIALLY_SUCCEEDED
      : RevenueCalculationStatus.SUCCEEDED;

  return {
    businessData: {
      serviceOrders: (scope.serviceOrders || []).map((order) => ({
        ...order,
        ...summarizeRevenueRecords(records.filter((record) => record.service_order_id === order.service_order_id)),
        revenue_calculated_at: startedAt,
        revenue_calculation_run_id: calculationRunId,
      })),
    },
    revenueRecords: records,
    calculationRun: {
      revenue_calculation_run_id: calculationRunId,
      simulation_run_id: simulationRun.simulation_run_id,
      simulation_timeline_id: simulationRun.simulation_timeline_id,
      calculation_status: status,
      calculation_progress_percent: 100,
      processed_object_count: processedObjectCount,
      generated_revenue_record_count: records.length,
      total_receivable_revenue_amount: sumByType(records, RevenueType.RECEIVABLE_REVENUE),
      total_collected_revenue_amount: sumByType(records, RevenueType.COLLECTED_REVENUE),
      total_unreceived_revenue_amount: sumByType(records, RevenueType.UNRECEIVED_REVENUE),
      error_count: errors.length,
      calculation_errors: errors,
      algorithm_version: algorithmVersion,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    },
  };
}

export function createIncrementalRevenueRecords({
  simulationRun,
  serviceOrder,
  calculationRunId,
  algorithmVersion = "1.0.0",
}) {
  const result = createRevenueCalculation({
    simulationRun: simulationRun || {
      simulation_run_id: serviceOrder?.simulation_run_id || "BUSINESS-RUNTIME",
      simulation_timeline_id: serviceOrder?.simulation_timeline_id || null,
      simulation_status: "COMPLETED",
    },
    scope: { serviceOrders: serviceOrder ? [serviceOrder] : [] },
    calculationRunId,
    algorithmVersion,
  });
  return result;
}

export function summarizeRevenueRecords(records = []) {
  return {
    total_receivable_revenue_amount: sumByType(records, RevenueType.RECEIVABLE_REVENUE),
    total_collected_revenue_amount: sumByType(records, RevenueType.COLLECTED_REVENUE),
    total_unreceived_revenue_amount: sumByType(records, RevenueType.UNRECEIVED_REVENUE),
  };
}

function createRecord({ simulationRun, calculationRunId, order, sequence, revenueType, amount, basisField }) {
  return {
    revenue_record_id: `${calculationRunId}-RR-${String(sequence).padStart(5, "0")}`,
    simulation_run_id: simulationRun.simulation_run_id,
    revenue_calculation_run_id: calculationRunId,
    service_order_id: order.service_order_id,
    customer_id: order.customer_id || null,
    robotaxi_id: order.matched_robotaxi_id || null,
    revenue_type: revenueType,
    revenue_amount: roundMoney(amount),
    currency_code: "CNY",
    revenue_basis_field: basisField,
    simulation_revenue_occurred_at: order.simulation_payment_completed_at || order.simulation_completed_at || order.simulation_created_at || null,
    created_at: new Date().toISOString(),
  };
}

function createError(errorType, serviceOrderId, message) {
  return {
    error_type: errorType,
    error_message: message,
    service_order_id: serviceOrderId,
  };
}

function revenueBasisField(order) {
  if (Number(order.final_price || 0) > 0) return "final_price";
  if (Number(order.estimated_price || 0) > 0) return "estimated_price";
  return "quoted_price";
}

function firstPositive(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

function nonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function sumByType(records, revenueType) {
  return roundMoney(records
    .filter((record) => record.revenue_type === revenueType)
    .reduce((sum, record) => sum + Number(record.revenue_amount || 0), 0));
}

function roundMoney(value) {
  return Number((Number(value || 0)).toFixed(2));
}
