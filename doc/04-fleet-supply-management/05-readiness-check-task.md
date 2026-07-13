# ReadinessCheckTask：运营准入任务

## 1. 对象定位

`ReadinessCheckTask` 是用于确认单台 Robotaxi 是否具备进入运营闭环资格的检查任务单。

```text
ReadinessCheckTask = 单台 Robotaxi 的运营准入判断单
```

准入任务发生在 Robotaxi 从供给形成阶段进入运营阶段之前。

当前默认业务含义：

- 新生产或新加入运营网络的 Robotaxi 必须先进入待准入；
- 准入通过后，Robotaxi 才能进入可运营状态；
- 准入失败后，Robotaxi 仍保持待准入，并记录失败原因；
- 维修、故障处理完成后默认直接恢复可运营，不自动追加一次准入；
- 如未来需要重大维修后复核，应由可配置准入复核规则触发。

## 2. 主状态口径

当前 Robotaxi 主运营状态使用：

|availability_status|中文|说明|
|---|---|---|
|PENDING_ADMISSION|待准入|已形成资产，但尚未通过运营准入|
|AVAILABLE|可运营|可以参与投放和服务订单匹配|
|IN_FLEET_OPERATION|运维中|被运维任务占用，不能参与运营服务|
|RETIRED|已退役|退出运营生命周期|

旧值 `PENDING_INSPECTION / IN_INSPECTION / UNAVAILABLE` 只能作为历史兼容值，不作为新文档主口径。

## 3. 服务化边界

准入任务不自行扫描所有车辆并直接修改 Robotaxi 状态。

```text
RobotaxiService 判断 Robotaxi 需要准入
  ↓
ReadinessCheckTaskService 创建准入任务
  ↓
ReadinessCheckTask 执行检查生命周期
  ↓
RobotaxiService 根据检查结果更新主运营状态
```

页面按钮、交付单触发、未来自动化触发都必须调用同一套服务。

## 4. 上游触发

|触发来源|说明|
|---|---|
|DELIVERY_ORDER_DELIVERED|交付单已交付后逐车触发，当前供给闭环主来源|
|MANUAL|运营人员人工触发|
|AUTO|未来系统按配置扫描待准入 Robotaxi|
|TASK_RESULT|未来可配置上游任务结果触发|

当前供给闭环中：

```text
RobotaxiDeliveryOrder.DELIVERED
  ↓
ReadinessCheckTask × N
```

## 5. 创建条件

创建准入任务必须满足：

```text
Robotaxi.availability_status = PENDING_ADMISSION
AND Robotaxi.current_task_id = null
AND 该 Robotaxi 当前不存在未完成的 ReadinessCheckTask
AND OpsCenter.can_inspect_robotaxi = true
```

未完成准入任务状态：

```text
WAITING_ASSIGNMENT
WAITING_CHECK
CHECKING
```

重复触发时不创建新任务，只记录事件：

```text
ROBOTAXI_ALREADY_HAS_PENDING_CHECK_TASK
```

## 6. 核心字段

|字段英文|中文|类型|说明|
|---|---|---|---|
|task_id|任务编号|系统字段|任务唯一编号|
|task_type|任务类型|系统字段|READINESS_CHECK|
|task_status|任务状态|状态字段|当前任务状态|
|task_priority|任务优先级|配置字段|默认 NORMAL|
|trigger_type|触发方式|系统字段|DELIVERY_ORDER_COMPLETED / MANUAL / AUTO / TASK_RESULT|
|trigger_object_type|触发对象类型|关联字段|例如 robotaxiDeliveryOrder|
|trigger_object_id|触发对象编号|关联字段|来源对象编号|
|robotaxi_id|Robotaxi 编号|关联字段|被检查车辆|
|worker_id|作业人员编号|关联字段|执行 Worker，可为空|
|ops_center_id|运营中心编号|关联字段|检查所在运营中心|
|check_result|检查结果|结果字段|PASSED / FAILED，可为空|
|issue_type|问题类型|结果字段|检查不通过原因，可为空|
|created_at|创建时间|系统字段|真实创建时间|
|assigned_at|分配时间|运行态字段|Worker 分配时间|
|started_at|开始时间|运行态字段|检查开始时间|
|completed_at|完成时间|运行态字段|任务完成时间|

