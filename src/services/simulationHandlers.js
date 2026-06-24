/**
 * Simulation Handlers：业务动作处理器
 *
 * 为 ExecutionEngine 提供真实的业务函数实现。
 * 每个 handler 签名为 ({ objectId, data, context }) => result
 *
 * 设计原则：
 * - 接收完整数据上下文（data），返回变更描述
 * - 不直接持有全局状态，由调用方决定如何应用变更
 * - 最大限度复用已有的 service 层函数（serviceOrderService、tripService）
 */

// ============================================================================
// 1. 需求侧：创建服务订单
// ============================================================================

let simulationBusinessSequence = 0;

function nextSimulationBusinessId(prefix, context = {}) {
  simulationBusinessSequence += 1;
  const tick = String((context.globalTick || 0) + 1).padStart(4, "0");
  return `${prefix}-SIM-${tick}-${String(simulationBusinessSequence).padStart(4, "0")}`;
}

function getSimulationAudit(context, { created = false, completed = false } = {}) {
  const simulationTime = context?.tickContext?.current_time;
  if (!context?.simulationRunId || !simulationTime) return {};
  const audit = {
    record_source: "SIMULATION",
    simulation_run_id: context.simulationRunId,
    simulation_updated_at: simulationTime,
    simulation_global_tick: (Number(context.tickContext?.global_tick ?? context.globalTick) || 0) + 1,
  };
  if (created) audit.simulation_created_at = simulationTime;
  if (completed) audit.simulation_completed_at = simulationTime;
  return audit;
}

function formatFailureReason(reason) {
  const reasonLabels = {
    NO_ACTIVE_CUSTOMER: "没有可用客户",
    NO_AVAILABLE_PLACE: "没有可用地点",
    NO_AVAILABLE_ROAD_SEGMENT: "没有可用道路片段",
    CUSTOMER_LOCATION_INVALID: "客户需求位置无效",
    NO_AVAILABLE_PICKUP_CELL: "没有可用上车点",
    NO_AVAILABLE_DROPOFF_CELL: "没有可用下车点",
    ROUTE_ESTIMATION_FAILED: "路径估算失败",
    PRICING_STRATEGY_NOT_FOUND: "未找到可用定价策略",
    PRICING_CONFIG_MISSING: "定价参数缺失",
    INVALID_DISTANCE: "预估距离无效",
    INVALID_DURATION: "预估时长无效",
    NO_AVAILABLE_ROBOTAXI: "没有可用 Robotaxi",
    ROBOTAXI_STATE_INVALID: "Robotaxi 状态无效",
    ROBOTAXI_ALREADY_ASSIGNED: "Robotaxi 已被分配",
    PICKUP_CELL_UNREACHABLE: "上车点不可达",
    BATTERY_NOT_ENOUGH: "电量不足",
  };
  return reasonLabels[reason] || reason || "未知原因";
}

/**
 * SERVICE_ORDER_CREATE
 * 根据需求模拟策略生成一条服务订单
 */
export function handleServiceOrderCreate({ data, context }) {
  const { demandSimulationEngine, data: appData, setDemandSimulationRuns, setServiceOrders } = data;

  if (!demandSimulationEngine || !appData) {
    return { success: false, message: "缺少需求模拟引擎或数据上下文" };
  }

  // 运行需求模拟
  const runId = nextSimulationBusinessId("DSR", context);
  const dsResult = demandSimulationEngine.runDemandSimulation({
    strategy: appData.demandSimulationStrategies?.[0],
    data: appData,
    customers: appData.customers,
    orderChannel: "OWN_APP_SIMULATED_ORDER",
    runId,
    randomSeed: `${context.simulationRunId || "SIM"}-${context.globalTick || 0}-${context.actionIndex || 0}`,
    createdAt: new Date().toISOString(),
  });
  if (dsResult) setDemandSimulationRuns((prev) => [{ ...dsResult, ...getSimulationAudit(context, { created: true }) }, ...prev]);

  if (!dsResult || dsResult.simulation_result !== "SUCCESS") {
    const failureReason = dsResult?.failure_reason || "需求模拟未返回结果";
    return {
      success: false,
      resultType: "SERVICE_ORDER_CREATE_FAILED",
      message: "服务订单创建失败：" + formatFailureReason(failureReason),
      data: {
        objectType: "demandSimulationRun",
        objectId: dsResult?.demand_simulation_run_id || runId,
        failureReason,
      },
    };
  }

  // 创建服务订单
  const orderChannel = dsResult.order_channel || "OWN_APP_SIMULATED_ORDER";
  const newOrder = createServiceOrderFromDemandResult(dsResult, orderChannel, appData, context);

  setServiceOrders((prev) => [newOrder, ...prev]);

  return {
    success: true,
    resultType: "ORDER_CREATED",
    message: `服务订单 ${newOrder.service_order_id} 已创建`,
    data: { objectType: "serviceOrder", objectId: newOrder.service_order_id, serviceOrderId: newOrder.service_order_id },
  };
}

