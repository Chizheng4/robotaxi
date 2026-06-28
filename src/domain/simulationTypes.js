import { formatSimulationTimestamp, getSimulationPosition } from "./simulationTime.js";

/**
 * Simulation System 类型定义
 *
 * 定义自动运营模拟系统的核心枚举和对象结构。
 * 参考文档：doc/08-simulation-system/01-simulation-runtime/02-simulation-run.md
 *           doc/08-simulation-system/01-simulation-runtime/04-simulation-policy.md
 */

// ============================================================================
// 1. SimulationRun 相关
// ============================================================================

export const SimulationStatus = {
  READY: "READY",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  DRAINING: "DRAINING",
  COMPLETED: "COMPLETED",
  STOPPED: "STOPPED",
  FAILED: "FAILED",
};

export const SimulationStatusLabel = {
  [SimulationStatus.READY]: "待启动",
  [SimulationStatus.RUNNING]: "运行中",
  [SimulationStatus.PAUSED]: "暂停中",
  [SimulationStatus.DRAINING]: "收尾执行中",
  [SimulationStatus.COMPLETED]: "已完成",
  [SimulationStatus.STOPPED]: "已停止",
  [SimulationStatus.FAILED]: "运行异常结束",
};

// ============================================================================
// 2. SimulationPolicy 相关
// ============================================================================

export const PolicyStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
  ARCHIVED: "ARCHIVED",
};

export const PolicyStatusLabel = {
  [PolicyStatus.DRAFT]: "草稿",
  [PolicyStatus.ACTIVE]: "可用",
  [PolicyStatus.DISABLED]: "停用",
  [PolicyStatus.ARCHIVED]: "已归档",
};

export const RunSpeedLevel = {
  SLOW: "SLOW",
  NORMAL: "NORMAL",
  FAST: "FAST",
  ULTRA_FAST: "ULTRA_FAST",
};

export const RunSpeedLevelLabel = {
  [RunSpeedLevel.SLOW]: "慢速",
  [RunSpeedLevel.NORMAL]: "标准",
  [RunSpeedLevel.FAST]: "快速",
  [RunSpeedLevel.ULTRA_FAST]: "超高速",
};

export const TimePeriod = {
  NIGHT: "NIGHT",
  MORNING: "MORNING",
  NOON: "NOON",
  AFTERNOON: "AFTERNOON",
  EVENING: "EVENING",
};

export const TimePeriodLabel = {
  [TimePeriod.NIGHT]: "夜间",
  [TimePeriod.MORNING]: "上午",
  [TimePeriod.NOON]: "中午",
  [TimePeriod.AFTERNOON]: "下午",
  [TimePeriod.EVENING]: "晚上",
};

export const PeriodType = {
  PEAK: "PEAK",
  NORMAL: "NORMAL",
  LOW: "LOW",
};

export const PeriodTypeLabel = {
  [PeriodType.PEAK]: "高峰期",
  [PeriodType.NORMAL]: "平常期",
  [PeriodType.LOW]: "低需求期",
};

export const DemandGenerationMode = {
  TICK_ORDER_COUNT_DISTRIBUTION: "TICK_ORDER_COUNT_DISTRIBUTION",
  FIXED_ORDER_COUNT: "FIXED_ORDER_COUNT",
  DISABLED: "DISABLED",
};

export const DemandGenerationModeLabel = {
  [DemandGenerationMode.TICK_ORDER_COUNT_DISTRIBUTION]: "Tick 级订单数量分布",
  [DemandGenerationMode.FIXED_ORDER_COUNT]: "固定订单数量",
  [DemandGenerationMode.DISABLED]: "不生成订单",
};

export const DistributionType = {
  POISSON: "POISSON",
  FIXED: "FIXED",
  UNIFORM: "UNIFORM",
};

export const DistributionTypeLabel = {
  [DistributionType.POISSON]: "泊松分布",
  [DistributionType.FIXED]: "固定数量",
  [DistributionType.UNIFORM]: "均匀分布",
};

// ============================================================================
// 3. SimulationEvent 相关
// ============================================================================

export const EventSource = {
  SIMULATION_SYSTEM: "SIMULATION_SYSTEM",
  SUPPLY_TRIGGER: "SUPPLY_TRIGGER",
  DEMAND_TRIGGER: "DEMAND_TRIGGER",
  EXECUTION_ENGINE: "EXECUTION_ENGINE",
  BUSINESS_SERVICE: "BUSINESS_SERVICE",
};

