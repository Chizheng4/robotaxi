import * as pricingTypes from "../domain/pricingTypes.js";
import * as serviceOrderTypes from "../domain/serviceOrderTypes.js";
import * as taskTypes from "../domain/taskTypes.js";
import * as tripTypes from "../domain/tripTypes.js";
import { runDemandSimulation } from "../data/demandSimulationEngine.js";
import * as serviceOrderSettlement from "../domain/serviceOrderSettlement.js";
import * as routePlanningService from "./routePlanningService.js";
import * as serviceOrderService from "./serviceOrderService.js";
import * as tripService from "./tripService.js";

export function createReadinessTask({ state, runtime }) {
  const appData = dataView(state);
  const candidate = (state.robotaxis || appData.robotaxis || []).find((robotaxi) =>
    robotaxi.availability_status === "PENDING_INSPECTION" && !robotaxi.current_task_id
  );
  if (!candidate) return failure("NO_CANDIDATE_ROBOTAXI", "准入任务创建失败：没有待准入 Robotaxi", "readinessTask", null, "没有待准入 Robotaxi");
  const taskId = runtime.nextId("TASK-RC");
  const task = {
    task_id: taskId,
    task_type: taskTypes.TaskType.READINESS_CHECK,
    task_status: taskTypes.ReadinessTaskStatus.WAITING_ASSIGNMENT,
    robotaxi_id: candidate.robotaxi_id,
    deployment_task_id: null,
    route_execution_id: null,
    created_at: runtime.now(),
    ...runtime.audit({ created: true }),
  };
  return success("READINESS_CREATED", `准入任务 ${taskId} 已创建`, { objectType: "readinessTask", objectId: taskId, robotaxiId: candidate.robotaxi_id }, {
    readinessTasks: [task, ...(state.readinessTasks || [])],
    robotaxis: replaceById(state.robotaxis || [], "robotaxi_id", candidate.robotaxi_id, (robotaxi) => ({
      ...robotaxi,
      current_task_id: taskId,
      current_task_type: taskTypes.TaskType.READINESS_CHECK,
      current_task_status: taskTypes.ReadinessTaskStatus.WAITING_ASSIGNMENT,
      ...runtime.audit(),
    })),
  });
}

export function assignReadinessTask({ state, objectId, runtime }) {
  const appData = dataView(state);
  const task = (state.readinessTasks || []).find((item) => item.task_id === objectId);
  if (!task) return failure("READINESS_ASSIGN_FAILED", `未找到准入任务 ${objectId}`, "readinessTask", objectId, "未找到准入任务");
  const worker = (appData.workers || []).find((item) => item.worker_status === "IDLE") || (appData.workers || [])[0];
  if (!worker) return failure("READINESS_ASSIGN_FAILED", "准入任务分配失败：无可用作业人员", "readinessTask", objectId, "无可用作业人员");
  return success("READINESS_ASSIGNED", `准入任务 ${objectId} 已分配给 ${worker.worker_id}`, { objectType: "readinessTask", objectId, workerId: worker.worker_id }, {
    readinessTasks: replaceById(state.readinessTasks || [], "task_id", objectId, (item) => ({
      ...item,
      task_status: taskTypes.ReadinessTaskStatus.WAITING_CHECK,
      worker_id: worker.worker_id,
      assigned_worker_id: worker.worker_id,
      assigned_at: runtime.now(),
      ...runtime.audit(),
    })),
    robotaxis: replaceById(state.robotaxis || [], "robotaxi_id", task.robotaxi_id, (robotaxi) => ({
      ...robotaxi,
      current_task_status: taskTypes.ReadinessTaskStatus.WAITING_CHECK,
      ...runtime.audit(),
    })),
  });
}

export function startReadinessTask({ state, objectId, runtime }) {
  const task = (state.readinessTasks || []).find((item) => item.task_id === objectId);
  if (!task) return failure("READINESS_START_FAILED", `未找到准入任务 ${objectId}`, "readinessTask", objectId, "未找到准入任务");
  return success("READINESS_STARTED", `准入任务 ${objectId} 检查中`, { objectType: "readinessTask", objectId }, {
    readinessTasks: replaceById(state.readinessTasks || [], "task_id", objectId, (item) => ({
      ...item,
      task_status: taskTypes.ReadinessTaskStatus.CHECKING,
      started_at: item.started_at || runtime.now(),
      ...runtime.audit(),
    })),
    robotaxis: replaceById(state.robotaxis || [], "robotaxi_id", task.robotaxi_id, (robotaxi) => ({
      ...robotaxi,
      availability_status: "IN_INSPECTION",
      current_task_status: taskTypes.ReadinessTaskStatus.CHECKING,
      ...runtime.audit(),
    })),
  });
}

export function passReadinessTask({ state, objectId, runtime }) {
  const task = (state.readinessTasks || []).find((item) => item.task_id === objectId);
  if (!task) return failure("READINESS_PASS_FAILED", `未找到准入任务 ${objectId}`, "readinessTask", objectId, "未找到准入任务");
  return success("READINESS_PASSED", `准入任务 ${objectId} 已通过`, { objectType: "readinessTask", objectId, robotaxiId: task.robotaxi_id }, {
    readinessTasks: replaceById(state.readinessTasks || [], "task_id", objectId, (item) => ({
      ...item,
      task_status: taskTypes.ReadinessTaskStatus.COMPLETED,
      check_result: "PASSED",
      completed_at: runtime.now(),
      ...runtime.audit({ completed: true }),
    })),
    robotaxis: replaceById(state.robotaxis || [], "robotaxi_id", task.robotaxi_id, (robotaxi) => ({
      ...robotaxi,
      availability_status: "AVAILABLE",
      available_for_dispatch: true,
      current_task_id: null,
      current_task_type: null,
      current_task_status: null,
      ...runtime.audit(),
    })),
  });
}