// ============================================================================
// 2. 订单侧：定价
// ============================================================================

/**
 * PRICING_EXECUTE
 * 对服务订单执行价格预估
 */
export function handlePricingExecute({ objectId, data, context }) {
  const { serviceOrderService: sosService, data: appData, serviceOrders, pricingStrategyRuns, pricingDecisions, setServiceOrders, setPricingStrategyRuns, setPricingDecisions } = data;
  const order = serviceOrders.find((o) => o.service_order_id === objectId);
  if (!order) return { success: false, message: `未找到服务订单 ${objectId}` };

  const strategy = appData.pricingStrategies?.find((s) => s.strategy_status === "ACTIVE");
  if (!strategy) return { success: false, message: "无可用定价策略" };

  // 使用路径规划生成价格预估 Route
  let routeEstimate = null;
  if (appData.routePlanningStrategies?.length > 0) {
    // 生成一条价格预估路径（简化处理）
    routeEstimate = {
      route_id: null,
      estimated_distance_km: pickRandomDistance(context),
      estimated_duration_min: pickRandomDuration(context),
    };
  }

  const runId = nextSimulationBusinessId("DPR", {});
  const decisionId = nextSimulationBusinessId("PD", {});

  const result = sosService.executePricing({
    serviceOrder: order,
    strategy,
    data: appData,
    routeEstimate,
    pricingStrategyRunId: runId,
    pricingDecisionId: decisionId,
    createdAt: new Date().toISOString(),
  });

  if (!result.success) {
    const failureReason = result.failureReason || "未知原因";
    setServiceOrders((prev) => prev.map((o) => {
      if (o.service_order_id !== objectId) return o;
      return { ...o, order_status: "PRICING_FAILED", pricing_explanation: formatFailureReason(failureReason), ...getSimulationAudit(context) };
    }));
    return {
      success: false,
      resultType: "PRICING_FAILED",
      message: `服务订单 ${objectId} 定价失败：${formatFailureReason(failureReason)}`,
      data: { objectType: "serviceOrder", objectId, failureReason },
    };
  }

  // 更新订单
  setServiceOrders((prev) => prev.map((o) => {
    if (o.service_order_id !== objectId) return o;
    return {
      ...o,
      order_status: "WAITING_ROBOTAXI_CALL",
      estimated_pricing_decision_id: decisionId,
      quote_base_fare: result.decision?.base_fare,
      quote_distance_unit_price: result.decision?.distance_unit_price,
      quote_time_unit_price: result.decision?.time_unit_price,
      estimated_distance_km: result.decision?.estimated_distance_km,
      estimated_duration_min: result.decision?.estimated_duration_min,
      estimated_price: result.decision?.estimated_price,
      quoted_price: result.decision?.estimated_price,
      pricing_explanation: result.decision?.pricing_explanation,
      ...getSimulationAudit(context),
    };
  }));

  if (result.run) setPricingStrategyRuns((prev) => [{ ...result.run, ...getSimulationAudit(context, { created: true }) }, ...prev]);
  if (result.decision) setPricingDecisions((prev) => [{ ...result.decision, ...getSimulationAudit(context, { created: true }) }, ...prev]);

  return { success: true, resultType: "PRICING_COMPLETED", message: `服务订单 ${objectId} 定价完成`, data: { objectType: "serviceOrder", objectId } };
}

// ============================================================================
// 3. 订单侧：客户确认
// ============================================================================

/**
 * ROBOTAXI_CALL
 * 自动客户确认，订单进入待匹配状态
 */
export function handleRobotaxiCall({ objectId, data, context }) {
  const { serviceOrders, setServiceOrders } = data;
  const order = serviceOrders.find((o) => o.service_order_id === objectId);
  if (!order) return { success: false, message: `未找到服务订单 ${objectId}` };

  setServiceOrders((prev) => prev.map((o) => {
    if (o.service_order_id !== objectId) return o;
    return { ...o, order_status: "WAITING_ROBOTAXI_ASSIGNMENT", ...getSimulationAudit(context) };
  }));

  return { success: true, resultType: "CUSTOMER_CONFIRMED", message: `服务订单 ${objectId} 客户已确认`, data: { objectType: "serviceOrder", objectId } };
}

