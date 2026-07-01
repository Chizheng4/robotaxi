# Robotaxi Fleet State Model：车队运维状态模型

## 1. 设计目标

本文件定义 Robotaxi 在 Fleet Operations 中的分层状态模型。

核心目标：

```text
不新增单一 Robotaxi.status，而是在现有 Robotaxi 状态体系上补充运维状态层。
```

这样可以避免把“是否可运营”“是否在移动”“是否正在服务”“是否需要清洁/充电/维修”混在一个字段里。

## 2. 状态分层

### 2.1 availability_status：运营可用状态

表示 Robotaxi 是否具备参与运营、投放和订单匹配的资格。

|状态|含义|
|---|---|
|PENDING_INSPECTION|待运营准入检查|
|AVAILABLE|可参与运营|
|UNAVAILABLE|不可参与运营|
|RETIRED|已退役，不再进入运营|

### 2.2 motion_status：物理运动状态

表示车辆物理运动形态。

|状态|含义|
|---|---|
|PARKED|停车中|
|STOPPED|临停中|
|MOVING|行驶中|

### 2.3 fleet_operation_status：运维状态

表示 Robotaxi 在车队运维闭环中的健康和恢复状态。

|状态|含义|是否可运营|
|---|---|---|
|NONE|无运维阻塞|取决于 availability_status|
|NEED_CLEANING|需要清洁|否|
|NEED_CHARGING|需要充电|否|
|NEED_MAINTENANCE|需要维修|否|
|WAITING_SERVICE_COMPLETION|已触发运维任务，等待当前服务完成|当前服务中不可再分配新任务|
|MOVING_TO_OPS_CENTER|前往运维中心|否|
|IN_CLEANING|清洁中|否|
|IN_CHARGING|充电中|否|
|IN_MAINTENANCE|维修中|否|
|BROKEN|故障不可运行|否|
|READY_FOR_INSPECTION|运维完成，等待准入复核|否|
|RETIRED|退役|否|

### 2.4 current_task_id / current_order_id

当前任务和当前服务订单继续由引用表达：

|字段|职责|
|---|---|
|current_task_id|当前执行中的任务或行驶记录关联任务|
|current_order_id|当前服务订单|

任务类型和状态应从关联任务单推导，不应重复写成 Robotaxi 本体状态。

## 3. 典型状态组合

|场景|availability_status|fleet_operation_status|motion_status|current_order_id|current_task_id|
|---|---|---|---|---|---|
|可接单待命|AVAILABLE|NONE|PARKED / STOPPED|null|null|
|服务履约中|AVAILABLE|NONE|MOVING|服务订单编号|Trip 编号|
|服务中发现需要清洁|AVAILABLE|WAITING_SERVICE_COMPLETION|MOVING|服务订单编号|Trip 编号|
|服务完成后待清洁|UNAVAILABLE|NEED_CLEANING|STOPPED|null|CleaningTask 编号|
|前往清洁中心|UNAVAILABLE|MOVING_TO_OPS_CENTER|MOVING|null|CleaningTask / RouteExecution|
|清洁中|UNAVAILABLE|IN_CLEANING|PARKED|null|CleaningTask 编号|
|清洁完成可运营|AVAILABLE|NONE|PARKED|null|null|
|维修后待准入|PENDING_INSPECTION|READY_FOR_INSPECTION|PARKED|null|ReadinessCheckTask 编号或空|
|报废|RETIRED|RETIRED|PARKED|null|null|

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
任务进入 WAITING_ROBOTAXI_AVAILABLE
Robotaxi 继续当前服务
当前服务完成后 Robotaxi 变为 UNAVAILABLE
任务继续目的地分配和执行
```

如果故障严重到无法履约，后续异常履约体系应处理订单中止、乘客补偿和救援调度；本阶段先不实现。

## 6. 恢复到可运营状态

|任务完成结果|推荐恢复路径|
|---|---|
|清洁完成|直接 AVAILABLE；可配置为进入 PENDING_INSPECTION|
|充电完成|直接 AVAILABLE；可配置为进入 PENDING_INSPECTION|
|维修完成|进入 PENDING_INSPECTION，必须准入检查|
|故障误报|直接恢复原状态或 AVAILABLE|
|故障不可修复|进入 RETIRED|
|退役完成|RETIRED|

## 7. 工程约束

1. 不新增模糊的 `Robotaxi.status`。
2. 运维任务不得绕开 `availability_status` 判断直接参与订单匹配。
3. Robotaxi 可运营集合应由 `availability_status = AVAILABLE` 且无阻塞任务推导。
4. 状态变化必须沉淀业务发生时间字段和状态时间线。
5. 成本、收入和指标只能消费任务单、行驶记录和 Robotaxi 状态事实。