export function createDeploymentTask({ state, runtime }) {
  const appData = dataView(state);
  const candidate = (state.robotaxis || appData.robotaxis || []).find((robotaxi) =>
    robotaxi.availability_status === "AVAILABLE" && !robotaxi.current_task_id && !robotaxi.current_order_id
  );
  if (!candidate) return failure("NO_CANDIDATE_ROBOTAXI", "投放任务创建失败：无可投放 Robotaxi", "deploymentTask", null, "无可投放 Robotaxi");
  const target = routePlanningService.getDefaultDeploymentTarget(appData, {
    originCellId: candidate.current_cell_id,
    seed: `${candidate.robotaxi_id}-${runtime.now()}`,
  });
  if (!target?.target_cell_id) return failure("NO_DEPLOYMENT_TARGET", "投放任务创建失败：无可用投放目标", "deploymentTask", null, "无可用投放目标");

  const taskId = runtime.nextId("TASK-DP");
  const executionId = runtime.nextId("REX");
  const task = {
    task_id: taskId,
    task_type: taskTypes.TaskType.DEPLOYMENT,
    task_status: taskTypes.DeploymentTaskStatus.WAITING_START,
    task_priority: taskTypes.TaskPriority.LOW,
    trigger_type: taskTypes.TriggerType.AUTO,
    source_type: taskTypes.TaskSourceType.SUPPLY_ADJUSTMENT_PLAN,
    robotaxi_id: candidate.robotaxi_id,
    route_execution_id: executionId,
    origin_cell_id: candidate.current_cell_id,
    planned_target_zone_id: target.target_zone_id,
    planned_target_service_area_id: target.target_service_area_id,
    planned_target_cell_id: target.target_cell_id,
    target_zone_id: target.target_zone_id,
    target_service_area_id: target.target_service_area_id,
    target_cell_id: target.target_cell_id,
    route_id: null,
    route_strategy_id: null,
    arrival_behavior: taskTypes.ArrivalBehavior.AUTO_BY_SERVICE_AREA,
    blocked_handling_policy: taskTypes.BlockedHandlingPolicy.SAME_SERVICE_AREA_RETRY,
    interruptible: true,
    created_at: runtime.now(),
    ...runtime.audit({ created: true }),
  };
  const execution = {
    route_execution_id: executionId,
    task_id: taskId,
    task_type: taskTypes.TaskType.DEPLOYMENT,
    deployment_task_id: taskId,
    robotaxi_id: candidate.robotaxi_id,
    execution_status: taskTypes.RouteExecutionStatus.WAITING_ROUTE,
    origin_cell_id: candidate.current_cell_id,
    current_cell_id: candidate.current_cell_id,
    target_zone_id: target.target_zone_id,
    target_service_area_id: target.target_service_area_id,
    target_cell_id: target.target_cell_id,
    planned_target_zone_id: target.target_zone_id,
    planned_target_service_area_id: target.target_service_area_id,
    planned_target_cell_id: target.target_cell_id,
    route_id: null,
    route_strategy_id: null,
    route_cell_ids: [],
    current_step_index: 0,
    total_step_count: 0,
    total_distance_km: 0,
    distance_traveled_km: 0,
    distance_remaining_km: 0,
    time_elapsed: "0",
    battery_consumed_percent: 0,
    created_at: runtime.now(),
    ...runtime.audit({ created: true }),
  };
  return success("DEPLOYMENT_CREATED", `投放任务 ${taskId} 已创建，关联 RouteExecution ${executionId}`, { objectType: "deploymentTask", objectId: taskId, routeExecutionId: executionId }, {
    deploymentTasks: [task, ...(state.deploymentTasks || [])],
    routeExecutions: [execution, ...(state.routeExecutions || [])],
    robotaxis: replaceById(state.robotaxis || [], "robotaxi_id", candidate.robotaxi_id, (robotaxi) => ({
      ...robotaxi,
      current_task_id: taskId,
      current_task_type: taskTypes.TaskType.DEPLOYMENT,
      current_task_status: taskTypes.DeploymentTaskStatus.WAITING_START,
      ...runtime.audit(),
    })),
  });
}