// ============================================================================
// 4. 订单侧：匹配
// ============================================================================

/**
 * ORDER_MATCHING_EXECUTE
 * 对服务订单执行 Robotaxi 匹配
 */
export function handleOrderMatchingExecute({ objectId, data, context }) {
  const { serviceOrderService: sosService, data: appData, serviceOrders, robotaxis, orderMatchingRuns, orderMatchingDecisions, setServiceOrders, setTrips, setRobotaxis, setOrderMatchingRuns, setOrderMatchingDecisions } = data;
  const order = serviceOrders.find((o) => o.service_order_id === objectId);
  if (!order) return { success: false, message: `未找到服务订单 ${objectId}` };

  const strategy = appData.orderMatchingStrategies?.find((s) => s.strategy_status === "ACTIVE");
  if (!strategy) return { success: false, message: "无可用匹配策略" };

  const runId = nextSimulationBusinessId("OMR", {});
  const decisionId = nextSimulationBusinessId("OMD", {});

  const result = sosService.executeOrderMatching({
    strategy,
    serviceOrder: order,
    data: appData,
    orderMatchingRunId: runId,
    orderMatchingDecisionId: decisionId,
    createdAt: new Date().toISOString(),
  });

  if (!result.success) {
    const failureReason = result.failureReason || "未知原因";
    setServiceOrders((prev) => prev.map((o) => {
      if (o.service_order_id !== objectId) return o;
      return { ...o, order_status: "MATCH_FAILED", ...getSimulationAudit(context) };
    }));
    return {
      success: false,
      resultType: "MATCHING_FAILED",
      message: `服务订单 ${objectId} 匹配失败：${formatFailureReason(failureReason)}`,
      data: { objectType: "serviceOrder", objectId, failureReason },
    };
  }

  const robotaxiId = result.decision?.selected_robotaxi_id;
  const matchedOrder = { ...order, matched_robotaxi_id: robotaxiId };
  const trip = createTripForOrderSimple(matchedOrder, appData, context);

  // 匹配成功同时创建履约行驶记录；订单状态由履约主链投影。
  setTrips((prev) => [trip, ...prev]);
  setServiceOrders((prev) => prev.map((o) => {
    if (o.service_order_id !== objectId) return o;
    return {
      ...o,
      order_status: "ON_THE_WAY_PICKUP",
      matched_robotaxi_id: robotaxiId,
      trip_id: trip.trip_id,
      order_matching_decision_id: decisionId,
      matched_at: new Date().toISOString(),
      simulation_matched_at: context?.tickContext?.current_time || null,
      ...getSimulationAudit(context),
    };
  }));

  // 更新 Robotaxi
  if (robotaxiId) {
    setRobotaxis((prev) => prev.map((r) => {
      if (r.robotaxi_id !== robotaxiId) return r;
      return { ...r, current_order_id: objectId, motion_status: "STOPPED", ...getSimulationAudit(context) };
    }));
  }

  if (result.run) setOrderMatchingRuns((prev) => [{ ...result.run, ...getSimulationAudit(context, { created: true }) }, ...prev]);
  if (result.decision) setOrderMatchingDecisions((prev) => [{ ...result.decision, ...getSimulationAudit(context, { created: true }) }, ...prev]);

  return { success: true, resultType: "MATCHING_COMPLETED", message: `服务订单 ${objectId} 匹配成功，Robotaxi: ${robotaxiId}`, data: { objectType: "serviceOrder", objectId, robotaxiId, tripId: trip.trip_id } };
}

// ============================================================================
// 5. 履约侧：Trip 推进
// ============================================================================

/**
 * TRIP_STEP_EXECUTE
 * 推进 Trip 到下一状态（创建或步进）
 */
