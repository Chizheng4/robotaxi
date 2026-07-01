# Robotaxi Operational Health Model：Robotaxi 运营健康模型

## 1. 设计定位

本文件定义 Robotaxi 对象自身的运营健康能力。

它不是新的业务单据，也不是独立的标签对象，而是 Robotaxi 本体用于判断“是否可运营、是否需要运维、应该触发什么运维任务、是否需要等待当前服务完成”的底层服务化模型。

```text
Robotaxi 运营健康模型 = Robotaxi 本体健康事实 + 可运营判断 + 运维任务触发入口
```

具体清洁、充电、维修、故障处理和退役仍由各自任务单承接生命周期闭环。

## 2. 为什么不单独设计 ConditionTag 对象

Robotaxi 是否脏污、是否低电、是否故障、是否接近维护周期，本质都是 Robotaxi 的运营事实。

如果把这些事实拆成独立对象，会带来三个问题：

1. Robotaxi 可运营判断需要跨对象拼接，基础判断变重；
2. 订单匹配、投放、运维任务触发容易各自读取不同来源；
3. 后续增加新状态时，容易出现字段、标签、任务单三套逻辑不一致。

因此，第一阶段采用：

```text
Robotaxi 保存健康事实
RobotaxiService 提供统一判断
Fleet Task Service 执行具体任务闭环
```

只有当未来需要复杂的历史诊断、传感器日志、维修证据链时，才扩展独立的 HealthEvent / DiagnosticRecord。

## 3. 运营健康事实

### 3.1 基础状态层

这些状态与 `01-robotaxi-fleet-state-model.md` 保持一致。

|字段|含义|说明|
|---|---|---|
|availability_status|运营可用状态|判断是否可参与订单匹配和投放|
|motion_status|物理运动状态|停车、临停、行驶|
|fleet_operation_status|车队运维状态|是否处于清洁、充电、维修、故障等恢复链路|
|current_order_id|当前服务订单编号|判断是否正在服务履约|
|current_task_id|当前任务编号|判断是否正在执行投放、运维、行驶等任务|

### 3.2 健康事实层

以下是建议沉淀在 Robotaxi 本体或其扩展字段中的运营健康事实。

|字段|含义|建议值|
|---|---|---|
|cleanliness_status|清洁状态|CLEAN / NEEDS_CLEANING / IN_CLEANING|
|battery_operation_status|电量运营状态|ENOUGH / LOW / CRITICAL / CHARGING|
|maintenance_status|维护状态|NORMAL / DUE_SOON / DUE / IN_MAINTENANCE|
|failure_status|故障状态|NONE / ALERTED / REMOTE_HANDLING / BROKEN|
|retirement_status|退役状态|ACTIVE / RETIREMENT_CANDIDATE / RETIRED|
|operation_blocking_reason|不可运营原因|低电、脏污、故障、维修、准入待检查等|
|pending_fleet_task_type|待执行运维任务类型|CLEANING / CHARGING / MAINTENANCE / FAILURE_HANDLING / RETIREMENT|
|pending_fleet_task_id|待执行运维任务编号|关联具体任务单|
|last_health_check_at|最近健康检查时间|用于运营健康判断|

### 3.3 派生判断层

以下判断不建议全部持久化为字段，而应由 RobotaxiService 统一计算。

|判断|含义|
|---|---|
|canAcceptServiceOrder|是否可参与服务订单匹配|
|canAcceptDeploymentTask|是否可参与投放任务|
|canStartFleetOperationNow|是否可以立即执行运维任务|
|shouldWaitCurrentServiceCompletion|是否应等待当前服务完成|
|shouldInterruptCurrentWork|是否应中断当前任务或行程|
|nextFleetOperationTaskType|下一步应触发的运维任务类型|

## 4. RobotaxiService 统一服务接口

Robotaxi 本体不直接执行清洁、充电、维修等任务，但 RobotaxiService 必须成为这些判断的唯一入口。

建议服务接口：

```text
getOperationalHealth(robotaxi, context)
canAcceptServiceOrder(robotaxi, context)
canAcceptDeploymentTask(robotaxi, context)
canAcceptSupplyRebalance(robotaxi, context)

needsCleaning(robotaxi, context)
needsCharging(robotaxi, context)
needsMaintenance(robotaxi, context)
hasActiveFailure(robotaxi, context)
shouldRetire(robotaxi, context)

resolveFleetInterruptionPolicy(robotaxi, currentWork, trigger)
createFleetOperationTaskIfNeeded(robotaxi, trigger, context)

markUnavailableForFleetOperation(robotaxi, task, occurredAt)
markAvailableAfterFleetOperation(robotaxi, taskResult, occurredAt)
markPendingInspection(robotaxi, reason, occurredAt)
markRetired(robotaxi, reason, occurredAt)
```

其中：

|接口|职责|
|---|---|
|`canAcceptServiceOrder`|订单匹配唯一读取入口|
|`canAcceptDeploymentTask`|投放任务唯一读取入口|
|`createFleetOperationTaskIfNeeded`|运维任务创建入口，避免各模块重复创建|
|`resolveFleetInterruptionPolicy`|判断等待当前服务、立即中断、完成投放后执行等策略|
|`markAvailableAfterFleetOperation`|任务完成后恢复可运营状态|

## 5. 触发来源

### 5.1 Robotaxi 自身触发

