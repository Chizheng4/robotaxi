# Robotaxi Fleet State Model：车队运维状态模型

## 1. 设计目标

本文件定义 Robotaxi 在 Fleet Operations 中的分层状态模型。

核心目标：

```text
不新增模糊 Robotaxi.status，也不让旧 fleet_operation_status / needs_* 标记成为主状态。
```

Robotaxi 状态表达应由运营状态、物理运动状态、当前任务、待执行队列和任务规划策略共同构成。清洁、充电、维修、故障、退役等闭环状态属于对应任务单自身，不应重复写成 Robotaxi 本体主状态。

## 2. 状态分层

### 2.1 availability_status：运营状态

表示 Robotaxi 是否具备参与运营、投放和订单匹配的资格。

|状态|含义|
|---|---|
|PENDING_INSPECTION|待运营准入检查|
|AVAILABLE|可运营|
|UNAVAILABLE|运维中或不可参与运营|
|RETIRED|已退役，不再进入运营|

### 2.2 motion_status：运动状态

表示车辆运动形态。

|状态|含义|
|---|---|
|PARKED|停车中|
|STOPPED|临停中|
|MOVING|行驶中|

### 2.3 current_task_id / current_order_id / pending_task_queue

当前任务、当前服务订单和待执行任务队列由引用表达：

|字段|职责|
|---|---|
|current_task_id|当前执行中的任务或行驶记录关联任务|
|current_task_type|当前任务类型|
|current_task_status|当前任务自己的状态|
|current_order_id|当前服务订单|
|pending_task_queue|已创建但尚未接管执行的排队任务，必须有队列序号|

任务类型和状态应从关联任务单推导，不应重复写成 Robotaxi 本体状态。

### 2.4 fleet_operation_status / needs_* 兼容说明

`fleet_operation_status`、`needs_cleaning`、`needs_charging`、`needs_maintenance` 等旧字段只作为历史数据兼容或摘要展示来源，不作为新任务创建、订单匹配或投放匹配的主判断来源。

## 3. 典型状态组合

|场景|availability_status|motion_status|current_order_id|current_task_id|pending_task_queue|
|---|---|---|---|---|---|
|可接单待命|AVAILABLE|PARKED / STOPPED|null|null|空|
|服务履约中|AVAILABLE|MOVING|服务订单编号|Trip 编号|可有排队运维任务|
|运维任务排队|保持当前运营状态|取决于当前任务|取决于当前任务|当前任务编号|按任务规划策略排序|
|运维任务接管|UNAVAILABLE|PARKED / STOPPED / MOVING|null|CleaningTask / ChargingTask / MaintenanceTask 等|剩余队列|
|前往运维站点|UNAVAILABLE|MOVING|null|关联 FleetOperationTask / RouteExecution|剩余队列|
|运维作业中|UNAVAILABLE|PARKED|null|对应运维任务|剩余队列|
|运维完成可运营|AVAILABLE|PARKED / STOPPED|null|null 或下一任务|按队列触发下一任务|
|已退役|RETIRED|PARKED|null|null|空|

## 4. 触发规则

Robotaxi 运维状态变化来源于：

|触发来源|例子|结果|
|---|---|---|
|车辆自身报警|脏污、低电、故障|创建清洁 / 充电 / 故障处理任务|
|服务履约完成|车内脏污、低电量|创建或激活运维任务|
|运营规则|行驶消耗、电量阈值、故障报警|触发运维状态|
|人工操作|人工标记需要维修、清洁、退役|创建对应任务|
|任务结果|清洁完成、维修失败、故障不可修复|更新状态|

具体的健康事实、可运营判断、任务触发入口由 `02-robotaxi-operational-health-model.md` 定义。

本文件只定义状态分层，不负责把清洁、电量、维修、故障和退役判断拆成独立对象。

## 5. 服务中触发运维的原则

如果 Robotaxi 正在服务订单中，且运维问题不影响当前履约：

```text
创建运维任务
任务进入 WAITING_ROBOTAXI_AVAILABLE 并写入 pending_task_queue
Robotaxi 继续当前服务或当前更高优先级任务
当前任务完成后，Robotaxi 按队列顺序触发下一任务
下一任务接管后 Robotaxi 变为 UNAVAILABLE / 运维中
```

如果故障严重到无法履约，后续异常履约体系应处理订单中止、乘客补偿和救援调度；本阶段先不实现。

## 6. 恢复到可运营状态

|任务完成结果|推荐恢复路径|
|---|---|
|清洁完成|直接 AVAILABLE|
|充电完成|直接 AVAILABLE|
|维修完成|当前阶段直接 AVAILABLE；未来可配置为进入 PENDING_INSPECTION|
|故障处理完成|当前阶段直接 AVAILABLE|
|故障不可修复|创建 / 排队 RetirementTask|
|退役完成|RETIRED|

## 7. 工程约束

1. 不新增模糊的 `Robotaxi.status`。
2. 订单匹配和投放匹配不得绕开 RobotaxiService 的可运营判断。
3. Robotaxi 可运营集合应由 `availability_status = AVAILABLE`、当前任务和任务规划策略共同判断。
4. 状态变化必须沉淀业务发生时间字段和状态时间线。
5. 成本、收入和指标只能消费任务单、行驶记录和 Robotaxi 状态事实。