export function handleTripStepExecute({ objectId, data, context }) {
  const { tripService, data: appData, serviceOrders, trips, setServiceOrders, setTrips, setRobotaxis } = data;

  // objectId 可能是 service_order_id 或 trip_id
  let order = serviceOrders.find((o) => o.service_order_id === objectId);
  let trip = trips.find((t) => t.trip_id === objectId);

  // 如果是 trip_id，反向查找 order
  if (!order && trip) {
    order = serviceOrders.find((o) => o.trip_id === trip.trip_id || o.service_order_id === trip.service_order_id);
  }
  // 如果是 service_order_id，查找 trip
  if (!trip && order) {
    trip = trips.find((t) => t.trip_id === order.trip_id);
  }

  if (!order) return { success: false, message: `未找到服务订单 ${objectId}` };

  // 如果没有 Trip，先创建
  if (!trip) {
    trip = createTripForOrderSimple(order, appData, context);
    setTrips((prev) => [trip, ...prev]);
    setServiceOrders((prev) => prev.map((o) => {
      if (o.service_order_id !== objectId) return o;
      return { ...o, trip_id: trip.trip_id, ...getSimulationAudit(context) };
    }));
    return { success: true, resultType: "TRIP_CREATED", message: `履约行驶 ${trip.trip_id} 已创建`, data: { objectType: "trip", objectId: trip.trip_id, serviceOrderId: order.service_order_id } };
  }

  // 推进 Trip 状态
  const nextTrip = tripService.getNextTripState(trip);
  if (!nextTrip) {
    // 尝试步进
    const moveResult = tripService.getNextTripMovementState(trip, appData);
    if (moveResult) {
      const auditedMoveResult = { ...moveResult, ...getSimulationAudit(context) };
      setTrips((prev) => prev.map((t) => t.trip_id === trip.trip_id ? auditedMoveResult : t));
      updateRobotaxiPosition(auditedMoveResult, setRobotaxis, context);
      syncServiceOrderFromTrip(order.service_order_id, auditedMoveResult, setServiceOrders, context);
      return { success: true, resultType: "TRIP_STEPPED", message: `履约行驶 ${trip.trip_id} 步进完成`, data: { objectType: "trip", objectId: trip.trip_id } };
    }
    return { success: false, resultType: "TRIP_NO_ACTION", message: `Trip ${trip.trip_id} 无需推进`, data: { objectType: "trip", objectId: trip.trip_id, failureReason: "当前状态无需推进" } };
  }

  const auditedNextTrip = { ...nextTrip, ...getSimulationAudit(context) };
  setTrips((prev) => prev.map((t) => t.trip_id === trip.trip_id ? auditedNextTrip : t));
  updateRobotaxiPosition(auditedNextTrip, setRobotaxis, context);
  syncServiceOrderFromTrip(order.service_order_id, auditedNextTrip, setServiceOrders, context);

  return { success: true, resultType: "TRIP_ADVANCED", message: `履约行驶 ${trip.trip_id} 推进至 ${nextTrip.trip_status}`, data: { objectType: "trip", objectId: trip.trip_id } };
}

// ============================================================================
// 6. 结算
// ============================================================================

/**
 * SETTLEMENT_EXECUTE
 * 对服务订单执行结算
 */
export function handleSettlementExecute({ objectId, data, context }) {
  const { serviceOrders, trips, setServiceOrders } = data;
  const order = serviceOrders.find((o) => o.service_order_id === objectId);
  if (!order) return { success: false, message: `未找到服务订单 ${objectId}` };

  const trip = trips.find((t) => t.trip_id === order.trip_id);
  const finalPrice = order.estimated_price || 0;

  setServiceOrders((prev) => prev.map((o) => {
    if (o.service_order_id !== objectId) return o;
    return {
      ...o,
      order_status: "WAITING_PAYMENT",
      final_price: finalPrice,
      actual_distance_km: trip?.distance_traveled_km || order.estimated_distance_km,
      actual_duration_min: trip ? parseTimeElapsed(trip.time_elapsed) : order.estimated_duration_min,
      ...getSimulationAudit(context),
    };
  }));

  return { success: true, resultType: "SETTLEMENT_COMPLETED", message: `服务订单 ${objectId} 结算完成，待支付 ${finalPrice}`, data: { objectType: "serviceOrder", objectId } };
}

// ============================================================================
// 7. 支付
// ============================================================================

/**
 * PAYMENT_EXECUTE
 * 对服务订单执行支付
 */