export const EventResult = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
  NO_ACTION: "NO_ACTION",
};

export const EventResultLabel = {
  [EventResult.SUCCESS]: "成功",
  [EventResult.FAILED]: "失败",
  [EventResult.SKIPPED]: "已跳过",
  [EventResult.NO_ACTION]: "无动作",
};

export const EventType = {
  // 系统事件
  SIMULATION_RUN_STARTED: "SIMULATION_RUN_STARTED",
  SIMULATION_RUN_PAUSED: "SIMULATION_RUN_PAUSED",
  SIMULATION_RUN_RESUMED: "SIMULATION_RUN_RESUMED",
  SIMULATION_RUN_COMPLETED: "SIMULATION_RUN_COMPLETED",
  SIMULATION_RUN_STOPPED: "SIMULATION_RUN_STOPPED",
  SIMULATION_RUN_FAILED: "SIMULATION_RUN_FAILED",
  SIMULATION_DRAIN_STARTED: "SIMULATION_DRAIN_STARTED",
  SIMULATION_DRAIN_COMPLETED: "SIMULATION_DRAIN_COMPLETED",
  SIMULATION_DRAIN_FAILED: "SIMULATION_DRAIN_FAILED",
  SIMULATION_TICK_STARTED: "SIMULATION_TICK_STARTED",
  SIMULATION_TICK_COMPLETED: "SIMULATION_TICK_COMPLETED",
  SIMULATION_SCENE_UPDATED: "SIMULATION_SCENE_UPDATED",
  WORKFLOW_QUERIED: "WORKFLOW_QUERIED",
  OPERATING_SIMULATION_TIME_CALCULATION_STARTED: "OPERATING_SIMULATION_TIME_CALCULATION_STARTED",
  OPERATING_SIMULATION_TIME_CALCULATION_COMPLETED: "OPERATING_SIMULATION_TIME_CALCULATION_COMPLETED",
  OPERATING_SIMULATION_TIME_CALCULATION_FAILED: "OPERATING_SIMULATION_TIME_CALCULATION_FAILED",

  // 供给侧事件
  SUPPLY_TRIGGER_STARTED: "SUPPLY_TRIGGER_STARTED",
  SUPPLY_TRIGGER_COMPLETED: "SUPPLY_TRIGGER_COMPLETED",
  READINESS_CHECK_TRIGGERED: "READINESS_CHECK_TRIGGERED",
  READINESS_CHECK_CREATED: "READINESS_CHECK_CREATED",
  READINESS_CHECK_NO_ACTION: "READINESS_CHECK_NO_ACTION",
  READINESS_CHECK_FAILED: "READINESS_CHECK_FAILED",
  DEPLOYMENT_TRIGGERED: "DEPLOYMENT_TRIGGERED",
  DEPLOYMENT_TASK_CREATED: "DEPLOYMENT_TASK_CREATED",
  DEPLOYMENT_NO_ACTION: "DEPLOYMENT_NO_ACTION",
  DEPLOYMENT_TRIGGER_FAILED: "DEPLOYMENT_TRIGGER_FAILED",
  ROUTE_EXECUTION_TRIGGERED: "ROUTE_EXECUTION_TRIGGERED",
  ROUTE_EXECUTION_UPDATED: "ROUTE_EXECUTION_UPDATED",
  ROUTE_EXECUTION_COMPLETED: "ROUTE_EXECUTION_COMPLETED",
  ROUTE_EXECUTION_NO_ACTION: "ROUTE_EXECUTION_NO_ACTION",

  // 需求侧事件
  DEMAND_TRIGGER_STARTED: "DEMAND_TRIGGER_STARTED",
  DEMAND_TRIGGER_COMPLETED: "DEMAND_TRIGGER_COMPLETED",
  ORDER_COUNT_GENERATED: "ORDER_COUNT_GENERATED",
  DEMAND_NO_ORDER_GENERATED: "DEMAND_NO_ORDER_GENERATED",

  // 执行引擎事件
  ACTION_RECEIVED: "ACTION_RECEIVED",
  ACTION_EXECUTED: "ACTION_EXECUTED",
  ACTION_FAILED: "ACTION_FAILED",
  DOMAIN_STATE_CHANGED: "DOMAIN_STATE_CHANGED",
};

// ============================================================================
// 4. 创建工具函数
// ============================================================================

/**
 * 创建默认 DemandProfile
 */
