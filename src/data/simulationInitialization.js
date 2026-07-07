/**
 * Simulation 初始化
 *
 * 初始化默认 SimulationPolicy，供 SimulationRun 创建时引用。
 * 参考文档：doc/09-simulation-system/01-simulation-runtime/initialization-simulation.md
 */

import {
  createDefaultSimulationPolicy,
  createTimePeriodConfig,
  createTimeWindow,
  createDemandProfile,
  TimePeriod,
  PeriodType,
  DistributionType,
} from "../domain/simulationTypes.js";

/**
 * 初始化默认 SimulationPolicy
 *
 * 返回一个完整的、通过校验的默认 SimulationPolicy，
 * 用户创建 SimulationRun 时可引用该配置。
 *
 * @returns {Object} SimulationPolicy 对象
 */
export function initializeDefaultSimulationPolicy() {
  const timePeriodConfigs = getDefaultTimePeriodConfigs();
  const timeWindowConfigs = getDefaultTimeWindowConfigs();
  const demandProfiles = getDefaultDemandProfiles();

  return createDefaultSimulationPolicy({
    time_period_configs: timePeriodConfigs,
    time_window_configs: timeWindowConfigs,
    demand_profiles: demandProfiles,
  });
}

/**
 * 默认时间段配置（覆盖 00:00 - 24:00）
 */
function getDefaultTimePeriodConfigs() {
  return [
    createTimePeriodConfig({ timePeriod: TimePeriod.NIGHT, startTime: "00:00", endTime: "06:00" }),
    createTimePeriodConfig({ timePeriod: TimePeriod.MORNING, startTime: "06:00", endTime: "12:00" }),
    createTimePeriodConfig({ timePeriod: TimePeriod.NOON, startTime: "12:00", endTime: "14:00" }),
    createTimePeriodConfig({ timePeriod: TimePeriod.AFTERNOON, startTime: "14:00", endTime: "18:00" }),
    createTimePeriodConfig({ timePeriod: TimePeriod.EVENING, startTime: "18:00", endTime: "24:00" }),
  ];
}

/**
 * 默认时间窗口配置（覆盖 00:00 - 24:00，无重叠无缺口）
 */
function getDefaultTimeWindowConfigs() {
  return [
    createTimeWindow({ timeWindow: "NIGHT_LOW", startTime: "00:00", endTime: "06:00", timePeriod: TimePeriod.NIGHT, periodType: PeriodType.LOW, demandProfileId: "DP-NIGHT-LOW" }),
    createTimeWindow({ timeWindow: "MORNING_NORMAL_1", startTime: "06:00", endTime: "08:00", timePeriod: TimePeriod.MORNING, periodType: PeriodType.NORMAL, demandProfileId: "DP-MORNING-NORMAL" }),
    createTimeWindow({ timeWindow: "MORNING_PEAK", startTime: "08:00", endTime: "10:00", timePeriod: TimePeriod.MORNING, periodType: PeriodType.PEAK, demandProfileId: "DP-MORNING-PEAK" }),
    createTimeWindow({ timeWindow: "MORNING_NORMAL_2", startTime: "10:00", endTime: "12:00", timePeriod: TimePeriod.MORNING, periodType: PeriodType.NORMAL, demandProfileId: "DP-MORNING-NORMAL" }),
    createTimeWindow({ timeWindow: "NOON_PEAK", startTime: "12:00", endTime: "13:00", timePeriod: TimePeriod.NOON, periodType: PeriodType.PEAK, demandProfileId: "DP-NOON-PEAK" }),
    createTimeWindow({ timeWindow: "NOON_NORMAL", startTime: "13:00", endTime: "14:00", timePeriod: TimePeriod.NOON, periodType: PeriodType.NORMAL, demandProfileId: "DP-NOON-NORMAL" }),
    createTimeWindow({ timeWindow: "AFTERNOON_NORMAL", startTime: "14:00", endTime: "17:00", timePeriod: TimePeriod.AFTERNOON, periodType: PeriodType.NORMAL, demandProfileId: "DP-AFTERNOON-NORMAL" }),
    createTimeWindow({ timeWindow: "AFTERNOON_PEAK", startTime: "17:00", endTime: "18:00", timePeriod: TimePeriod.AFTERNOON, periodType: PeriodType.PEAK, demandProfileId: "DP-AFTERNOON-PEAK" }),
    createTimeWindow({ timeWindow: "EVENING_PEAK", startTime: "18:00", endTime: "20:00", timePeriod: TimePeriod.EVENING, periodType: PeriodType.PEAK, demandProfileId: "DP-EVENING-PEAK" }),
    createTimeWindow({ timeWindow: "EVENING_NORMAL", startTime: "20:00", endTime: "24:00", timePeriod: TimePeriod.EVENING, periodType: PeriodType.NORMAL, demandProfileId: "DP-EVENING-NORMAL" }),
  ];
}

/**
 * 默认 DemandProfile（9 个需求配置）
 */
function getDefaultDemandProfiles() {
  return [
    createDemandProfile({ demandProfileId: "DP-NIGHT-LOW", profileName: "夜间低需求", distributionType: DistributionType.POISSON, lambda: 0.3, minOrdersPerTick: 0, maxOrdersPerTick: 2 }),
    createDemandProfile({ demandProfileId: "DP-MORNING-NORMAL", profileName: "上午平常期", distributionType: DistributionType.POISSON, lambda: 2, minOrdersPerTick: 0, maxOrdersPerTick: 6 }),
    createDemandProfile({ demandProfileId: "DP-MORNING-PEAK", profileName: "上午高峰期", distributionType: DistributionType.POISSON, lambda: 5, minOrdersPerTick: 0, maxOrdersPerTick: 10 }),
    createDemandProfile({ demandProfileId: "DP-NOON-PEAK", profileName: "中午高峰期", distributionType: DistributionType.POISSON, lambda: 4, minOrdersPerTick: 0, maxOrdersPerTick: 8 }),
    createDemandProfile({ demandProfileId: "DP-NOON-NORMAL", profileName: "中午平常期", distributionType: DistributionType.POISSON, lambda: 2, minOrdersPerTick: 0, maxOrdersPerTick: 5 }),
    createDemandProfile({ demandProfileId: "DP-AFTERNOON-NORMAL", profileName: "下午平常期", distributionType: DistributionType.POISSON, lambda: 2, minOrdersPerTick: 0, maxOrdersPerTick: 6 }),
    createDemandProfile({ demandProfileId: "DP-AFTERNOON-PEAK", profileName: "下午高峰期", distributionType: DistributionType.POISSON, lambda: 4, minOrdersPerTick: 0, maxOrdersPerTick: 8 }),
    createDemandProfile({ demandProfileId: "DP-EVENING-PEAK", profileName: "晚上高峰期", distributionType: DistributionType.POISSON, lambda: 5, minOrdersPerTick: 0, maxOrdersPerTick: 10 }),
    createDemandProfile({ demandProfileId: "DP-EVENING-NORMAL", profileName: "晚上平常期", distributionType: DistributionType.POISSON, lambda: 2, minOrdersPerTick: 0, maxOrdersPerTick: 6 }),
  ];
}