export function handlePaymentExecute({ objectId, data, context }) {
  const { serviceOrders, setServiceOrders, setRobotaxis } = data;
  const order = serviceOrders.find((o) => o.service_order_id === objectId);
  if (!order) return { success: false, message: `未找到服务订单 ${objectId}` };

  setServiceOrders((prev) => prev.map((o) => {
    if (o.service_order_id !== objectId) return o;
    return {
      ...o,
      order_status: "COMPLETED",
      payment_status: "PAID",
      paid_amount: order.final_price || order.estimated_price || 0,
      payment_completed_at: new Date().toISOString(),
      simulation_payment_completed_at: context?.tickContext?.current_time || null,
      ...getSimulationAudit(context, { completed: true }),
    };
  }));

  // 释放 Robotaxi
  if (order.matched_robotaxi_id) {
    setRobotaxis((prev) => prev.map((r) => {
      if (r.robotaxi_id !== order.matched_robotaxi_id) return r;
      return { ...r, current_order_id: null, motion_status: "PARKED", ...getSimulationAudit(context) };
    }));
  }

  return { success: true, resultType: "PAYMENT_COMPLETED", message: `服务订单 ${objectId} 支付完成`, data: { objectType: "serviceOrder", objectId } };
}

// ============================================================================
// 8-14. 供给侧：准入 + 投放 + 行驶执行
// ============================================================================

/**
 * READINESS_TASK_CREATE
 * 创建准入任务
 */
export function handleReadinessTaskCreate({ data, context }) {
  const { robotaxis, setRobotaxis, setReadinessTasks } = data;
  const taskId = nextSimulationBusinessId("TASK-RC");
  const candidate = (robotaxis || []).find((r) => r.availability_status === "PENDING_INSPECTION" && !r.current_task_id);
  if (!candidate) {
    return {
      success: false,
      resultType: "NO_CANDIDATE_ROBOTAXI",
      message: "准入任务创建失败：没有待准入 Robotaxi",
      data: { objectType: "readinessTask", objectId: null, failureReason: "没有待准入 Robotaxi" },
    };
  }
  const newTask = {
    task_id: taskId, task_type: "READINESS_CHECK",
    task_status: "WAITING_ASSIGNMENT",
    robotaxi_id: candidate?.robotaxi_id || null,
    deployment_task_id: null, route_execution_id: null,
    created_at: new Date().toISOString(),
    ...getSimulationAudit(context, { created: true }),
  };
  setReadinessTasks((prev) => [newTask, ...prev]);
  setRobotaxis((prev) => prev.map((r) => r.robotaxi_id === candidate.robotaxi_id ? { ...r, current_task_id: taskId, current_task_type: "READINESS_CHECK", current_task_status: "WAITING_ASSIGNMENT", ...getSimulationAudit(context) } : r));
  return { success: true, resultType: "READINESS_CREATED", message: `准入任务 ${taskId} 已创建`, data: { objectType: "readinessTask", objectId: taskId, robotaxiId: candidate.robotaxi_id } };
}

/**
 * DEPLOYMENT_TASK_CREATE
 * 创建投放任务，同步创建 RouteExecution 子单据
 */
export function handleDeploymentTaskCreate({ data, context }) {
  const { deploymentTasks, routeExecutions, setDeploymentTasks, setRouteExecutions, setRobotaxis, data: appData } = data;
  const dtId = nextSimulationBusinessId("TASK-DP");
  const reId = nextSimulationBusinessId("REX");
  const candidate = (appData.robotaxis || []).find((r) => r.availability_status === "AVAILABLE" && !r.current_task_id && !r.current_order_id);
  if (!candidate) return { success: false, resultType: "NO_CANDIDATE_ROBOTAXI", message: "投放任务创建失败：无可投放 Robotaxi", data: { objectType: "deploymentTask", objectId: null, failureReason: "无可投放 Robotaxi" } };

  const dt = {
    task_id: dtId, task_type: "DEPLOYMENT",
    task_status: "WAITING_START",
    robotaxi_id: candidate.robotaxi_id,
    route_execution_id: reId,
    created_at: new Date().toISOString(),
    ...getSimulationAudit(context, { created: true }),
  };
  const re = {
    route_execution_id: reId,
    deployment_task_id: dtId,
    robotaxi_id: candidate.robotaxi_id,
    execution_status: "WAITING_ROUTE",
    current_cell_id: candidate.current_cell_id,
    created_at: new Date().toISOString(),
    ...getSimulationAudit(context, { created: true }),
  };
  setDeploymentTasks((prev) => [dt, ...prev]);
  setRouteExecutions((prev) => [re, ...prev]);
  setRobotaxis((prev) => prev.map((r) => r.robotaxi_id === candidate.robotaxi_id ? { ...r, current_task_id: dtId, ...getSimulationAudit(context) } : r));
  return { success: true, resultType: "DEPLOYMENT_CREATED", message: `投放任务 ${dtId} 已创建，关联 RouteExecution ${reId}`, data: { objectType: "deploymentTask", objectId: dtId, routeExecutionId: reId } };
}

