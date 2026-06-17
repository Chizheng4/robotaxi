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

/**
 * SERVICE_ORDER_CREATE
 * 根据需求模拟策略生成一条服务订单
 */
export function handleServiceOrderCreate({ data, context }) {
  const { demandSimulationEngine, serviceOrderService, data: appData, serviceOrders, setServiceOrders } = data;
  const policy = context.policySnapshot;

  if (!demandSimulationEngine || !appData) {
    return { success: false, message: "缺少需求模拟引擎或数据上下文" };
  }

  // 运行需求模拟
  const dsResult = demandSimulationEngine.runDemandSimulation({
    strategy: appData.demandSimulationStrategies?.[0],
    data: appData,
    customers: appData.customers,
  });

  if (!dsResult || dsResult.simulation_result !== "SUCCESS") {
    return { success: false, message: "需求模拟失败：" + (dsResult?.failure_reason || "未知原因") };
  }

  // 创建服务订单
  const orderChannel = dsResult.order_channel || "OWN_APP_SIMULATED_ORDER";
  const newOrder = createServiceOrderFromDemandResult(dsResult, orderChannel, appData);

  setServiceOrders((prev) => [newOrder, ...prev]);

  return {
    success: true,
    resultType: "ORDER_CREATED",
    message: `服务订单 ${newOrder.service_order_id} 已创建`,
    data: { serviceOrderId: newOrder.service_order_id },
  };
}

// ============================================================================
// 2. 订单侧：定价
// ============================================================================

/**
 * PRICING_EXECUTE
 * 对服务订单执行价格预估
 */
export function handlePricingExecute({ objectId, data }) {
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
      estimated_distance_km: pickRandomDistance(),
      estimated_duration_min: pickRandomDuration(),
    };
  }

  const runId = `SPR-${String(Date.now()).slice(-6)}`;
  const decisionId = `SPD-${String(Date.now()).slice(-6)}`;

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
    return { success: false, message: result.failureReason || "定价失败" };
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
    };
  }));

  if (result.run) setPricingStrategyRuns((prev) => [result.run, ...prev]);
  if (result.decision) setPricingDecisions((prev) => [result.decision, ...prev]);

  return { success: true, resultType: "PRICING_COMPLETED", message: `服务订单 ${objectId} 定价完成` };
}

// ============================================================================
// 3. 订单侧：客户确认
// ============================================================================

/**
 * ROBOTAXI_CALL
 * 自动客户确认，订单进入待匹配状态
 */
export function handleRobotaxiCall({ objectId, data }) {
  const { serviceOrders, setServiceOrders } = data;
  const order = serviceOrders.find((o) => o.service_order_id === objectId);
  if (!order) return { success: false, message: `未找到服务订单 ${objectId}` };

  setServiceOrders((prev) => prev.map((o) => {
    if (o.service_order_id !== objectId) return o;
    return { ...o, order_status: "WAITING_ROBOTAXI_ASSIGNMENT" };
  }));

  return { success: true, resultType: "CUSTOMER_CONFIRMED", message: `服务订单 ${objectId} 客户已确认` };
}

// ============================================================================
// 4. 订单侧：匹配
// ============================================================================

/**
 * ORDER_MATCHING_EXECUTE
 * 对服务订单执行 Robotaxi 匹配
 */
export function handleOrderMatchingExecute({ objectId, data }) {
  const { serviceOrderService: sosService, data: appData, serviceOrders, robotaxis, orderMatchingRuns, orderMatchingDecisions, setServiceOrders, setRobotaxis, setOrderMatchingRuns, setOrderMatchingDecisions } = data;
  const order = serviceOrders.find((o) => o.service_order_id === objectId);
  if (!order) return { success: false, message: `未找到服务订单 ${objectId}` };

  const strategy = appData.orderMatchingStrategies?.find((s) => s.strategy_status === "ACTIVE");
  if (!strategy) return { success: false, message: "无可用匹配策略" };

  const runId = `SMR-${String(Date.now()).slice(-6)}`;
  const decisionId = `SMD-${String(Date.now()).slice(-6)}`;

  const result = sosService.executeOrderMatching({
    strategy,
    serviceOrder: order,
    data: appData,
    orderMatchingRunId: runId,
    orderMatchingDecisionId: decisionId,
    createdAt: new Date().toISOString(),
  });

  if (!result.success) {
    setServiceOrders((prev) => prev.map((o) => {
      if (o.service_order_id !== objectId) return o;
      return { ...o, order_status: "MATCH_FAILED" };
    }));
    return { success: false, message: result.failureReason || "匹配失败" };
  }

  const robotaxiId = result.decision?.selected_robotaxi_id;

  // 更新订单
  setServiceOrders((prev) => prev.map((o) => {
    if (o.service_order_id !== objectId) return o;
    return {
      ...o,
      order_status: "VEHICLE_ASSIGNED",
      matched_robotaxi_id: robotaxiId,
      order_matching_decision_id: decisionId,
      matched_at: new Date().toISOString(),
    };
  }));

  // 更新 Robotaxi
  if (robotaxiId) {
    setRobotaxis((prev) => prev.map((r) => {
      if (r.robotaxi_id !== robotaxiId) return r;
      return { ...r, current_order_id: objectId, motion_status: "STOPPED" };
    }));
  }

  if (result.run) setOrderMatchingRuns((prev) => [result.run, ...prev]);
  if (result.decision) setOrderMatchingDecisions((prev) => [result.decision, ...prev]);

  return { success: true, resultType: "MATCHING_COMPLETED", message: `服务订单 ${objectId} 匹配成功，Robotaxi: ${robotaxiId}` };
}