export function executeRoutePlanning({ state, objectType, objectId, runtime }) {
  if (objectType === "trip") return planTripRoute({ state, objectId, runtime });
  const appData = dataView(state);
  const execution = (state.routeExecutions || []).find((item) => item.route_execution_id === objectId || item.deployment_task_id === objectId);
  if (!execution) return failure("ROUTE_PLAN_FAILED", `未找到行驶执行 ${objectId}`, "routeExecution", objectId, "未找到行驶执行");
  const task = (state.deploymentTasks || []).find((item) => item.task_id === execution.deployment_task_id || item.task_id === execution.task_id);
  if (!task) return failure("ROUTE_PLAN_FAILED", `未找到投放任务 ${execution.deployment_task_id || execution.task_id}`, "routeExecution", execution.route_execution_id, "未找到投放任务");

  const plan = routePlanningService.planDeploymentRoute({
    execution,
    task,
    data: appData,
    routeId: runtime.nextId("DRT"),
    routePlanningRunId: runtime.nextId("RPR"),
  });
  const updates = {
    routePlanningRuns: [{ ...plan.routePlanningRun, ...runtime.audit({ created: true }) }, ...(state.routePlanningRuns || [])],
    routeExecutions: replaceById(state.routeExecutions || [], "route_execution_id", execution.route_execution_id, { ...plan.execution, ...runtime.audit() }),
    deploymentTasks: replaceById(state.deploymentTasks || [], "task_id", task.task_id, { ...plan.task, ...runtime.audit() }),
  };
  if (plan.route) {
    updates.routes = [plan.route, ...(state.routes || [])];
    updates.robotaxis = replaceById(state.robotaxis || [], "robotaxi_id", execution.robotaxi_id, (robotaxi) => ({
      ...robotaxi,
      current_route_id: plan.route.route_id,
      current_task_id: task.task_id,
      current_task_type: taskTypes.TaskType.DEPLOYMENT,
      current_task_status: taskTypes.DeploymentTaskStatus.MOVING,
      motion_status: "MOVING",
      ...runtime.audit(),
    }));
  }
  if (!plan.route) {
    return failure("ROUTE_PLAN_FAILED", `行驶执行 ${execution.route_execution_id} 路径规划失败`, "routeExecution", execution.route_execution_id, plan.routePlanningRun.failure_reason, updates);
  }
  return success("ROUTE_PLANNED", `行驶执行 ${execution.route_execution_id} 路径已规划，生成路径 ${plan.route.route_id}`, { objectType: "routeExecution", objectId: execution.route_execution_id, taskId: task.task_id, routeId: plan.route.route_id }, updates);
}

export function advanceRouteExecution({ state, objectId, runtime }) {
  const appData = dataView(state);
  const execution = (state.routeExecutions || []).find((item) => item.route_execution_id === objectId || item.deployment_task_id === objectId);
  if (!execution) return failure("ROUTE_STEP_FAILED", `未找到行驶执行 ${objectId}`, "routeExecution", objectId, "未找到行驶执行");
  const task = (state.deploymentTasks || []).find((item) => item.task_id === execution.deployment_task_id || item.task_id === execution.task_id);
  const route = appData.routes?.find((item) => item.route_id === execution.route_id);
  const robotaxi = (state.robotaxis || appData.robotaxis || []).find((item) => item.robotaxi_id === execution.robotaxi_id);
  const step = routePlanningService.advanceRouteExecution({ execution, task, route, robotaxi });
  if (!step) return failure("ROUTE_STEP_FAILED", `行驶执行 ${execution.route_execution_id} 无法步进`, "routeExecution", execution.route_execution_id, "缺少路径或当前状态不可步进");
  return success("ROUTE_STEP_ADVANCED", `行驶执行 ${execution.route_execution_id} 已推进`, { objectType: "routeExecution", objectId: execution.route_execution_id }, {
    routeExecutions: replaceById(state.routeExecutions || [], "route_execution_id", execution.route_execution_id, { ...step.execution, ...runtime.audit() }),
    deploymentTasks: replaceById(state.deploymentTasks || [], "task_id", task.task_id, { ...step.task, ...runtime.audit() }),
    robotaxis: step.robotaxi ? replaceById(state.robotaxis || [], "robotaxi_id", robotaxi.robotaxi_id, { ...step.robotaxi, ...runtime.audit() }) : state.robotaxis,
  });
}

export function confirmRouteExecutionArrival({ state, objectId, runtime }) {
  const execution = (state.routeExecutions || []).find((item) => item.route_execution_id === objectId || item.deployment_task_id === objectId);
  if (!execution) return failure("ARRIVAL_CONFIRM_FAILED", `未找到行驶执行 ${objectId}`, "routeExecution", objectId, "未找到行驶执行");
  const task = (state.deploymentTasks || []).find((item) => item.task_id === execution.deployment_task_id || item.task_id === execution.task_id);
  const robotaxi = (state.robotaxis || []).find((item) => item.robotaxi_id === execution.robotaxi_id);
  const confirmed = routePlanningService.confirmRouteExecutionArrival({ execution, task, robotaxi });
  return success("ARRIVAL_CONFIRMED", `行驶执行 ${execution.route_execution_id} 到达确认完成`, { objectType: "routeExecution", objectId: execution.route_execution_id, taskId: task?.task_id }, {
    routeExecutions: replaceById(state.routeExecutions || [], "route_execution_id", execution.route_execution_id, { ...confirmed.execution, arrival_confirmed: true, ...runtime.audit({ completed: true }) }),
    deploymentTasks: replaceById(state.deploymentTasks || [], "task_id", task.task_id, { ...confirmed.task, ...runtime.audit({ completed: true }) }),
    robotaxis: confirmed.robotaxi ? replaceById(state.robotaxis || [], "robotaxi_id", robotaxi.robotaxi_id, { ...confirmed.robotaxi, ...runtime.audit() }) : state.robotaxis,
  });
}

