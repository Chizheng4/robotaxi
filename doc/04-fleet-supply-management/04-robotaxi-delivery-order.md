# RobotaxiDeliveryOrder：Robotaxi 交付单

## 1. 对象定位

`RobotaxiDeliveryOrder` 用于记录一批 Robotaxi 从生产体系物流交付到目标运营中心的过程。

它回答：

```text
哪些 Robotaxi 要交付？
从哪里交付到哪里？
运营中心何时接收？
接收后如何进入运营准入？
```

一张交付单可以包含多台 Robotaxi。它模拟真实物流场景中一批车辆一起运输到运营中心。

## 2. 上游与下游

```text
FleetAllocationResult.CONFIRMED
  ↓ 创建
RobotaxiDeliveryOrder
  ↓ 完成交付
Robotaxi 位置与所属运营中心更新
  ↓ 逐车触发
ReadinessCheckTask × N
```

## 3. 核心字段

|字段英文|中文|类型|说明|
|---|---|---|---|
|delivery_order_id|交付单编号|系统字段|唯一编号|
|delivery_order_name|交付单名称|配置字段|名称|
|delivery_status|交付状态|状态字段|交付单生命周期|
|allocation_result_id|分配结果编号|关联字段|来源分配结果|
|production_batch_ids|生产批次列表|关联字段|本次交付车辆来源批次|
|robotaxi_ids|交付车辆列表|系统字段|本次交付包含的 Robotaxi|
|delivery_quantity|交付数量|计算字段|`robotaxi_ids.length`|
|origin_location|起始位置|配置字段|生产地或物流起点|
|destination_location|目的位置|派生字段|目标运营中心位置|
|operation_center_id|运营中心编号|关联字段|目标运营中心|
|target_zone_id|目标区域|关联字段|车辆目标服务区域|
|planned_delivery_at|计划交付时间|配置字段|计划到达时间|
|actual_delivery_started_at|实际开始交付时间|运行态字段|开始运输时间|
|actual_received_at|实际接收时间|运行态字段|运营中心接收时间|
|completed_at|完成时间|运行态字段|交付完成时间|
|created_readiness_task_ids|创建准入任务列表|运行态字段|交付完成后逐车生成的准入任务|
|created_at|创建时间|系统字段|真实创建时间|
|updated_at|更新时间|系统字段|最近更新时间|

## 4. 状态机

|delivery_status|中文|可用动作|下一状态|
|---|---|---|---|
|CREATED|已创建|开始交付|DELIVERING|
|DELIVERING|交付中|运营中心接收|RECEIVED|
|RECEIVED|已接收|完成交付|COMPLETED|
|COMPLETED|已完成|触发准入 / 查看详情|READINESS_TRIGGERED|
|READINESS_TRIGGERED|已触发准入|查看详情|无|
|CANCELLED|已取消|查看详情|无|
|FAILED|异常失败|查看异常|无|

## 5. 功能动作

### 5.1 创建交付单

创建来源：

```text
FleetAllocationResult.result_status = CONFIRMED
```

规则：

1. 一个分配结果只能创建一张未取消交付单；
2. `robotaxi_ids` 来自 `FleetAllocationResult.allocated_robotaxi_ids`；
3. 创建后写入交付单首态时间线；
4. 不改变 Robotaxi 运营状态。

### 5.2 开始交付

从 `CREATED` 进入 `DELIVERING`。

可选更新 Robotaxi：

```text
delivery_status_on_vehicle = IN_DELIVERY
```

该字段如未来新增，必须进入字段字典；当前文档只表达业务意图。

### 5.3 运营中心接收

从 `DELIVERING` 进入 `RECEIVED`，表示车辆已经到达运营中心，但还没有完成后续系统确认。

### 5.4 完成交付

从 `RECEIVED` 进入 `COMPLETED`。

完成后调用 Robotaxi 服务：

```text
RobotaxiService.markDeliveredToOpsCenter(robotaxi_id, operation_center_id, target_zone_id)
```

更新每台 Robotaxi：

```text
operation_center_id = 目标运营中心
target_zone_id = 目标区域
availability_status = PENDING_ADMISSION
available_for_dispatch = false
operation_blocking_reason = READINESS_REQUIRED
current_cell_id = 运营中心接收位置
```

### 5.5 触发运营准入

交付单完成后，对 `robotaxi_ids` 中每台 Robotaxi 创建一张运营准入任务。

```text
RobotaxiDeliveryOrder.COMPLETED
  ↓
ReadinessCheckTaskService.createForRobotaxi(robotaxi_id)
  ↓
ReadinessCheckTask × robotaxi_ids.length
  ↓
RobotaxiDeliveryOrder.READINESS_TRIGGERED
```

## 6. 与运营准入任务关系

交付单是一批车辆单据；准入任务是一车一单。

```text
1 RobotaxiDeliveryOrder
  ↓
N Robotaxi
  ↓
N ReadinessCheckTask
```

交付单只记录它创建了哪些准入任务，不记录准入任务的状态变化。

## 7. 服务边界

1. 交付单只能由确认后的分配结果创建。
2. 交付单不负责生产 Robotaxi。
3. 交付单不负责车辆分配决策。
4. 交付单完成后只通过 Robotaxi 服务更新车辆位置和归属。
5. 交付单通过准入任务服务逐车创建准入任务。
6. 交付单状态时间线只记录交付单自己的状态。

## 8. 模拟边界

当前只定义业务闭环，不接入模拟运行主路径。未来如需模拟运输时长，必须通过交付单服务和工作流时效配置推进。
