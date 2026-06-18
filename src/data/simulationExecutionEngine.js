/**
 * ExecutionEngine：动作分发器
 *
 * 维护动作类型到业务函数的映射表。
 * 接收 WorkflowEngine 输出的动作，分发到对应业务函数执行。
 *
 * 参考文档：doc/08-simulation-system/03-execution-engine/01-execution-engine.md
 */

// ============================================================================
// 动作映射表
// ============================================================================

/**
 * 动作类型 → 业务函数 映射
 *
 * 每个 handler 签名为：(params) => result
 *   params: { objectId, data, context }
 *   result: { success, resultType, message, ... }
 */
const actionHandlers = {
  // ---- 供给侧：ReadinessTask ----
  READINESS_TASK_ASSIGN: null,    // P2: assignWorker
  READINESS_TASK_START: null,     // P2: startCheck
  READINESS_TASK_PASS: null,      // P2: submitCheckResult(PASSED)

  // ---- 供给侧：DeploymentTask/RouteExecution ----
  ROUTE_PLAN: null,               // P3: planRouteExecutionRoute
  ROUTE_EXECUTION_STEP: null,     // P3: advanceRouteExecution
  ARRIVAL_CONFIRM: null,          // P3: submitNormalArrival

  // ---- 需求侧 ----
  SERVICE_ORDER_CREATE: null,     // P1: createServiceOrderFromDemand

  // ---- 订单侧 ----
  PRICING_EXECUTE: null,          // P0: executePricing (需要注入)
  ROBOTAXI_CALL: null,            // P1: callRobotaxiForServiceOrder
  ORDER_MATCHING_EXECUTE: null,   // P0: executeOrderMatching (需要注入)
  SETTLEMENT_EXECUTE: null,       // P1: settleServiceOrder
  PAYMENT_EXECUTE: null,          // P1: payServiceOrder

  // ---- 履约侧 ----
  TRIP_STEP_EXECUTE: null,        // P0: advanceTrip (需要注入)
};

/**
 * 注册动作处理器
 *
 * @param {string} actionType - 动作类型
 * @param {Function} handler - 处理函数
 */
export function registerActionHandler(actionType, handler) {
  actionHandlers[actionType] = handler;
}

/**
 * 批量注册动作处理器
 *
 * @param {Object} handlers - { actionType: handler, ... }
 */
export function registerActionHandlers(handlers) {
  Object.entries(handlers).forEach(([actionType, handler]) => {
    actionHandlers[actionType] = handler;
  });
}

/**
 * 执行单个动作
 *
 * @param {Object} params
 * @param {string} params.actionType - 动作类型
 * @param {string} params.objectId - 目标对象 ID
 * @param {Object} params.data - 业务数据上下文
 * @param {Object} params.context - 模拟上下文 { simulationRunId, tick, ... }
 * @returns {Object} 执行结果 { success, resultType, message }
 */
export function executeAction({ actionType, objectId, data, context }) {
  const handler = actionHandlers[actionType];

  if (!handler) {
    return {
      success: false,
      resultType: "NO_HANDLER",
      message: `动作 ${actionType} 未注册处理器`,
    };
  }

  try {
    const result = handler({ objectId, data, context });
    return {
      success: result?.success !== false,
      resultType: result?.resultType || "EXECUTED",
      message: result?.message || `${actionType} 执行完成`,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      resultType: "EXECUTION_ERROR",
      message: `${actionType} 执行异常：${error.message}`,
    };
  }
}

/**
 * 批量执行动作
 *
 * @param {Object[]} actions - 动作列表 [{ objectType, objectId, actionType }]
 * @param {Object} data - 业务数据上下文
 * @param {Object} context - 模拟上下文
 * @returns {Object[]} 执行结果列表
 */
export function executeActions(actions, data, context) {
  return actions.map((action, actionIndex) => {
    const result = executeAction({
      actionType: action.actionType,
      objectId: action.objectId,
      data,
      context: { ...context, actionIndex, action },
    });
    return { ...action, ...result };
  });
}

/**
 * 获取已注册的动作类型列表
 */
export function getRegisteredActions() {
  return Object.keys(actionHandlers).filter((key) => actionHandlers[key] !== null);
}
