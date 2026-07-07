/**
 * Simulation 校验
 *
 * 校验 SimulationPolicy 配置完整性。
 * 参考文档：doc/09-simulation-system/01-simulation-runtime/initialization-simulation.md § 19
 */

import { PolicyStatus } from "../domain/simulationTypes.js";

/**
 * 校验 SimulationPolicy 配置完整性
 *
 * @param {Object} policy - SimulationPolicy 对象
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSimulationPolicy(policy) {
  const errors = [];

  // 1. simulation_policy_id 不为空
  if (!policy.simulation_policy_id) {
    errors.push("simulation_policy_id 不能为空");
  }

  // 2. policy_status = ACTIVE
  if (policy.policy_status !== PolicyStatus.ACTIVE) {
    errors.push(`policy_status 必须为 ACTIVE，当前为 ${policy.policy_status}`);
  }

  // 3. tick_minutes > 0
  if (!policy.tick_minutes || policy.tick_minutes <= 0) {
    errors.push("tick_minutes 必须大于 0");
  }

  // 4. simulation_days > 0
  if (!policy.simulation_days || policy.simulation_days <= 0) {
    errors.push("simulation_days 必须大于 0");
  }

  // 5. robotaxi_speed_kmh > 0
  if (!policy.robotaxi_speed_kmh || policy.robotaxi_speed_kmh <= 0) {
    errors.push("robotaxi_speed_kmh 必须大于 0");
  }

  // 6. time_period_configs 覆盖 00:00 - 24:00
  if (!Array.isArray(policy.time_period_configs) || policy.time_period_configs.length === 0) {
    errors.push("time_period_configs 不能为空");
  } else {
    const sorted = [...policy.time_period_configs].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    if (sorted[0].start_time !== "00:00") {
      errors.push("time_period_configs 必须从 00:00 开始");
    }
    if (sorted[sorted.length - 1].end_time !== "24:00") {
      errors.push("time_period_configs 必须以 24:00 结束");
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].end_time !== sorted[i + 1].start_time) {
        errors.push(`time_period_configs 存在时间缺口：${sorted[i].end_time} → ${sorted[i + 1].start_time}`);
      }
    }
  }

  // 7. time_window_configs 覆盖 00:00 - 24:00
  if (!Array.isArray(policy.time_window_configs) || policy.time_window_configs.length === 0) {
    errors.push("time_window_configs 不能为空");
  } else {
    const sorted = [...policy.time_window_configs].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    if (sorted[0].start_time !== "00:00") {
      errors.push("time_window_configs 必须从 00:00 开始");
    }
    if (sorted[sorted.length - 1].end_time !== "24:00") {
      errors.push("time_window_configs 必须以 24:00 结束");
    }
    // 8. time_window_configs 不存在时间重叠
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].end_time !== sorted[i + 1].start_time) {
        errors.push(`time_window_configs 存在时间缺口或重叠：${sorted[i].time_window} (${sorted[i].end_time}) → ${sorted[i + 1].time_window} (${sorted[i + 1].start_time})`);
      }
    }
  }

  // 9. 每个 time_window 必须关联 demand_profile_id
  if (Array.isArray(policy.time_window_configs)) {
    const profileIds = new Set((policy.demand_profiles || []).map((p) => p.demand_profile_id));
    for (const tw of policy.time_window_configs) {
      if (!tw.demand_profile_id) {
        errors.push(`time_window ${tw.time_window} 缺少 demand_profile_id`);
      } else if (!profileIds.has(tw.demand_profile_id)) {
        errors.push(`time_window ${tw.time_window} 引用的 demand_profile_id "${tw.demand_profile_id}" 不存在`);
      }
    }
  }

  // 10-12. DemandProfile 校验
  if (!Array.isArray(policy.demand_profiles) || policy.demand_profiles.length === 0) {
    errors.push("demand_profiles 不能为空");
  } else {
    for (const dp of policy.demand_profiles) {
      if (!dp.demand_profile_id) {
        errors.push("DemandProfile 缺少 demand_profile_id");
      }
      if (!dp.distribution_type) {
        errors.push(`DemandProfile ${dp.demand_profile_id} 缺少 distribution_type`);
      }
      if (!dp.max_orders_per_tick && dp.max_orders_per_tick !== 0) {
        errors.push(`DemandProfile ${dp.demand_profile_id} 缺少 max_orders_per_tick`);
      }
    }
  }

  // 13. max_orders_per_tick_global 校验
  const dgConfig = policy.demand_generation_config || {};
  const globalMax = dgConfig.max_orders_per_tick_global;
  if (globalMax != null && Array.isArray(policy.demand_profiles)) {
    for (const dp of policy.demand_profiles) {
      if (dp.max_orders_per_tick > globalMax) {
        errors.push(`DemandProfile ${dp.demand_profile_id} 的 max_orders_per_tick (${dp.max_orders_per_tick}) 超过全局最大值 (${globalMax})`);
      }
    }
  }

  // 14. NIGHT 必须有需求配置
  if (Array.isArray(policy.time_window_configs)) {
    const hasNight = policy.time_window_configs.some((tw) => tw.time_period === "NIGHT");
    if (!hasNight) {
      errors.push("NIGHT 时间段缺少需求配置");
    }
  }

  // 15. EVENING 必须有需求配置
  if (Array.isArray(policy.time_window_configs)) {
    const hasEvening = policy.time_window_configs.some((tw) => tw.time_period === "EVENING");
    if (!hasEvening) {
      errors.push("EVENING 时间段缺少需求配置");
    }
  }

  // 16-19. 配置段必须存在
  if (!policy.supply_trigger_config) {
    errors.push("supply_trigger_config 不能为空");
  }
  if (!policy.service_order_auto_config) {
    errors.push("service_order_auto_config 不能为空");
  }
  if (!policy.execution_time_config) {
    errors.push("execution_time_config 不能为空");
  }
  if (!policy.default_completion_config) {
    errors.push("default_completion_config 不能为空");
  }

  // 20. enable_exception_probability 当前默认 false
  if (policy.enable_exception_probability !== false) {
    errors.push("当前阶段 enable_exception_probability 必须为 false");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 将 "HH:MM" 转为分钟数
 */
function timeToMinutes(time) {
  const [h, m] = (time || "0:0").split(":").map(Number);
  return h * 60 + m;
}