/**
 * READINESS_TASK_ASSIGN
 * 自动分配 Worker 到准入任务
 */
export function handleReadinessTaskAssign({ objectId, data, context }) {
  const { readinessTasks, setReadinessTasks, setRobotaxis, data: appData } = data;
  const task = readinessTasks.find((t) => t.task_id === objectId);
  if (!task) return { success: false, resultType: "READINESS_ASSIGN_FAILED", message: `未找到准入任务 ${objectId}`, data: { objectType: "readinessTask", objectId, failureReason: "未找到准入任务" } };

  const worker = (appData.workers || [])[0];
  if (!worker) return { success: false, resultType: "READINESS_ASSIGN_FAILED", message: "准入任务分配失败：无可用作业人员", data: { objectType: "readinessTask", objectId, failureReason: "无可用作业人员" } };

  setReadinessTasks((prev) => prev.map((t) => {
    if (t.task_id !== objectId) return t;
    return { ...t, task_status: "WAITING_CHECK", assigned_worker_id: worker.worker_id, ...getSimulationAudit(context) };
  }));
  if (task.robotaxi_id) {
    setRobotaxis((prev) => prev.map((r) => r.robotaxi_id === task.robotaxi_id ? { ...r, current_task_status: "WAITING_CHECK", ...getSimulationAudit(context) } : r));
  }

  return { success: true, resultType: "READINESS_ASSIGNED", message: `准入任务 ${objectId} 已分配给 ${worker.worker_id}`, data: { objectType: "readinessTask", objectId, workerId: worker.worker_id } };
}

/**
 * READINESS_TASK_START
 * 自动开始准入检查
 */
export function handleReadinessTaskStart({ objectId, data, context }) {
  const { readinessTasks, setReadinessTasks, setRobotaxis } = data;
  const task = readinessTasks.find((t) => t.task_id === objectId);
  if (!task) return { success: false, resultType: "READINESS_START_FAILED", message: `未找到准入任务 ${objectId}`, data: { objectType: "readinessTask", objectId, failureReason: "未找到准入任务" } };

  setReadinessTasks((prev) => prev.map((t) => {
    if (t.task_id !== objectId) return t;
    return { ...t, task_status: "CHECKING", ...getSimulationAudit(context) };
  }));
  if (task.robotaxi_id) {
    setRobotaxis((prev) => prev.map((r) => r.robotaxi_id === task.robotaxi_id ? { ...r, availability_status: "IN_INSPECTION", current_task_status: "CHECKING", ...getSimulationAudit(context) } : r));
  }

  return { success: true, resultType: "READINESS_STARTED", message: `准入任务 ${objectId} 检查中`, data: { objectType: "readinessTask", objectId } };
}

/**
 * READINESS_TASK_PASS
 * 自动通过准入检查
 */
export function handleReadinessTaskPass({ objectId, data, context }) {
  const { readinessTasks, setReadinessTasks, setRobotaxis } = data;
  const task = readinessTasks.find((t) => t.task_id === objectId);
  if (!task) return { success: false, resultType: "READINESS_PASS_FAILED", message: `未找到准入任务 ${objectId}`, data: { objectType: "readinessTask", objectId, failureReason: "未找到准入任务" } };

  setReadinessTasks((prev) => prev.map((t) => {
    if (t.task_id !== objectId) return t;
    return { ...t, task_status: "COMPLETED", check_result: "PASSED", completed_at: new Date().toISOString(), ...getSimulationAudit(context, { completed: true }) };
  }));
  if (task.robotaxi_id) {
    setRobotaxis((prev) => prev.map((r) => r.robotaxi_id === task.robotaxi_id ? {
      ...r,
      availability_status: "AVAILABLE",
      available_for_dispatch: true,
      current_task_id: null,
      current_task_type: null,
      current_task_status: null,
      ...getSimulationAudit(context),
    } : r));
  }

  return { success: true, resultType: "READINESS_PASSED", message: `准入任务 ${objectId} 已通过`, data: { objectType: "readinessTask", objectId, robotaxiId: task.robotaxi_id } };
}

/**
 * ROUTE_PLAN
 * 自动规划行驶路径
 */