export function createServiceOrder({ state, runtime }) {
  const appData = dataView(state);
  const runId = runtime.nextId("DSR");
  const demandEngine = state.demandSimulationEngine?.runDemandSimulation || runDemandSimulation;
  const demandRun = demandEngine({
    strategy: appData.demandSimulationStrategies?.[0],
    data: appData,
    customers: appData.customers,
    orderChannel: "OWN_APP_SIMULATED_ORDER",
    runId,
    randomSeed: runtime.randomSeed(),
    createdAt: runtime.now(),
  });
  if (!demandRun || demandRun.simulation_result !== "SUCCESS") {
    const failureReason = demandRun?.failure_reason || "需求模拟未返回结果";
    return failure("SERVICE_ORDER_CREATE_FAILED", `服务订单创建失败：${failureReason}`, "demandSimulationRun", demandRun?.demand_simulation_run_id || runId, failureReason, {
      demandSimulationRuns: demandRun ? [{ ...demandRun, ...runtime.audit({ created: true }) }, ...(state.demandSimulationRuns || [])] : state.demandSimulationRuns,
    });
  }
  const order = createServiceOrderFromDemandRun(demandRun, "OWN_APP_SIMULATED_ORDER", runtime);
  return success("ORDER_CREATED", `服务订单 ${order.service_order_id} 已创建`, { objectType: "serviceOrder", objectId: order.service_order_id, serviceOrderId: order.service_order_id }, {
    demandSimulationRuns: [{ ...demandRun, ...runtime.audit({ created: true }) }, ...(state.demandSimulationRuns || [])],
    serviceOrders: [order, ...(state.serviceOrders || [])],
  });
}

export function executePricing({ state, objectId, runtime }) {
  const appData = dataView(state);
  const order = (state.serviceOrders || []).find((item) => item.service_order_id === objectId);
  if (!order) return failure("PRICING_FAILED", `未找到服务订单 ${objectId}`, "serviceOrder", objectId, "未找到服务订单");
  const strategy = appData.pricingStrategies?.find((item) => item.pricing_algorithm === "BASIC_DYNAMIC_PRICING" && item.strategy_status === "ACTIVE")
    || appData.pricingStrategies?.find((item) => item.strategy_status === "ACTIVE");
  if (!strategy) return failure("PRICING_FAILED", "无可用定价策略", "serviceOrder", objectId, "无可用定价策略");

  const routePlanning = executePriceRoutePlanning({ state, order, runtime });
  const routePlanningRun = routePlanning.routePlanningRun;
  if (!routePlanning.route) {
    return failure("PRICING_FAILED", `服务订单 ${objectId} 价格预估路径失败`, "serviceOrder", objectId, routePlanningRun.failure_reason, {
      routePlanningRuns: [{ ...routePlanningRun, ...runtime.audit({ created: true }) }, ...(state.routePlanningRuns || [])],
      serviceOrders: replaceById(state.serviceOrders || [], "service_order_id", objectId, { ...order, order_status: serviceOrderTypes.ServiceOrderStatus.FAILED, failure_reason: routePlanningRun.failure_reason, ...runtime.audit() }),
    });
  }
  const pricingResult = serviceOrderService.executePricing({
    serviceOrder: order,
    strategy,
    data: appData,
    routeEstimate: {
      route_id: routePlanning.route.route_id,
      estimated_distance_km: routePlanning.route.total_distance_km ?? routePlanning.route.total_distance_m / 1000,
      estimated_duration_min: routePlanningService.calculateRouteEstimatedDurationMin(routePlanning.route),
      route_step_count: routePlanning.route.route_step_count,
      cell_travel_seconds: routePlanningService.DEFAULT_CELL_TRAVEL_SECONDS,
    },
    pricingStrategyRunId: runtime.nextId("DPR"),
    pricingDecisionId: runtime.nextId("PD"),
    createdAt: runtime.now(),
  });
  if (!pricingResult.success) {
    return failure("PRICING_FAILED", `服务订单 ${objectId} 定价失败`, "serviceOrder", objectId, pricingResult.failureReason, {
      routes: [routePlanning.route, ...(state.routes || [])],
      routePlanningRuns: [{ ...routePlanningRun, ...runtime.audit({ created: true }) }, ...(state.routePlanningRuns || [])],
      pricingStrategyRuns: pricingResult.run ? [{ ...pricingResult.run, ...runtime.audit({ created: true }) }, ...(state.pricingStrategyRuns || [])] : state.pricingStrategyRuns,
      serviceOrders: replaceById(state.serviceOrders || [], "service_order_id", objectId, { ...order, order_status: serviceOrderTypes.ServiceOrderStatus.FAILED, failure_reason: pricingResult.failureReason, ...runtime.audit() }),
    });
  }
  return success("PRICING_COMPLETED", `服务订单 ${objectId} 定价完成，生成价格预估路径 ${routePlanning.route.route_id}`, { objectType: "serviceOrder", objectId, routeId: routePlanning.route.route_id }, {
    routes: [routePlanning.route, ...(state.routes || [])],
    routePlanningRuns: [{ ...routePlanningRun, ...runtime.audit({ created: true }) }, ...(state.routePlanningRuns || [])],
    pricingStrategyRuns: [{ ...pricingResult.run, ...runtime.audit({ created: true }) }, ...(state.pricingStrategyRuns || [])],
    pricingDecisions: [{ ...pricingResult.decision, ...runtime.audit({ created: true }) }, ...(state.pricingDecisions || [])],
    serviceOrders: replaceById(state.serviceOrders || [], "service_order_id", objectId, {
      ...order,
      order_status: serviceOrderTypes.ServiceOrderStatus.WAITING_ROBOTAXI_CALL,
      estimated_pricing_decision_id: pricingResult.decision.pricing_decision_id,
      price_estimation_route_id: routePlanning.route.route_id,
      quote_base_fare: pricingResult.decision.base_fare,
      quote_distance_unit_price: pricingResult.decision.distance_unit_price,
      quote_time_unit_price: pricingResult.decision.time_unit_price,
      estimated_distance_km: pricingResult.decision.estimated_distance_km,
      estimated_duration_min: pricingResult.decision.estimated_duration_min,
      estimated_price: pricingResult.decision.estimated_price,
      quoted_price: pricingResult.decision.quoted_price,
      pricing_explanation: pricingResult.decision.pricing_explanation,
      pricing_breakdown_snapshot: pricingResult.decision.pricing_breakdown_snapshot,
      failure_reason: null,
      ...runtime.audit(),
    }),
  });
}