// ============================================================================
// 5. 履约侧：Trip 推进
// ============================================================================

/**
 * TRIP_STEP_EXECUTE
 * 推进 Trip 到下一状态（创建或步进）
 */
export function handleTripStepExecute({ objectId, data }) {
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
    trip = createTripForOrderSimple(order, appData);
    setTrips((prev) => [trip, ...prev]);
    setServiceOrders((prev) => prev.map((o) => {
      if (o.service_order_id !== objectId) return o;
      return { ...o, trip_id: trip.trip_id };
    }));
    return { success: true, resultType: "TRIP_CREATED", message: `履约行驶 ${trip.trip_id} 已创建` };
  }

  // 推进 Trip 状态
  const nextTrip = tripService.getNextTripState(trip);
  if (!nextTrip) {
    // 尝试步进
    const moveResult = tripService.getNextTripMovementState(trip, appData);
    if (moveResult) {
      setTrips((prev) => prev.map((t) => t.trip_id === trip.trip_id ? moveResult : t));
      updateRobotaxiPosition(moveResult, setRobotaxis);
      return { success: true, resultType: "TRIP_STEPPED", message: `履约行驶 ${trip.trip_id} 步进完成` };
    }
    return { success: false, message: `Trip ${trip.trip_id} 无需推进` };
  }

  setTrips((prev) => prev.map((t) => t.trip_id === trip.trip_id ? nextTrip : t));
  updateRobotaxiPosition(nextTrip, setRobotaxis);

  // 如果 Trip 完成，反馈到 ServiceOrder
  if (nextTrip.trip_status === "ARRIVED_DESTINATION" || nextTrip.trip_status === "SETTLING") {
    setServiceOrders((prev) => prev.map((o) => {
      if (o.service_order_id !== objectId) return o;
      return {
        ...o,
        order_status: "ARRIVED_DESTINATION",
        actual_distance_km: nextTrip.distance_traveled_km,
        actual_duration_min: parseTimeElapsed(nextTrip.time_elapsed),
      };
    }));
  }

  return { success: true, resultType: "TRIP_ADVANCED", message: `履约行驶 ${trip.trip_id} 推进至 ${nextTrip.trip_status}` };
}

// ============================================================================
// 6. 结算
// ============================================================================

/**
 * SETTLEMENT_EXECUTE
 * 对服务订单执行结算
 */
export function handleSettlementExecute({ objectId, data }) {
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
    };
  }));

  return { success: true, resultType: "SETTLEMENT_COMPLETED", message: `服务订单 ${objectId} 结算完成，待支付 ${finalPrice}` };
}

// ============================================================================
// 7. 支付
// ============================================================================

/**
 * PAYMENT_EXECUTE
 * 对服务订单执行支付
 */
export function handlePaymentExecute({ objectId, data }) {
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
    };
  }));

  // 释放 Robotaxi
  if (order.matched_robotaxi_id) {
    setRobotaxis((prev) => prev.map((r) => {
      if (r.robotaxi_id !== order.matched_robotaxi_id) return r;
      return { ...r, current_order_id: null, motion_status: "PARKED" };
    }));
  }

  return { success: true, resultType: "PAYMENT_COMPLETED", message: `服务订单 ${objectId} 支付完成` };
}

// ============================================================================
// 8-14. 供给侧：准入 + 投放 + 行驶执行
// ============================================================================

/**
 * READINESS_TASK_CREATE
 * 创建准入任务
 */