export function handleRoutePlan({ objectId, data, context }) {
  if (context?.action?.objectType === "trip") {
    return handleTripStepExecute({ objectId, data, context });
  }
  const { deploymentTasks, routeExecutions, setDeploymentTasks, setRouteExecutions } = data;
  const re = routeExecutions.find((r) => r.route_execution_id === objectId || r.deployment_task_id === objectId);
  if (!re) return { success: false, resultType: "ROUTE_PLAN_FAILED", message: `未找到行驶执行 ${objectId}`, data: { objectType: "routeExecution", objectId, failureReason: "未找到行驶执行" } };

  setRouteExecutions((prev) => prev.map((r) => {
    if (r.route_execution_id !== re.route_execution_id) return r;
    return { ...r, execution_status: "MOVING", planned_route_id: nextSimulationBusinessId("ROUTE", context), current_step_index: 0, ...getSimulationAudit(context) };
  }));
  if (re.deployment_task_id) {
    setDeploymentTasks((prev) => prev.map((task) => {
      if (task.task_id !== re.deployment_task_id) return task;
      return { ...task, task_status: "MOVING", ...getSimulationAudit(context) };
    }));
  }

  return { success: true, resultType: "ROUTE_PLANNED", message: `行驶执行 ${re.route_execution_id} 路径已规划`, data: { objectType: "routeExecution", objectId: re.route_execution_id, taskId: re.deployment_task_id } };
}

/**
 * ROUTE_EXECUTION_STEP
 * 自动推进行驶执行一步
 */
export function handleRouteExecutionStep({ objectId, data, context }) {
  const { deploymentTasks, routeExecutions, setDeploymentTasks, setRouteExecutions, setRobotaxis } = data;
  const re = routeExecutions.find((r) => r.route_execution_id === objectId || r.deployment_task_id === objectId);
  if (!re) return { success: false, resultType: "ROUTE_STEP_FAILED", message: `未找到行驶执行 ${objectId}`, data: { objectType: "routeExecution", objectId, failureReason: "未找到行驶执行" } };

  setRouteExecutions((prev) => prev.map((r) => {
    if (r.route_execution_id !== re.route_execution_id) return r;
    return { ...r, execution_status: "ARRIVED", current_step_index: (r.current_step_index || 0) + 1, ...getSimulationAudit(context) };
  }));
  if (re.deployment_task_id) {
    setDeploymentTasks((prev) => prev.map((task) => {
      if (task.task_id !== re.deployment_task_id) return task;
      return { ...task, task_status: "ARRIVED", ...getSimulationAudit(context) };
    }));
  }

  if (re.robotaxi_id) {
    setRobotaxis((prev) => prev.map((rb) => {
      if (rb.robotaxi_id !== re.robotaxi_id) return rb;
      return { ...rb, current_cell_id: re.target_cell_id || rb.current_cell_id, motion_status: "MOVING", ...getSimulationAudit(context) };
    }));
  }

  return { success: true, resultType: "ROUTE_STEPPED", message: `行驶执行 ${re.route_execution_id} 步进完成`, data: { objectType: "routeExecution", objectId: re.route_execution_id, taskId: re.deployment_task_id, robotaxiId: re.robotaxi_id } };
}

/**
 * ARRIVAL_CONFIRM
 * 自动确认到达
 */
export function handleArrivalConfirm({ objectId, data, context }) {
  const { deploymentTasks, routeExecutions, setDeploymentTasks, setRouteExecutions, setRobotaxis } = data;
  const re = routeExecutions.find((r) => r.route_execution_id === objectId || r.deployment_task_id === objectId);
  if (!re) return { success: false, resultType: "ARRIVAL_CONFIRM_FAILED", message: `未找到行驶执行 ${objectId}`, data: { objectType: "routeExecution", objectId, failureReason: "未找到行驶执行" } };

  setRouteExecutions((prev) => prev.map((r) => {
    if (r.route_execution_id !== re.route_execution_id) return r;
    return { ...r, execution_status: "COMPLETED", arrival_confirmed: true, completed_at: new Date().toISOString(), ...getSimulationAudit(context, { completed: true }) };
  }));
  if (re.deployment_task_id) {
    setDeploymentTasks((prev) => prev.map((task) => {
      if (task.task_id !== re.deployment_task_id) return task;
      return { ...task, task_status: "COMPLETED", completed_at: new Date().toISOString(), ...getSimulationAudit(context, { completed: true }) };
    }));
  }

  if (re.robotaxi_id) {
    setRobotaxis((prev) => prev.map((rb) => {
      if (rb.robotaxi_id !== re.robotaxi_id) return rb;
      return { ...rb, current_task_id: null, motion_status: "PARKED", ...getSimulationAudit(context) };
    }));
  }

  return { success: true, resultType: "ARRIVAL_CONFIRMED", message: `行驶执行 ${re.route_execution_id} 到达确认`, data: { objectType: "routeExecution", objectId: re.route_execution_id, taskId: re.deployment_task_id, robotaxiId: re.robotaxi_id } };
}