export function callRobotaxi({ state, objectId, runtime }) {
  const order = (state.serviceOrders || []).find((item) => item.service_order_id === objectId);
  if (!order) return failure("ROBOTAXI_CALL_FAILED", `未找到服务订单 ${objectId}`, "serviceOrder", objectId, "未找到服务订单");
  return success("CUSTOMER_CONFIRMED", `服务订单 ${objectId} 客户已确认`, { objectType: "serviceOrder", objectId }, {
    serviceOrders: replaceById(state.serviceOrders || [], "service_order_id", objectId, {
      ...order,
      order_status: serviceOrderTypes.ServiceOrderStatus.WAITING_ROBOTAXI_ASSIGNMENT,
      confirmed_at: runtime.now(),
      failure_reason: null,
      ...runtime.audit(),
    }),
  });
}

export function executeOrderMatching({ state, objectId, runtime }) {
  const appData = dataView(state);
  const order = (state.serviceOrders || []).find((item) => item.service_order_id === objectId);
  if (!order) return failure("MATCHING_FAILED", `未找到服务订单 ${objectId}`, "serviceOrder", objectId, "未找到服务订单");
  const strategy = appData.orderMatchingStrategies?.find((item) => item.strategy_status === "ACTIVE");
  if (!strategy) return failure("MATCHING_FAILED", "无可用匹配策略", "serviceOrder", objectId, "无可用匹配策略");
  const matchingResult = serviceOrderService.executeOrderMatching({
    strategy,
    serviceOrder: order,
    data: appData,
    orderMatchingRunId: runtime.nextId("OMR"),
    orderMatchingDecisionId: runtime.nextId("OMD"),
    createdAt: runtime.now(),
  });
  if (!matchingResult.success) {
    return failure("ROBOTAXI_ASSIGNMENT_FAILED", `服务订单 ${objectId} 匹配失败`, "serviceOrder", objectId, matchingResult.failureReason, {
      orderMatchingRuns: matchingResult.run ? [{ ...matchingResult.run, ...runtime.audit({ created: true }) }, ...(state.orderMatchingRuns || [])] : state.orderMatchingRuns,
      orderMatchingDecisions: matchingResult.decision ? [{ ...matchingResult.decision, ...runtime.audit({ created: true }) }, ...(state.orderMatchingDecisions || [])] : state.orderMatchingDecisions,
      serviceOrders: replaceById(state.serviceOrders || [], "service_order_id", objectId, { ...order, order_status: serviceOrderTypes.ServiceOrderStatus.ROBOTAXI_ASSIGNMENT_FAILED, failure_reason: matchingResult.failureReason, ...runtime.audit() }),
    });
  }
  const robotaxiId = matchingResult.decision.selected_robotaxi_id;
  const matchedOrder = { ...order, matched_robotaxi_id: robotaxiId };
  const trip = createTripForOrder(matchedOrder, appData, runtime);
  return success("MATCHING_COMPLETED", `服务订单 ${objectId} 匹配成功，Robotaxi: ${robotaxiId}`, { objectType: "serviceOrder", objectId, robotaxiId, tripId: trip.trip_id }, {
    orderMatchingRuns: [{ ...matchingResult.run, ...runtime.audit({ created: true }) }, ...(state.orderMatchingRuns || [])],
    orderMatchingDecisions: [{ ...matchingResult.decision, ...runtime.audit({ created: true }) }, ...(state.orderMatchingDecisions || [])],
    trips: [trip, ...(state.trips || [])],
    serviceOrders: replaceById(state.serviceOrders || [], "service_order_id", objectId, {
      ...order,
      order_status: serviceOrderTypes.ServiceOrderStatus.ON_THE_WAY_PICKUP,
      matched_robotaxi_id: robotaxiId,
      trip_id: trip.trip_id,
      order_matching_decision_id: matchingResult.decision.order_matching_decision_id,
      matched_at: runtime.now(),
      simulation_matched_at: runtime.simulationTime(),
      failure_reason: null,
      ...runtime.audit(),
    }),
    robotaxis: replaceById(state.robotaxis || [], "robotaxi_id", robotaxiId, (robotaxi) => ({
      ...robotaxi,
      current_order_id: objectId,
      motion_status: "STOPPED",
      available_for_dispatch: false,
      ...runtime.audit(),
    })),
  });
}