export function handleReadinessTaskCreate({ data }) {
  const { readinessTasks, setReadinessTasks, data: appData } = data;
  const taskId = `RT-${Date.now().toString(36)}`;
  const candidate = (appData.robotaxis || []).find((r) => r.availability_status === "AVAILABLE" && !r.current_task_id);
  const newTask = {
    task_id: taskId, task_type: "READINESS_CHECK",
    task_status: "WAITING_ASSIGNMENT",
    robotaxi_id: candidate?.robotaxi_id || null,
    deployment_task_id: null, route_execution_id: null,
    created_at: new Date().toISOString(),
  };
  setReadinessTasks((prev) => [newTask, ...prev]);
  return { success: true, resultType: "READINESS_CREATED", message: `准入任务 ${taskId} 已创建` };
}

/**
 * DEPLOYMENT_TASK_CREATE
 * 创建投放任务，同步创建 RouteExecution 子单据
 */
export function handleDeploymentTaskCreate({ data }) {
  const { deploymentTasks, routeExecutions, setDeploymentTasks, setRouteExecutions, setRobotaxis, data: appData } = data;
  const dtId = `DT-${Date.now().toString(36)}`;
  const reId = `RE-${Date.now().toString(36)}`;
  const candidate = (appData.robotaxis || []).find((r) => r.availability_status === "AVAILABLE" && !r.current_task_id && !r.current_order_id);
  if (!candidate) return { success: false, resultType: "NO_CANDIDATE", message: "无可投放 Robotaxi" };

  const dt = {
    task_id: dtId, task_type: "DEPLOYMENT",
    task_status: "WAITING_ROUTE",
    robotaxi_id: candidate.robotaxi_id,
    route_execution_id: reId,
    created_at: new Date().toISOString(),
  };
  const re = {
    route_execution_id: reId,
    deployment_task_id: dtId,
    robotaxi_id: candidate.robotaxi_id,
    execution_status: "WAITING_ROUTE",
    current_cell_id: candidate.current_cell_id,
    created_at: new Date().toISOString(),
  };
  setDeploymentTasks((prev) => [dt, ...prev]);
  setRouteExecutions((prev) => [re, ...prev]);
  setRobotaxis((prev) => prev.map((r) => r.robotaxi_id === candidate.robotaxi_id ? { ...r, current_task_id: dtId } : r));
  return { success: true, resultType: "DEPLOYMENT_CREATED", message: `投放任务 ${dtId} 已创建，关联 RouteExecution ${reId}` };
}

/**
 * READINESS_TASK_ASSIGN
 * 自动分配 Worker 到准入任务
 */
export function handleReadinessTaskAssign({ objectId, data }) {
  const { readinessTasks, setReadinessTasks, data: appData } = data;
  const task = readinessTasks.find((t) => t.readiness_task_id === objectId);
  if (!task) return { success: false, message: `未找到准入任务 ${objectId}` };

  const worker = (appData.workers || [])[0];
  if (!worker) return { success: false, message: "无可用作业人员" };

  setReadinessTasks((prev) => prev.map((t) => {
    if (t.readiness_task_id !== objectId) return t;
    return { ...t, task_status: "WAITING_CHECK", assigned_worker_id: worker.worker_id };
  }));

  return { success: true, resultType: "READINESS_ASSIGNED", message: `准入任务 ${objectId} 已分配给 ${worker.worker_id}` };
}

/**
 * READINESS_TASK_START
 * 自动开始准入检查
 */
export function handleReadinessTaskStart({ objectId, data }) {
  const { readinessTasks, setReadinessTasks } = data;
  const task = readinessTasks.find((t) => t.readiness_task_id === objectId);
  if (!task) return { success: false, message: `未找到准入任务 ${objectId}` };

  setReadinessTasks((prev) => prev.map((t) => {
    if (t.readiness_task_id !== objectId) return t;
    return { ...t, task_status: "CHECKING" };
  }));

  return { success: true, resultType: "READINESS_STARTED", message: `准入任务 ${objectId} 检查中` };
}

/**
 * READINESS_TASK_PASS
 * 自动通过准入检查
 */
export function handleReadinessTaskPass({ objectId, data }) {
  const { readinessTasks, setReadinessTasks } = data;
  const task = readinessTasks.find((t) => t.readiness_task_id === objectId);
  if (!task) return { success: false, message: `未找到准入任务 ${objectId}` };

  setReadinessTasks((prev) => prev.map((t) => {
    if (t.readiness_task_id !== objectId) return t;
    return { ...t, task_status: "PASSED", check_result: "PASSED", completed_at: new Date().toISOString() };
  }));

  return { success: true, resultType: "READINESS_PASSED", message: `准入任务 ${objectId} 已通过` };
}