// ============================================================================
// 辅助函数
// ============================================================================

function createServiceOrderFromDemandResult(dsResult, orderChannel, appData, context) {
  return {
    service_order_id: nextSimulationBusinessId("SO", context),
    order_channel: orderChannel,
    customer_id: dsResult.customer_id,
    demand_simulation_run_id: dsResult.demand_simulation_run_id,
    demand_simulation_result_id: dsResult.demand_simulation_result_id,
    customer_origin_location_type: dsResult.customer_origin_location_type,
    customer_origin_place_id: dsResult.customer_origin_place_id || null,
    customer_origin_road_segment_id: dsResult.customer_origin_road_segment_id || null,
    customer_origin_cell_id: dsResult.customer_origin_cell_id,
    pickup_service_area_id: dsResult.pickup_service_area_id,
    pickup_cell_id: dsResult.pickup_cell_id,
    dropoff_service_area_id: dsResult.dropoff_service_area_id,
    dropoff_cell_id: dsResult.dropoff_cell_id,
    order_status: "WAITING_PRICE_ESTIMATE",
    payment_status: "UNPAID",
    estimated_price: null,
    quoted_price: null,
    final_price: null,
    created_at: new Date().toISOString(),
    ...getSimulationAudit(context, { created: true }),
  };
}

function createTripForOrderSimple(order, appData, context) {
  return {
    trip_id: nextSimulationBusinessId("TRIP"),
    service_order_id: order.service_order_id,
    robotaxi_id: order.matched_robotaxi_id,
    pickup_service_area_id: order.pickup_service_area_id,
    pickup_cell_id: order.pickup_cell_id,
    dropoff_service_area_id: order.dropoff_service_area_id,
    dropoff_cell_id: order.dropoff_cell_id,
    current_cell_id: order.pickup_cell_id,
    current_step_index: 0,
    total_step_count: 4,
    distance_traveled_km: 0,
    distance_remaining_km: order.estimated_distance_km || 1.5,
    time_elapsed: "0:00",
    trip_status: "WAITING_ROUTE",
    trip_phase: "PICKUP",
    created_at: new Date().toISOString(),
    ...getSimulationAudit(context, { created: true }),
  };
}

function syncServiceOrderFromTrip(serviceOrderId, trip, setServiceOrders, context) {
  const orderStatusByTripStatus = {
    ON_THE_WAY_PICKUP: "ON_THE_WAY_PICKUP",
    WAITING_CUSTOMER_BOARDING: "WAITING_CUSTOMER_BOARDING",
    CUSTOMER_ONBOARD: "CUSTOMER_ONBOARD",
    ON_THE_WAY_DESTINATION: "ON_THE_WAY_DESTINATION",
    ARRIVED_DESTINATION: "ARRIVED_DESTINATION",
    COMPLETED: "SETTLING",
  };
  const orderStatus = orderStatusByTripStatus[trip.trip_status];
  if (!orderStatus) return;
  setServiceOrders((prev) => prev.map((order) => order.service_order_id === serviceOrderId ? {
    ...order,
    order_status: orderStatus,
    actual_distance_km: trip.distance_traveled_km,
    actual_duration_min: parseTimeElapsed(trip.time_elapsed),
    ...getSimulationAudit(context),
  } : order));
}

function updateRobotaxiPosition(trip, setRobotaxis, context) {
  if (!trip?.robotaxi_id || !trip?.current_cell_id) return;
  setRobotaxis((prev) => prev.map((r) => {
    if (r.robotaxi_id !== trip.robotaxi_id) return r;
    return { ...r, current_cell_id: trip.current_cell_id, motion_status: trip.trip_status === "COMPLETED" ? "PARKED" : "MOVING", ...getSimulationAudit(context) };
  }));
}

function pickRandomDistance(context) { return +(1 + deterministicFraction(context, "distance") * 4).toFixed(2); }
function pickRandomDuration(context) { return Math.floor(5 + deterministicFraction(context, "duration") * 20); }
function deterministicFraction(context, salt) {
  const source = `${context?.simulationRunId || "SIM"}-${context?.globalTick || 0}-${context?.actionIndex || 0}-${salt}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}
function parseTimeElapsed(elapsed) {
  if (!elapsed) return 0;
  const parts = elapsed.split(":");
  return parseInt(parts[0] || "0") * 60 + parseInt(parts[1] || "0");
}