export function advanceTrip({ state, objectId, runtime }) {
  const appData = dataView(state);
  let order = (state.serviceOrders || []).find((item) => item.service_order_id === objectId);
  let trip = (state.trips || []).find((item) => item.trip_id === objectId);
  if (!order && trip) order = (state.serviceOrders || []).find((item) => item.trip_id === trip.trip_id || item.service_order_id === trip.service_order_id);
  if (!trip && order) trip = (state.trips || []).find((item) => item.trip_id === order.trip_id);
  if (!order) return failure("TRIP_NO_ORDER", `未找到服务订单 ${objectId}`, "trip", objectId, "未找到服务订单");
  if (!trip) {
    const createdTrip = createTripForOrder(order, appData, runtime);
    return success("TRIP_CREATED", `履约行驶 ${createdTrip.trip_id} 已创建`, { objectType: "trip", objectId: createdTrip.trip_id, serviceOrderId: order.service_order_id }, {
      trips: [createdTrip, ...(state.trips || [])],
      serviceOrders: replaceById(state.serviceOrders || [], "service_order_id", order.service_order_id, { ...order, trip_id: createdTrip.trip_id, ...runtime.audit() }),
    });
  }
  if ([tripTypes.TripStatus.ON_THE_WAY_PICKUP, tripTypes.TripStatus.ON_THE_WAY_DESTINATION].includes(trip.trip_status)) {
    const movedTrip = tripService.getNextTripMovementState(trip, appData);
    if (!movedTrip) return failure("TRIP_NO_ACTION", `Trip ${trip.trip_id} 无法行驶`, "trip", trip.trip_id, "缺少路径或当前状态不可步进");
    return tripUpdateResult({ state, order, trip: { ...movedTrip, ...runtime.audit() }, runtime, resultType: "TRIP_STEPPED", message: `履约行驶 ${trip.trip_id} 步进完成` });
  }
  const nextTrip = tripService.getNextTripState(trip);
  if (!nextTrip) return failure("TRIP_NO_ACTION", `Trip ${trip.trip_id} 无需推进`, "trip", trip.trip_id, "当前状态无需推进");
  const routeUpdate = routePlanningService.createTripRouteUpdate({
    trip,
    nextTrip,
    data: appData,
    routeId: runtime.nextId("SRT"),
    routePlanningRunId: runtime.nextId("RPR"),
  });
  if (routeUpdate?.failedTrip) {
    return tripUpdateResult({
      state,
      order,
      trip: { ...routeUpdate.failedTrip, ...runtime.audit() },
      runtime,
      resultType: "ROUTE_PLAN_FAILED",
      message: `履约行驶 ${trip.trip_id} 路径规划失败`,
      extraUpdates: { routePlanningRuns: [{ ...routeUpdate.routePlanningRun, ...runtime.audit({ created: true }) }, ...(state.routePlanningRuns || [])] },
      successValue: false,
    });
  }
  const extraUpdates = {};
  if (routeUpdate?.route) {
    extraUpdates.routes = [routeUpdate.route, ...(state.routes || [])];
    extraUpdates.routePlanningRuns = [{ ...routeUpdate.routePlanningRun, ...runtime.audit({ created: true }) }, ...(state.routePlanningRuns || [])];
  }
  return tripUpdateResult({
    state,
    order,
    trip: { ...(routeUpdate?.nextTrip || nextTrip), ...runtime.audit() },
    runtime,
    resultType: "TRIP_ADVANCED",
    message: `履约行驶 ${trip.trip_id} 推进至 ${nextTrip.trip_status}`,
    extraUpdates,
  });
}

export function settleServiceOrder({ state, objectId, runtime }) {
  const appData = dataView(state);
  const order = (state.serviceOrders || []).find((item) => item.service_order_id === objectId);
  if (!order) return failure("SETTLEMENT_FAILED", `未找到服务订单 ${objectId}`, "serviceOrder", objectId, "未找到服务订单");
  const trip = (state.trips || []).find((item) => item.trip_id === order.trip_id);
  const sourceOrder = {
    ...order,
    ...serviceOrderSettlement.createServiceOrderActualSnapshotFromTrip(order, trip, serviceOrderTypes, tripTypes),
  };
  const settlementInput = serviceOrderSettlement.buildServiceOrderSettlementInput({ serviceOrder: sourceOrder, trip, serviceOrderTypes, tripTypes });
  if (!settlementInput.settlementOrder) return failure("SETTLEMENT_FAILED", `服务订单 ${objectId} 结算失败`, "serviceOrder", objectId, settlementInput.failure_reason);
  const strategy = appData.pricingStrategies?.find((item) => item.pricing_algorithm === "BASIC_FINAL_FARE_CALCULATION" && item.strategy_status === "ACTIVE")
    || appData.pricingStrategies?.find((item) => item.strategy_status === "ACTIVE");
  const result = serviceOrderSettlement.runFinalFareCalculation({
    strategy,
    serviceOrder: settlementInput.settlementOrder,
    pricingStrategyRunId: runtime.nextId("DPR"),
    pricingDecisionId: runtime.nextId("PD"),
    createdAt: runtime.now(),
    pricingTypes,
  });
  const nextOrder = serviceOrderSettlement.applyServiceOrderSettlementResult({ order, settlementOrder: settlementInput.settlementOrder, result, serviceOrderTypes });
  return success(result.decision ? "SETTLEMENT_COMPLETED" : "SETTLEMENT_FAILED", result.decision ? `服务订单 ${objectId} 结算完成，最终价格 ${result.decision.final_price}` : `服务订单 ${objectId} 结算失败`, { objectType: "serviceOrder", objectId, pricingDecisionId: result.decision?.pricing_decision_id || null }, {
    pricingStrategyRuns: result.run ? [{ ...result.run, ...runtime.audit({ created: true }) }, ...(state.pricingStrategyRuns || [])] : state.pricingStrategyRuns,
    pricingDecisions: result.decision ? [{ ...result.decision, ...runtime.audit({ created: true }) }, ...(state.pricingDecisions || [])] : state.pricingDecisions,
    serviceOrders: replaceById(state.serviceOrders || [], "service_order_id", objectId, { ...nextOrder, ...runtime.audit() }),
  }, Boolean(result.decision));
}