export function createDemandProfile({ demandProfileId, profileName, distributionType, lambda, minOrdersPerTick, maxOrdersPerTick }) {
  return {
    demand_profile_id: demandProfileId,
    profile_name: profileName,
    distribution_type: distributionType,
    lambda,
    min_orders_per_tick: minOrdersPerTick,
    max_orders_per_tick: maxOrdersPerTick,
  };
}

/**
 * 创建默认时间窗口配置
 */
export function createTimeWindow({ timeWindow, startTime, endTime, timePeriod, periodType, demandProfileId }) {
  return {
    time_window: timeWindow,
    start_time: startTime,
    end_time: endTime,
    time_period: timePeriod,
    period_type: periodType,
    demand_profile_id: demandProfileId,
  };
}

/**
 * 创建默认时间段配置
 */
export function createTimePeriodConfig({ timePeriod, startTime, endTime }) {
  return {
    time_period: timePeriod,
    start_time: startTime,
    end_time: endTime,
  };
}

/**
 * 创建默认 SimulationPolicy
 *
 * @param {Object} overrides - 可覆盖的配置项
 * @returns {Object} SimulationPolicy 对象
 */
export function createDefaultSimulationPolicy(overrides = {}) {
  return {
    simulation_policy_id: "SIM-POLICY-001",
    policy_name: "1天自动运营模拟默认配置",
    policy_status: PolicyStatus.ACTIVE,
    tick_minutes: 1 / 60,
    tick_seconds: 1,
    simulation_days: 1,
    run_speed_level: RunSpeedLevel.FAST,
    simulation_speed_config: {
      real_cycle_interval_ms: 50,
      ticks_per_real_cycle: 300,
    },
    real_cycle_interval_ms: 50,
    ticks_per_real_cycle: 300,
    random_seed: 20260101,
    worker_work_start_time: "08:00",
    worker_work_end_time: "20:00",
    robotaxi_operating_start_time: "00:00",
    robotaxi_operating_end_time: "24:00",
    time_period_configs: [],
    time_window_configs: [],
    demand_generation_config: {
      demand_generation_enabled: true,
      demand_generation_mode: DemandGenerationMode.TICK_ORDER_COUNT_DISTRIBUTION,
      demand_generation_interval_seconds: 600,
      max_orders_per_tick_global: 10,
      max_orders_per_generation_global: 10,
    },
    demand_profiles: [],
    supply_trigger_config: {
      supply_trigger_enabled: true,
      readiness_trigger_enabled: true,
      deployment_trigger_enabled: true,
      route_execution_trigger_enabled: true,
      readiness_trigger_interval_seconds: 600,
      deployment_trigger_interval_seconds: 600,
    },
    service_order_auto_config: {
      auto_pricing_enabled: true,
      auto_customer_confirm_enabled: true,
      auto_order_matching_enabled: true,
      auto_trip_creation_enabled: true,
      auto_trip_progress_enabled: true,
      auto_payment_enabled: true,
    },
    execution_time_config: {
      readiness_check_seconds: 30,
      cell_travel_seconds: 6,
      arrival_detection_seconds: 3,
      order_matching_retry_seconds: 30,
      order_matching_max_retry_count: 5,
      passenger_boarding_seconds: 45,
      passenger_dropoff_seconds: 30,
      settlement_seconds: 5,
      payment_seconds: 3,
      worker_readiness_check_ticks: 2,
      passenger_boarding_ticks: 1,
      dropoff_and_payment_ticks: 1,
    },
    max_drain_ticks: 144,
    robotaxi_speed_kmh: 30,
    default_completion_config: {
      default_readiness_passed: true,
      default_deployment_arrival_normal: true,
      default_pickup_arrival_normal: true,
      default_passenger_boarded: true,
      default_service_arrival_normal: true,
      default_payment_success: true,
    },
    enable_exception_probability: false,
    ...overrides,
  };
}

/**
 * 创建 SimulationRun
 *
 * @param {Object} params
 * @param {string} params.simulationRunId - 运行编号
 * @param {string} params.simulationName - 运行名称
 * @param {Object} params.simulationPolicy - 引用的 SimulationPolicy（将深拷贝为 snapshot）
 * @param {number} params.totalDays - 模拟天数
 * @param {number} params.tickMinutes - 每 Tick 分钟数
 * @returns {Object} SimulationRun 对象
 */
