# ChargingTask：Robotaxi 充电任务单

## 1. 定义

ChargingTask 是用于将单台 Robotaxi 从低电量或计划补能状态恢复到可运营电量状态的运维任务单。

```text
ChargingTask = 单台 Robotaxi 补能恢复任务单
```

## 2. 服务化边界

ChargingTask 不直接判断 Robotaxi 是否需要充电。

充电需求应由 `RobotaxiService.needsCharging(...)` 或人工操作触发，再由 ChargingTaskService 创建任务：

```text
RobotaxiService 判断需要充电
  ↓
ChargingTaskService 创建 ChargingTask
  ↓
ChargingTask 执行等待、目的地分配、行驶、充电作业
  ↓
RobotaxiService 根据充电结果恢复或阻塞 Robotaxi
```

等待中的 ChargingTask 不占用 Robotaxi.current_task_id。只有任务正式开始执行、车辆不再服务订单时，才允许占用当前任务引用。

## 3. 触发来源

|触发来源|说明|
|---|---|
|低电量阈值|battery_percent 低于运营阈值|
|预计续航不足|estimated_range_km 无法覆盖后续任务|
|服务完成后补能|订单完成后电量低|
|计划补能|系统按运营计划安排充电|
|人工创建|运营人员手动创建|

如果 Robotaxi 正在服务且电量足以完成当前服务，ChargingTask 应等待当前服务完成。

## 4. 状态机

|task_status|含义|下一步动作|
|---|---|---|
|CREATED|任务已创建|判断车辆是否可执行|
|WAITING_ROBOTAXI_AVAILABLE|等待当前服务完成|等待车辆释放|
|WAITING_CHARGING_DESTINATION_ASSIGNMENT|等待分配充电 OpsCenter / 充电桩|分配目的地|
|WAITING_ROUTE|等待前往充电点路径|路径规划|
|MOVING_TO_CHARGER|前往充电点|行驶推进|
|ARRIVED_CHARGER|到达充电点|分配充电桩 / Worker|
|WAITING_CHARGER_ASSIGNMENT|等待充电桩|分配充电桩|
|READY_TO_CHARGE|已接入或等待开始充电|开始充电|
|CHARGING|充电中|充电推进|
|WAITING_RESULT_CONFIRMATION|等待充电结果确认|确认结果|
|COMPLETED|充电完成|无|
|CANCELLED|任务取消|无|
|FAILED|任务失败|人工处理|

## 5. 完整闭环

```text
RobotaxiService 判断低电 / 计划补能
  ↓
创建 ChargingTask
  ↓
如正在服务：等待服务完成
  ↓
分配可充电 OpsCenter 和充电桩
  ↓
RouteExecution 前往充电位置
  ↓
到达充电点
  ↓
接入充电桩
  ↓
按充电功率和目标电量推进时间
  ↓
充电完成
  ↓
Robotaxi 恢复 AVAILABLE 或进入 PENDING_INSPECTION
```

## 6. Robotaxi 状态变化

|阶段|availability_status|fleet_operation_status|
|---|---|---|
|触发但仍在服务|AVAILABLE|WAITING_SERVICE_COMPLETION|
|待充电|UNAVAILABLE|NEED_CHARGING|
|前往充电点|UNAVAILABLE|MOVING_TO_OPS_CENTER|
|充电中|UNAVAILABLE|IN_CHARGING|
|充电完成|AVAILABLE|NONE|

第一阶段建议：充电完成后直接恢复 `AVAILABLE`。

## 7. 关键规则

1. 充电任务必须绑定单台 Robotaxi。
2. 同一 Robotaxi 同一时间只能有一个未完成 ChargingTask。
3. OpsCenter 必须 `can_charge_robotaxi = true`。
4. 如引入充电桩，充电桩同一时间只能服务一台 Robotaxi。
5. 充电耗时应由目标电量、电池容量、充电功率或简化配置计算。
6. 充电完成必须更新 `battery_percent` 和 `estimated_range_km`。
7. 充电完成后必须通过 RobotaxiService 统一恢复 Robotaxi 可运营状态。

## 8. 关键字段建议

|字段|说明|
|---|---|
|task_id|充电任务编号|
|task_type|CHARGING|
|task_status|任务状态|
|robotaxi_id|车辆编号|
|trigger_type|AUTO / MANUAL / TASK_RESULT|
|battery_percent_before|充电前电量|
|target_battery_percent|目标电量|
|battery_percent_after|充电后电量|
|target_ops_center_id|目标运营中心|
|charger_id|充电桩编号，第一阶段可为空|
|route_execution_id|前往充电点的行驶记录|
|worker_id|协助 Worker，可为空|
|pending_since_at|开始等待车辆可执行时间|
|charging_started_at|充电开始时间|
|charging_completed_at|充电完成时间|

## 9. 成本与指标基础

ChargingTask 后续应支撑：

- 充电次数；
- 总充电电量；
- 电费成本；
- 平均充电等待时间；
- 充电占用时长；
- 低电导致的不可运营时长。