export function payServiceOrder({ state, objectId, runtime }) {
  const order = (state.serviceOrders || []).find((item) => item.service_order_id === objectId);
  if (!order) return failure("PAYMENT_FAILED", `未找到服务订单 ${objectId}`, "serviceOrder", objectId, "未找到服务订单");
  const result = serviceOrderService.payServiceOrder({
    serviceOrder: order,
    trips: state.trips || [],
    robotaxis: state.robotaxis || [],
    completedAt: runtime.now(),
    serviceOrderTypes,
    tripTypes,
  });
  if (!result.success) return failure("PAYMENT_FAILED", `服务订单 ${objectId} 支付失败：${result.failureReason}`, "serviceOrder", objectId, result.failureReason);
  return success("PAYMENT_COMPLETED", `服务订单 ${objectId} 支付完成`, { objectType: "serviceOrder", objectId }, {
    serviceOrders: replaceById(state.serviceOrders || [], "service_order_id", objectId, { ...result.serviceOrder, simulation_payment_completed_at: runtime.simulationTime(), ...runtime.audit({ completed: true }) }),
    trips: result.trips.map((trip) => trip.service_order_id === objectId ? { ...trip, ...runtime.audit({ completed: true }) } : trip),
    robotaxis: result.robotaxis.map((robotaxi) => robotaxi.current_order_id === objectId ? { ...robotaxi, motion_status: "PARKED", ...runtime.audit() } : robotaxi),
  });
}

function executePriceRoutePlanning({ state, order, runtime }) {
  const route = routePlanningService.createPriceEstimationRoute({
    serviceOrder: order,
    data: dataView(state),
    routeId: runtime.nextId("SRT"),
    routePlanningRunId: runtime.nextId("RPR"),
  });
  return {
    route: route.route_steps.length > 0 ? route : null,
    routePlanningRun: routePlanningService.createRoutePlanningRun({
      routePlanningRunId: route.route_planning_run_id,
      routeStrategyId: route.route_strategy_id,
      planningAlgorithm: route.planning_algorithm,
      taskId: null,
      serviceOrderId: order.service_order_id,
      tripId: null,
      routeExecutionId: null,
      robotaxiId: null,
      originCellId: route.origin_cell_id,
      targetCellId: route.target_cell_id,
      resultRouteId: route.route_steps.length > 0 ? route.route_id : null,
      planningResult: route.route_steps.length > 0 ? taskTypes.RoutePlanningResult.SUCCESS : taskTypes.RoutePlanningResult.FAILED,
      failureReason: route.route_steps.length > 0 ? taskTypes.RoutePlanningFailureReason.NONE : route.failure_reason,
      routeStepCount: route.route_step_count,
      totalDistanceKm: route.total_distance_km,
      createdAt: runtime.now(),
    }),
  };
}

function planTripRoute({ state, objectId, runtime }) {
  return advanceTrip({ state, objectId, runtime });
}

function tripUpdateResult({ state, order, trip, runtime, resultType, message, extraUpdates = {}, successValue = true }) {
  return {
    success: successValue,
    resultType,
    message,
    data: { objectType: "trip", objectId: trip.trip_id, serviceOrderId: order.service_order_id },
    updates: {
      trips: replaceById(state.trips || [], "trip_id", trip.trip_id, trip),
      serviceOrders: syncServiceOrderFromTrip(state.serviceOrders || [], order.service_order_id, trip, runtime),
      robotaxis: updateRobotaxiFromTrip(state.robotaxis || [], trip, runtime),
      ...extraUpdates,
    },
  };
}