export function createSimulationRun({
  simulationRunId,
  simulationName,
  simulationPolicy,
  totalDays,
  tickMinutes,
  tickSeconds,
  startSimulationSeconds = 0,
  startGlobalTick = 0,
  simulationTimelineId = "SIM-TIMELINE-001",
  previousSimulationRunId = null,
}) {
  const resolvedTickSeconds = Number(tickSeconds) || Number(simulationPolicy.tick_seconds) || tickMinutes * 60;
  const totalSeconds = totalDays * 24 * 60 * 60;
  const totalTicks = Math.ceil(totalSeconds / resolvedTickSeconds);
  const startSeconds = Math.max(0, Number(startSimulationSeconds) || 0);
  const plannedEndSeconds = startSeconds + totalSeconds;
  const position = getSimulationPosition(startSeconds, resolvedTickSeconds);
  return {
    simulation_run_id: simulationRunId,
    simulation_name: simulationName,
    simulation_status: SimulationStatus.READY,
    simulation_policy_id: simulationPolicy.simulation_policy_id,
    simulation_policy_snapshot: JSON.parse(JSON.stringify(simulationPolicy)),
    simulation_timeline_id: simulationTimelineId,
    previous_simulation_run_id: previousSimulationRunId,
    total_days: totalDays,
    tick_minutes: tickMinutes,
    tick_seconds: resolvedTickSeconds,
    total_ticks: totalTicks,
    simulation_start_seconds: startSeconds,
    planned_simulation_end_seconds: plannedEndSeconds,
    simulation_end_seconds: null,
    simulation_start_at: formatSimulationTimestamp(startSeconds),
    planned_simulation_end_at: formatSimulationTimestamp(plannedEndSeconds),
    simulation_end_at: null,
    current_simulation_seconds: startSeconds,
    current_day: position.day,
    current_time: position.displayTime,
    current_clock_time: position.clockTime,
    current_day_tick: position.dayTick,
    current_run_tick: 0,
    current_global_tick: Number(startGlobalTick) || 0,
    trigger_ticks_completed: 0,
    drain_ticks: 0,
    max_drain_ticks: Number(simulationPolicy.max_drain_ticks) || 144,
    current_time_period: null,
    current_period_type: null,
    current_supply_scene: null,
    current_demand_scene: null,
    current_scene_summary: null,
    current_tick_event_summary: null,
    started_at: null,
    paused_at: null,
    resumed_at: null,
    completed_at: null,
    stopped_at: null,
    failure_reason: null,
    failure_summary: null,
    result_summary: null,
    created_at: new Date().toISOString(),
  };
}

/**
 * 创建 SimulationEvent
 *
 * @param {Object} params
 * @param {string} params.simulationEventId - 事件编号
 * @param {string} params.simulationRunId - 所属 SimulationRun
 * @param {number} params.simulationDay - 模拟第几天
 * @param {string} params.simulationTime - 模拟时间
 * @param {number} params.dayTick - 当天 Tick
 * @param {number} params.globalTick - 全局 Tick
 * @param {string} params.eventType - 事件类型
 * @param {string} params.eventSource - 事件来源
 * @param {string|null} params.relatedObjectType - 关联对象类型
 * @param {string|null} params.relatedObjectId - 关联对象编号
 * @param {string} params.eventResult - 事件结果
 * @param {string|null} params.failureReason - 失败原因
 * @param {string|null} params.skipReason - 跳过原因
 * @param {string} params.message - 事件描述
 * @param {Object|null} params.eventPayload - 事件负载
 * @returns {Object} SimulationEvent 对象
 */
export function createSimulationEvent({
  simulationEventId,
  simulationRunId,
  simulationDay,
  simulationTime,
  dayTick,
  globalTick,
  eventType,
  eventSource = EventSource.SIMULATION_SYSTEM,
  relatedObjectType = null,
  relatedObjectId = null,
  eventResult = EventResult.SUCCESS,
  failureReason = null,
  skipReason = null,
  message = "",
  eventPayload = null,
}) {
  return {
    simulation_event_id: simulationEventId,
    simulation_run_id: simulationRunId,
    simulation_day: simulationDay,
    simulation_time: simulationTime,
    day_tick: dayTick,
    global_tick: globalTick,
    event_type: eventType,
    event_source: eventSource,
    related_object_type: relatedObjectType,
    related_object_id: relatedObjectId,
    event_result: eventResult,
    failure_reason: failureReason,
    skip_reason: skipReason,
    message,
    event_payload: eventPayload,
    created_at: new Date().toISOString(),
  };
}