/**
 * ROUTE_PLAN
 * 自动规划行驶路径
 */
export function handleRoutePlan({ objectId, data }) {
  const { routeExecutions, setRouteExecutions } = data;
  const re = routeExecutions.find((r) => r.route_execution_id === objectId);
  if (!re) return { success: false, message: `未找到行驶执行 ${objectId}` };

  setRouteExecutions((prev) => prev.map((r) => {
    if (r.route_execution_id !== objectId) return r;
    return { ...r, execution_status: "WAITING_ROUTE", planned_route_id: `ROUTE-${Date.now().toString(36)}` };
  }));

  return { success: true, resultType: "ROUTE_PLANNED", message: `行驶执行 ${objectId} 路径已规划` };
}

/**
 * ROUTE_EXECUTION_STEP
 * 自动推进行驶执行一步
 */
export function handleRouteExecutionStep({ objectId, data }) {
  const { routeExecutions, setRouteExecutions, setRobotaxis } = data;
  const re = routeExecutions.find((r) => r.route_execution_id === objectId);
  if (!re) return { success: false, message: `未找到行驶执行 ${objectId}` };

  setRouteExecutions((prev) => prev.map((r) => {
    if (r.route_execution_id !== objectId) return r;
    return { ...r, execution_status: "ARRIVED", current_step_index: (r.current_step_index || 0) + 1 };
  }));

  if (re.robotaxi_id) {
    setRobotaxis((prev) => prev.map((rb) => {
      if (rb.robotaxi_id !== re.robotaxi_id) return rb;
      return { ...rb, current_cell_id: re.target_cell_id || rb.current_cell_id, motion_status: "MOVING" };
    }));
  }

  return { success: true, resultType: "ROUTE_STEPPED", message: `行驶执行 ${objectId} 步进完成` };
}

/**
 * ARRIVAL_CONFIRM
 * 自动确认到达
 */
export function handleArrivalConfirm({ objectId, data }) {
  const { routeExecutions, setRouteExecutions, setRobotaxis } = data;
  const re = routeExecutions.find((r) => r.route_execution_id === objectId);
  if (!re) return { success: false, message: `未找到行驶执行 ${objectId}` };

  setRouteExecutions((prev) => prev.map((r) => {
    if (r.route_execution_id !== objectId) return r;
    return { ...r, execution_status: "COMPLETED", arrival_confirmed: true, completed_at: new Date().toISOString() };
  }));

  if (re.robotaxi_id) {
    setRobotaxis((prev) => prev.map((rb) => {
      if (rb.robotaxi_id !== re.robotaxi_id) return rb;
      return { ...rb, motion_status: "PARKED" };
    }));
  }

  return { success: true, resultType: "ARRIVAL_CONFIRMED", message: `行驶执行 ${objectId} 到达确认` };
}

// ============================================================================
// 辅助函数
// ============================================================================

function createServiceOrderFromDemandResult(dsResult, orderChannel, appData) {
  const seq = Date.now();
  return {
    service_order_id: `SO-${String(seq).slice(-6)}`,
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
    order_status: "CREATED",
    payment_status: "UNPAID",
    estimated_price: null,
    quoted_price: null,
    final_price: null,
    created_at: new Date().toISOString(),
  };
}

function createTripForOrderSimple(order, appData) {
  const seq = Date.now();
  return {
    trip_id: `TP-${String(seq).slice(-6)}`,
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
    trip_status: "PENDING",
    trip_phase: "PICKUP",
    created_at: new Date().toISOString(),
  };
}

function updateRobotaxiPosition(trip, setRobotaxis) {
  if (!trip?.robotaxi_id || !trip?.current_cell_id) return;
  setRobotaxis((prev) => prev.map((r) => {
    if (r.robotaxi_id !== trip.robotaxi_id) return r;
    return { ...r, current_cell_id: trip.current_cell_id, motion_status: trip.trip_status === "COMPLETED" ? "PARKED" : "MOVING" };
  }));
}

function pickRandomDistance() { return +(1 + Math.random() * 4).toFixed(2); }
function pickRandomDuration() { return Math.floor(5 + Math.random() * 20); }
function parseTimeElapsed(elapsed) {
  if (!elapsed) return 0;
  const parts = elapsed.split(":");
  return parseInt(parts[0] || "0") * 60 + parseInt(parts[1] || "0");
}