|触发|说明|可能任务|
|---|---|---|
|电量低于阈值|服务后或待命时电量不足|ChargingTask|
|脏污评分低于阈值|车内/车外清洁问题|CleaningTask|
|维护周期到期|里程、时间或运行时长达到阈值|MaintenanceTask|
|故障报警|行驶中或待命时触发故障|FailureHandlingTask|
|不可修复或生命周期结束|维修结果或资产寿命达到阈值|RetirementTask|

### 5.2 业务单据结果触发

|来源|说明|可能任务|
|---|---|---|
|服务订单完成|乘客下车后可能需要清洁、补能|CleaningTask / ChargingTask|
|运营行驶完成|长距离投放后可能低电|ChargingTask|
|维修任务完成|维修完成后需要准入复核|ReadinessCheckTask|
|故障处理完成|根据诊断结果恢复、维修或退役|MaintenanceTask / RetirementTask|

### 5.3 运营规则触发

Robotaxi 健康变化可以基于真实运营事件、行驶距离、工作流时效和运营配置规则产生。

示例：

```text
行驶距离增加 → 电量消耗增加 → battery_operation_status 可能变为 LOW
服务订单完成 → 清洁规则判断 → cleanliness_status 可能变为 NEEDS_CLEANING
累计里程增加 → maintenance_status 可能变为 DUE
行驶中故障报警 → failure_status 变为 ALERTED
```

## 6. 当前任务优先级与中断策略

Robotaxi 可能正在服务订单、投放任务、运维任务或待命。运维触发后不能简单抢占，必须按业务影响决策。

|当前场景|低优先级清洁/维护|低电|故障|
|---|---|---|---|
|无当前任务|立即创建并执行任务|立即充电|立即故障处理|
|服务履约中|创建任务并等待服务完成|电量可完成则等待，电量临界则转异常策略|严重故障立即故障处理，非严重可等待|
|投放行驶中|可等待投放完成或改派 OpsCenter|电量临界可中断投放|中断投放并故障处理|
|待命中|立即执行|立即执行|立即执行|
|已有运维任务中|不重复创建，合并或升级任务|可升级优先级|升级为故障处理|

第一阶段建议默认规则：

1. 服务履约中，非严重问题等待当前服务完成；
2. 投放行驶中，低电和故障可以中断投放；
3. 已存在待执行运维任务时，不重复创建同类型任务；
4. 更高严重级别任务可以升级或替换低级任务；
5. 所有等待和中断决策都记录业务发生时间和原因。

## 7. 与任务单的关系

RobotaxiService 负责判断和触发，任务单服务负责执行闭环。

```text
RobotaxiService
  ↓ 判断 needsCleaning / needsCharging / needsMaintenance / hasActiveFailure
  ↓ createFleetOperationTaskIfNeeded
CleaningTaskService / ChargingTaskService / MaintenanceTaskService / FailureHandlingTaskService / RetirementTaskService
  ↓ 目的地分配
  ↓ 运维行驶记录
  ↓ Worker / 资源分配
  ↓ 作业执行
  ↓ 结果提交
RobotaxiService
  ↓ 更新 Robotaxi 可运营状态
```

任务单不得绕开 RobotaxiService 自行决定 Robotaxi 是否可重新运营。

## 8. 与订单匹配和投放的关系

订单匹配和投放不应该直接判断清洁、电量、维修、故障字段。

它们应该只调用：

```text
canAcceptServiceOrder(robotaxi, context)
canAcceptDeploymentTask(robotaxi, context)
```

这样未来新增新的 Robotaxi 健康条件时，只需要更新 RobotaxiService，不需要同时修改服务订单匹配、投放任务、成本计算和指标统计。

## 9. 上层系统接入原则

任何上层系统都不应该创造另一套健康判断逻辑。

上层系统只负责触发业务事件或传入时间上下文，具体判断和任务创建仍调用 RobotaxiService。

```text
业务事件发生
  ↓
Robotaxi 健康规则根据时间、距离、订单结果发生变化
  ↓
RobotaxiService 判断是否需要运维
  ↓
创建对应任务单
  ↓
任务单按自身生命周期自动执行
```

这保证了不同执行场景的一致性：人工操作、系统自动化和未来其他上层能力都调用同一个基础业务服务。

## 10. 第一阶段实现建议

第一阶段不需要一次性实现所有健康字段和高级诊断。

建议最小闭环：

|阶段|内容|
|---|---|
|MVP|补充 RobotaxiService 判断入口，订单匹配和投放只读取可运营判断|
|MVP|清洁、充电、维修、故障、退役任务单统一通过 RobotaxiService 触发|
|MVP|支持服务履约中等待、投放中可中断、待命立即执行|
|MVP|任务完成后统一更新 Robotaxi availability_status 和 fleet_operation_status|
|后续|增加健康事件日志、故障诊断记录、资产寿命模型、维修成本模型|

## 11. 方案结论

Robotaxi 的运营健康不是一个外部标签系统，而是 Robotaxi 对象本身的基础能力。

更合理的工程结构是：

```text
Robotaxi 对象沉淀事实
RobotaxiService 统一判断
Fleet Task Service 执行任务
Simulation Runtime 只触发统一服务
经营分析只消费沉淀后的业务事实
```

这样系统在未来增加更多运维任务、供给策略、指标体系和异常场景时，仍然可以沿用同一个底层结构，而不是不断修补不同模块里的重复判断。