function syncServiceOrderFromTrip(serviceOrders, serviceOrderId, trip, runtime) {
  const orderStatusByTripStatus = {
    ON_THE_WAY_PICKUP: serviceOrderTypes.ServiceOrderStatus.ON_THE_WAY_PICKUP,
    WAITING_CUSTOMER_BOARDING: serviceOrderTypes.ServiceOrderStatus.WAITING_CUSTOMER_BOARDING,
    CUSTOMER_ONBOARD: serviceOrderTypes.ServiceOrderStatus.CUSTOMER_ONBOARD,
    ON_THE_WAY_DESTINATION: serviceOrderTypes.ServiceOrderStatus.ON_THE_WAY_DESTINATION,
    ARRIVED_DESTINATION: serviceOrderTypes.ServiceOrderStatus.ARRIVED_DESTINATION,
    COMPLETED: serviceOrderTypes.ServiceOrderStatus.SETTLING,
    FAILED: serviceOrderTypes.ServiceOrderStatus.FAILED,
  };
  const orderStatus = orderStatusByTripStatus[trip.trip_status];
  if (!orderStatus) return serviceOrders;
  return replaceById(serviceOrders, "service_order_id", serviceOrderId, (order) => ({
    ...order,
    order_status: orderStatus,
    trip_total_distance_km: trip.total_distance_km,
    trip_total_duration_min: parseTimeElapsed(trip.time_elapsed),
    trip_distance_traveled_km: trip.distance_traveled_km,
    trip_distance_remaining_km: trip.distance_remaining_km,
    ...runtime.audit(),
  }));
}

function updateRobotaxiFromTrip(robotaxis, trip, runtime) {
  if (!trip?.robotaxi_id || !trip?.current_cell_id) return robotaxis;
  return replaceById(robotaxis, "robotaxi_id", trip.robotaxi_id, (robotaxi) => ({
    ...robotaxi,
    current_cell_id: trip.current_cell_id,
    motion_status: trip.trip_status === tripTypes.TripStatus.COMPLETED ? "PARKED" : "MOVING",
    ...runtime.audit(),
  }));
}

function createServiceOrderFromDemandRun(demandRun, orderChannel, runtime) {
  return {
    service_order_id: runtime.nextId("SO"),
    order_channel: orderChannel,
    customer_id: demandRun.customer_id,
    demand_simulation_run_id: demandRun.demand_simulation_run_id,
    demand_simulation_result_id: demandRun.demand_simulation_result_id,
    customer_origin_location_type: demandRun.customer_origin_location_type,
    customer_origin_place_id: demandRun.customer_origin_place_id || null,
    customer_origin_road_segment_id: demandRun.customer_origin_road_segment_id || null,
    customer_origin_cell_id: demandRun.customer_origin_cell_id,
    pickup_service_area_id: demandRun.pickup_service_area_id,
    pickup_cell_id: demandRun.pickup_cell_id,
    dropoff_service_area_id: demandRun.dropoff_service_area_id,
    dropoff_cell_id: demandRun.dropoff_cell_id,
    order_status: serviceOrderTypes.ServiceOrderStatus.WAITING_PRICE_ESTIMATE,
    payment_status: "UNPAID",
    estimated_price: null,
    quoted_price: null,
    final_price: null,
    trip_total_distance_km: null,
    trip_total_duration_min: null,
    created_at: runtime.now(),
    ...runtime.audit({ created: true }),
  };
}

function createTripForOrder(order, appData, runtime) {
  const robotaxi = (appData.robotaxis || []).find((item) => item.robotaxi_id === order.matched_robotaxi_id);
  return {
    trip_id: runtime.nextId("TRIP"),
    service_order_id: order.service_order_id,
    robotaxi_id: order.matched_robotaxi_id,
    pickup_service_area_id: order.pickup_service_area_id,
    pickup_cell_id: order.pickup_cell_id,
    dropoff_service_area_id: order.dropoff_service_area_id,
    dropoff_cell_id: order.dropoff_cell_id,
    current_cell_id: robotaxi?.current_cell_id || order.pickup_cell_id,
    current_step_index: 0,
    total_step_count: 0,
    total_distance_km: 0,
    distance_traveled_km: 0,
    distance_remaining_km: order.estimated_distance_km || 0,
    time_elapsed: "0:00",
    trip_status: tripTypes.TripStatus.WAITING_ROUTE,
    trip_phase: tripTypes.TripPhase.PICKUP,
    created_at: runtime.now(),
    ...runtime.audit({ created: true }),
  };
}

function dataView(state) {
  return {
    ...(state.data || {}),
    serviceOrders: state.serviceOrders || state.data?.serviceOrders || [],
    trips: state.trips || state.data?.trips || [],
    deploymentTasks: state.deploymentTasks || state.data?.deploymentTasks || [],
    routeExecutions: state.routeExecutions || state.data?.routeExecutions || [],
    readinessTasks: state.readinessTasks || state.data?.readinessTasks || [],
    routes: state.routes || state.data?.routes || [],
    routePlanningRuns: state.routePlanningRuns || state.data?.routePlanningRuns || [],
    robotaxis: state.robotaxis || state.data?.robotaxis || [],
  };
}

function success(resultType, message, data, updates = {}, successValue = true) {
  return { success: successValue, resultType, message, data, updates };
}

function failure(resultType, message, objectType, objectId, failureReason, updates = {}) {
  return { success: false, resultType, message, data: { objectType, objectId, failureReason }, updates };
}

function replaceById(items, key, id, nextValue) {
  return items.map((item) => {
    if (item?.[key] !== id) return item;
    return typeof nextValue === "function" ? nextValue(item) : nextValue;
  });
}

function parseTimeElapsed(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parts = String(value).split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  return Number(value) || 0;
}