## 7. 状态机

|task_status|中文|可用动作|下一状态|
|---|---|---|---|
|WAITING_ASSIGNMENT|待分配 Worker|分配 Worker|WAITING_CHECK|
|WAITING_CHECK|待检查|开始检查|CHECKING|
|CHECKING|检查中|检查通过 / 检查不通过|COMPLETED / FAILED|
|COMPLETED|已完成|查看详情|无|
|FAILED|异常失败|查看异常|无|
|CANCELLED|已取消|查看详情|无|

说明：

- `task_status` 表达准入任务自身当前状态；
- `check_result` 表达检查业务结果；
- 准入任务状态时间线只能记录准入任务自身状态。

## 8. 功能动作

### 8.1 创建准入任务

创建成功：

```text
task_status = WAITING_ASSIGNMENT
Robotaxi.current_task_id = task_id
Robotaxi.current_task_type = READINESS_CHECK
Robotaxi.current_task_status = WAITING_ASSIGNMENT
```

Robotaxi 仍保持：

```text
availability_status = PENDING_ADMISSION
available_for_dispatch = false
operation_blocking_reason = READINESS_REQUIRED
```

### 8.2 分配 Worker

条件：

```text
task_status = WAITING_ASSIGNMENT
AND worker_status = IDLE
AND Worker 属于同一 OpsCenter
```

成功后：

```text
task_status = WAITING_CHECK
worker_id = worker_id
Worker.worker_status = BUSY
Worker.current_task_id = task_id
```

### 8.3 开始检查

```text
WAITING_CHECK -> CHECKING
```

### 8.4 检查通过

```text
CHECKING -> COMPLETED
check_result = PASSED
```

调用 Robotaxi 服务：

```text
RobotaxiService.markAvailable(robotaxi)
```

更新：

```text
Robotaxi.availability_status = AVAILABLE
Robotaxi.available_for_dispatch = true
Robotaxi.operation_blocking_reason = null
Robotaxi.current_task_id = null
Worker.worker_status = IDLE
```

### 8.5 检查不通过

```text
CHECKING -> FAILED
check_result = FAILED
issue_type = 失败原因
```

Robotaxi 保持：

```text
availability_status = PENDING_ADMISSION
available_for_dispatch = false
operation_blocking_reason = issue_type
Robotaxi.current_task_id = null
Worker.worker_status = IDLE
```

准入失败不自动创建清洁、充电或维修任务。后续是否触发其他任务，应由任务规划策略或人工动作决定。

## 9. 事件与时间线

准入任务必须记录：

- 创建首态；
- Worker 分配；
- 开始检查；
- 检查通过；
- 检查失败；
- 取消；
- 异常失败。

事件必须归属准入任务自身，不得混入交付单或 Robotaxi 的状态。

## 10. 与交付单关系

交付单是批量单据，准入任务是一车一单。

```text
RobotaxiDeliveryOrder
  ↓ robotaxi_ids
ReadinessCheckTask × robotaxi_ids.length
```

准入任务可以记录 `trigger_object_type = robotaxiDeliveryOrder` 和 `trigger_object_id = delivery_order_id`，但不记录交付单状态。

## 11. 服务边界

1. 准入任务只能通过服务创建和推进。
2. 准入任务不负责生产、交付、清洁、充电、维修或退役。
3. 准入任务通过 Robotaxi 服务更新车辆主状态。
4. 准入任务完成后可以生成自身作业成本事实。
5. 准入任务不默认接入模拟运行主路径。

## 12. 模拟边界

当前只定义业务底层闭环。未来模拟运行如需触发准入任务，必须通过业务动作服务，且不得绕过准入任务状态机。
